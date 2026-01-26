import { NextRequest, NextResponse } from 'next/server';
import { secureRoute } from '@/lib/api/secureRoute';
import { Feature } from '@/lib/permissions/features';
import { UpdateVaultDocumentSchema } from '@/lib/validation/schemas';
import { prisma } from '@/lib/db/prisma';
import { successResponse } from '@/lib/utils/apiUtils';
import { canManageVaultDocuments } from '@/lib/services/document-vault/documentVaultAuthorization';
import { invalidateDocumentVaultCache } from '@/lib/services/document-vault/documentVaultCache';
import { uploadVaultDocument } from '@/lib/services/documents/blobStorage';
import { AppError, ErrorCodes } from '@/lib/utils/errorHandler';

/**
 * GET /api/admin/document-vault/[id]
 * Get document details for admin users (all statuses)
 */
export const GET = secureRoute.queryWithParams<{ id: string }>({
  feature: Feature.MANAGE_VAULT_DOCUMENTS,
  handler: async (request, { user, params }) => {
    const documentId = parseInt(params.id);

    if (isNaN(documentId)) {
      return NextResponse.json(
        { error: 'Invalid document ID' },
        { status: 400 }
      );
    }

    // Fetch document (no status filter - admins can see all)
    const document = await prisma.vaultDocument.findUnique({
      where: { id: documentId },
      select: {
        id: true,
        title: true,
        description: true,
        documentType: true,
        fileName: true,
        fileSize: true,
        mimeType: true,
        filePath: true,
        scope: true,
        serviceLine: true,
        version: true,
        status: true,
        aiExtractionStatus: true,
        aiSummary: true,
        aiKeyPoints: true,
        tags: true,
        effectiveDate: true,
        expiryDate: true,
        publishedAt: true,
        createdAt: true,
        updatedAt: true,
        documentVersion: true,
        VaultDocumentCategory: {
          select: {
            id: true,
            name: true,
            description: true,
            icon: true,
            color: true,
            documentType: true,
          },
        },
        User: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        VaultDocumentVersion: {
          select: {
            id: true,
            version: true,
            fileName: true,
            fileSize: true,
            uploadedBy: true,
            uploadedAt: true,
            supersededAt: true,
            changeNotes: true,
          },
          orderBy: { version: 'desc' },
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

    // Parse JSON fields
    const result = {
      ...document,
      aiKeyPoints: document.aiKeyPoints ? JSON.parse(document.aiKeyPoints) : null,
      tags: document.tags ? JSON.parse(document.tags) : null,
      uploader: document.User,
      versions: document.VaultDocumentVersion,
    };

    // Remove User field (we already have uploader)
    delete (result as any).User;
    delete (result as any).VaultDocumentVersion;

    return NextResponse.json(successResponse(result));
  },
});

/**
 * PATCH /api/admin/document-vault/[id]
 * Update document metadata and optionally replace file (DRAFT only)
 * Handles both JSON (metadata only) and multipart/form-data (with file)
 */
export const PATCH = secureRoute.fileUpload({
  feature: Feature.MANAGE_VAULT_DOCUMENTS,
  handler: async (request, { user }) => {
    // Extract document ID from URL path
    const pathParts = request.nextUrl.pathname.split('/');
    const idIndex = pathParts.indexOf('document-vault') + 1;
    const documentId = parseInt(pathParts[idIndex] || '0');

    if (isNaN(documentId)) {
      throw new AppError(400, 'Invalid document ID', ErrorCodes.VALIDATION_ERROR);
    }

    // Fetch document with category info and approval info
    const document = await prisma.vaultDocument.findUnique({
      where: { id: documentId },
      select: {
        id: true,
        serviceLine: true,
        status: true,
        scope: true,
        documentType: true,
        version: true,
        approvalId: true,
        VaultDocumentCategory: {
          select: { name: true },
        },
        Approval: {
          select: {
            ApprovalStep: {
              where: { assignedToUserId: user.id },
              select: { id: true },
            },
          },
        },
      },
    });

    if (!document) {
      throw new AppError(404, 'Document not found', ErrorCodes.NOT_FOUND);
    }

    // Check authorization - either must be able to manage vault documents OR be an approver
    const canManage = await canManageVaultDocuments(user.id, document.serviceLine || undefined);
    const isApprover = document.Approval && document.Approval.ApprovalStep.length > 0;
    
    if (!canManage && !isApprover) {
      throw new AppError(403, 'Insufficient permissions', ErrorCodes.FORBIDDEN);
    }

    // Allow editing DRAFT documents (for vault managers) or PENDING_APPROVAL documents (for approvers)
    if (document.status === 'DRAFT') {
      // DRAFT documents can be edited by vault managers
      if (!canManage) {
        throw new AppError(403, 'Insufficient permissions to edit draft documents', ErrorCodes.FORBIDDEN);
      }
    } else if (document.status === 'PENDING_APPROVAL') {
      // PENDING_APPROVAL documents can be edited by assigned approvers
      if (!isApprover) {
        throw new AppError(403, 'Only assigned approvers can edit documents pending approval', ErrorCodes.FORBIDDEN);
      }
    } else {
      // PUBLISHED or other statuses cannot be edited
      throw new AppError(
        400,
        'Only DRAFT or PENDING_APPROVAL documents can be edited. Published documents require a new version.',
        ErrorCodes.VALIDATION_ERROR
      );
    }

    // Parse form data
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const metadataStr = formData.get('metadata') as string;

    if (!metadataStr) {
      throw new AppError(400, 'Metadata is required', ErrorCodes.VALIDATION_ERROR);
    }

    // Parse and validate metadata
    let metadata: any;
    try {
      metadata = JSON.parse(metadataStr);
    } catch {
      throw new AppError(400, 'Invalid metadata JSON', ErrorCodes.VALIDATION_ERROR);
    }

    // Validate metadata with Zod schema
    const validationResult = UpdateVaultDocumentSchema.safeParse(metadata);
    if (!validationResult.success) {
      throw new AppError(
        400,
        validationResult.error.errors[0]?.message || 'Invalid document metadata',
        ErrorCodes.VALIDATION_ERROR
      );
    }

    const data = validationResult.data;

    // Build update data for metadata
    const updateData: any = {};

    if (data.title !== undefined) updateData.title = data.title;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.categoryId !== undefined) updateData.categoryId = data.categoryId;
    if (data.documentType !== undefined) updateData.documentType = data.documentType;
    if (data.documentVersion !== undefined) updateData.documentVersion = data.documentVersion;
    if (data.scope !== undefined) updateData.scope = data.scope;
    if (data.serviceLine !== undefined) updateData.serviceLine = data.serviceLine;
    if (data.tags !== undefined) updateData.tags = JSON.stringify(data.tags);
    
    // Handle dates - convert empty strings to null, valid dates to Date objects
    if (data.effectiveDate !== undefined) {
      if (data.effectiveDate && data.effectiveDate.trim()) {
        // Append time to make it a valid datetime if it's just a date
        const dateStr = data.effectiveDate.includes('T') ? data.effectiveDate : `${data.effectiveDate}T00:00:00.000Z`;
        updateData.effectiveDate = new Date(dateStr);
      } else {
        updateData.effectiveDate = null;
      }
    }
    if (data.expiryDate !== undefined) {
      if (data.expiryDate && data.expiryDate.trim()) {
        // Append time to make it a valid datetime if it's just a date
        const dateStr = data.expiryDate.includes('T') ? data.expiryDate : `${data.expiryDate}T00:00:00.000Z`;
        updateData.expiryDate = new Date(dateStr);
      } else {
        updateData.expiryDate = null;
      }
    }

    // Handle file replacement if provided
    if (file) {
      // Validate file type
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
        throw new AppError(400, 'Unsupported file type', ErrorCodes.VALIDATION_ERROR);
      }

      // Validate file size (max 50MB)
      const maxSize = 50 * 1024 * 1024;
      if (file.size > maxSize) {
        throw new AppError(400, 'File size exceeds 50MB limit', ErrorCodes.VALIDATION_ERROR);
      }

      // Convert file to buffer
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);

      // Upload to blob storage (direct replacement, no versioning for drafts)
      const blobPath = await uploadVaultDocument(
        buffer,
        file.name,
        documentId,
        document.version, // Keep same version for draft
        document.scope,
        document.documentType,
        document.VaultDocumentCategory.name
      );

      // Update file-related fields
      updateData.fileName = file.name;
      updateData.filePath = blobPath;
      updateData.fileSize = file.size;
      updateData.mimeType = file.type;
      // Reset AI extraction status when file changes
      updateData.aiExtractionStatus = 'PENDING';
      updateData.aiSummary = null;
      updateData.aiKeyPoints = null;
      updateData.aiExtractedText = null;
    }

    // Update document
    const updated = await prisma.vaultDocument.update({
      where: { id: documentId },
      data: updateData,
      select: {
        id: true,
        title: true,
        description: true,
        documentType: true,
        documentVersion: true,
        fileName: true,
        fileSize: true,
        mimeType: true,
        categoryId: true,
        scope: true,
        serviceLine: true,
        tags: true,
        effectiveDate: true,
        expiryDate: true,
        status: true,
        version: true,
        updatedAt: true,
      },
    });

    // Invalidate cache
    await invalidateDocumentVaultCache(documentId, document.serviceLine || undefined);

    return NextResponse.json(successResponse(updated));
  },
});
