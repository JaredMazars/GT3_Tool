import { NextRequest, NextResponse } from 'next/server';
import { secureRoute } from '@/lib/api/secureRoute';
import { Feature } from '@/lib/permissions/features';
import { prisma } from '@/lib/db/prisma';
import { successResponse } from '@/lib/utils/apiUtils';
import { canManageVaultDocuments } from '@/lib/services/document-vault/documentVaultAuthorization';
import { uploadVaultDocument } from '@/lib/services/documents/blobStorage';
import { extractVaultDocumentMetadata } from '@/lib/services/documents/vaultDocumentExtraction';
import { approvalService } from '@/lib/services/approvals/approvalService';
import { invalidateDocumentVaultCache } from '@/lib/services/document-vault/documentVaultCache';
import { logger } from '@/lib/utils/logger';

/**
 * POST /api/admin/document-vault/[id]/new-version
 * Upload new version of existing document
 */
export const POST = secureRoute.fileUpload({
  feature: Feature.MANAGE_VAULT_DOCUMENTS,
  handler: async (request, { user }) => {
    // Extract document ID from URL path
    const pathParts = request.nextUrl.pathname.split('/');
    const idIndex = pathParts.indexOf('document-vault') + 1;
    const documentId = parseInt(pathParts[idIndex] || '0');

    if (isNaN(documentId)) {
      return NextResponse.json(
        { error: 'Invalid document ID' },
        { status: 400 }
      );
    }

    // Parse form data
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const changeNotes = formData.get('changeNotes') as string;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Fetch current document
    const document = await prisma.vaultDocument.findUnique({
      where: { id: documentId },
      select: {
        id: true,
        title: true,
        documentType: true,
        scope: true,
        serviceLine: true,
        status: true,
        version: true,
        categoryId: true,
        VaultDocumentCategory: {
          select: { name: true },
        },
      },
    });

    if (!document) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      );
    }

    // Check authorization
    const canManage = await canManageVaultDocuments(user.id, document.serviceLine || undefined);
    if (!canManage) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    // Validate file type (should match original document type category)
    const allowedTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'application/vnd.ms-powerpoint',
      'image/png',
      'image/jpeg',
      'image/svg+xml',
      'text/plain',
      'text/markdown',
    ];

    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Unsupported file type' },
        { status: 400 }
      );
    }

    // Validate file size (max 50MB)
    const maxSize = 50 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'File size exceeds 50MB limit' },
        { status: 400 }
      );
    }

    // Convert file to buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const newVersion = document.version + 1;

    // Upload new version to blob storage
    const blobPath = await uploadVaultDocument(
      buffer,
      file.name,
      documentId,
      newVersion,
      document.scope,
      document.documentType,
      document.VaultDocumentCategory.name
    );

    // Mark current version as superseded
    await prisma.vaultDocumentVersion.updateMany({
      where: {
        documentId,
        version: document.version,
      },
      data: {
        supersededAt: new Date(),
      },
    });

    // Create new version record
    await prisma.vaultDocumentVersion.create({
      data: {
        documentId,
        version: newVersion,
        fileName: file.name,
        filePath: blobPath,
        fileSize: file.size,
        uploadedBy: user.id,
        changeNotes: changeNotes || null,
      },
    });

    // Update main document
    await prisma.vaultDocument.update({
      where: { id: documentId },
      data: {
        version: newVersion,
        fileName: file.name,
        filePath: blobPath,
        fileSize: file.size,
        mimeType: file.type,
        status: 'PENDING_APPROVAL', // New version needs approval
        aiExtractionStatus: 'PENDING',
        updatedAt: new Date(),
      },
    });

    // Start AI extraction in background
    extractVaultDocumentMetadata(
      buffer,
      documentId,
      document.title,
      document.documentType,
      document.VaultDocumentCategory.name
    ).then(async (extracted) => {
      await prisma.vaultDocument.update({
        where: { id: documentId },
        data: {
          aiExtractionStatus: 'SUCCESS',
          aiSummary: extracted.summary,
          aiKeyPoints: JSON.stringify(extracted.keyPoints),
          aiExtractedText: extracted.extractedText,
        },
      });
      logger.info('AI extraction completed for new version', { documentId, version: newVersion });
    }).catch(async (error) => {
      await prisma.vaultDocument.update({
        where: { id: documentId },
        data: { aiExtractionStatus: 'FAILED' },
      });
      logger.error('AI extraction failed for new version', { documentId, error });
    });

    // Create new approval request
    const approval = await approvalService.createApproval({
      workflowType: 'VAULT_DOCUMENT',
      workflowId: documentId,
      title: `${document.documentType}: ${document.title} (v${newVersion})`,
      requestedById: user.id,
      context: {
        documentId,
        title: document.title,
        documentType: document.documentType,
        version: newVersion,
        changeNotes: changeNotes || 'New version',
      },
    });

    // Link new approval
    await prisma.vaultDocument.update({
      where: { id: documentId },
      data: { approvalId: approval.id },
    });

    // Invalidate cache
    await invalidateDocumentVaultCache(documentId, document.serviceLine || undefined);

    return NextResponse.json(
      successResponse({
        id: documentId,
        version: newVersion,
        approvalId: approval.id,
        status: 'PENDING_APPROVAL',
      })
    );
  },
});
