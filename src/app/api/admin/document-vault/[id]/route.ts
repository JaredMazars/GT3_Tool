import { NextRequest, NextResponse } from 'next/server';
import { secureRoute } from '@/lib/api/secureRoute';
import { Feature } from '@/lib/permissions/features';
import { UpdateVaultDocumentSchema } from '@/lib/validation/schemas';
import { prisma } from '@/lib/db/prisma';
import { successResponse } from '@/lib/utils/apiUtils';
import { canManageVaultDocuments } from '@/lib/services/document-vault/documentVaultAuthorization';
import { invalidateDocumentVaultCache } from '@/lib/services/document-vault/documentVaultCache';

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
 * Update document metadata
 */
export const PATCH = secureRoute.mutationWithParams<typeof UpdateVaultDocumentSchema, { id: string }>({
  feature: Feature.MANAGE_VAULT_DOCUMENTS,
  schema: UpdateVaultDocumentSchema,
  handler: async (request, { user, params, data }) => {
    const documentId = parseInt(params.id);

    if (isNaN(documentId)) {
      return NextResponse.json(
        { error: 'Invalid document ID' },
        { status: 400 }
      );
    }

    // Fetch document
    const document = await prisma.vaultDocument.findUnique({
      where: { id: documentId },
      select: {
        id: true,
        serviceLine: true,
        status: true,
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

    // Build update data
    const updateData: any = {};

    if (data.title !== undefined) updateData.title = data.title;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.categoryId !== undefined) updateData.categoryId = data.categoryId;
    if (data.documentType !== undefined) updateData.documentType = data.documentType;
    if (data.tags !== undefined) updateData.tags = JSON.stringify(data.tags);
    if (data.effectiveDate !== undefined) {
      updateData.effectiveDate = data.effectiveDate ? new Date(data.effectiveDate) : null;
    }
    if (data.expiryDate !== undefined) {
      updateData.expiryDate = data.expiryDate ? new Date(data.expiryDate) : null;
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
        tags: true,
        effectiveDate: true,
        expiryDate: true,
        updatedAt: true,
      },
    });

    // Invalidate cache
    await invalidateDocumentVaultCache(documentId, document.serviceLine || undefined);

    return NextResponse.json(successResponse(updated));
  },
});
