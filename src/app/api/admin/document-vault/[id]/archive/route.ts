import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { secureRoute } from '@/lib/api/secureRoute';
import { Feature } from '@/lib/permissions/features';
import { prisma } from '@/lib/db/prisma';
import { successResponse } from '@/lib/utils/apiUtils';
import { AppError, ErrorCodes } from '@/lib/utils/errorHandler';
import { invalidateDocumentVaultCache } from '@/lib/services/document-vault/documentVaultCache';

/**
 * PATCH /api/admin/document-vault/[id]/archive
 * Archive a document (soft delete)
 */
export const PATCH = secureRoute.mutationWithParams<z.ZodVoid, { id: string }>({
  feature: Feature.MANAGE_VAULT_DOCUMENTS,
  handler: async (request, { user, params }) => {
    const documentId = parseInt(params.id);

    if (isNaN(documentId)) {
      throw new AppError(
        400,
        'Invalid document ID',
        ErrorCodes.VALIDATION_ERROR
      );
    }

    // Fetch document
    const document = await prisma.vaultDocument.findUnique({
      where: { id: documentId },
      select: {
        id: true,
        title: true,
        scope: true,
        serviceLine: true,
        status: true,
      },
    });

    if (!document) {
      throw new AppError(
        404,
        'Document not found',
        ErrorCodes.NOT_FOUND
      );
    }

    // Check if already archived
    if (document.status === 'ARCHIVED') {
      throw new AppError(
        400,
        'Document is already archived',
        ErrorCodes.VALIDATION_ERROR
      );
    }

    // Archive document
    const archived = await prisma.vaultDocument.update({
      where: { id: documentId },
      data: {
        status: 'ARCHIVED',
        archivedAt: new Date(),
        archivedBy: user.id,
      },
      select: {
        id: true,
        title: true,
        status: true,
        archivedAt: true,
      },
    });

    // Invalidate cache
    await invalidateDocumentVaultCache(documentId, document.serviceLine || undefined);

    return NextResponse.json(successResponse(archived));
  },
});
