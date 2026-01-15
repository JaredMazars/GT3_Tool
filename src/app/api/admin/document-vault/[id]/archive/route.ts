import { NextRequest, NextResponse } from 'next/server';
import { secureRoute } from '@/lib/api/secureRoute';
import { Feature } from '@/lib/permissions/features';
import { ArchiveVaultDocumentSchema } from '@/lib/validation/schemas';
import { prisma } from '@/lib/db/prisma';
import { successResponse } from '@/lib/utils/apiUtils';
import { canArchiveDocument } from '@/lib/services/document-vault/documentVaultAuthorization';
import { invalidateDocumentVaultCache } from '@/lib/services/document-vault/documentVaultCache';

/**
 * PATCH /api/admin/document-vault/[id]/archive
 * Archive a document (soft delete)
 */
export const PATCH = secureRoute.mutation({
  feature: Feature.MANAGE_VAULT_DOCUMENTS,
  schema: ArchiveVaultDocumentSchema,
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
        title: true,
        scope: true,
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

    // Check if already archived
    if (document.status === 'ARCHIVED') {
      return NextResponse.json(
        { error: 'Document is already archived' },
        { status: 400 }
      );
    }

    // Check authorization
    const canArchive = await canArchiveDocument(user.id, {
      scope: document.scope as any,
      serviceLine: document.serviceLine,
    });

    if (!canArchive) {
      return NextResponse.json(
        { error: 'Insufficient permissions to archive this document' },
        { status: 403 }
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
