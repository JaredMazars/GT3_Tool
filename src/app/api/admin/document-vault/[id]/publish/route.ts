import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { secureRoute } from '@/lib/api/secureRoute';
import { Feature } from '@/lib/permissions/features';
import { prisma } from '@/lib/db/prisma';
import { successResponse } from '@/lib/utils/apiUtils';
import { canManageVaultDocuments } from '@/lib/services/document-vault/documentVaultAuthorization';
import { handleVaultDocumentApprovalComplete } from '@/lib/services/document-vault/documentVaultWorkflow';
import { AppError, ErrorCodes } from '@/lib/utils/errorHandler';

/**
 * POST /api/admin/document-vault/[id]/publish
 * Manually publish a document (after approval is complete)
 * This endpoint is called by the approval system webhook or can be triggered manually
 */
export const POST = secureRoute.mutationWithParams<z.ZodVoid, { id: string }>({
  feature: Feature.MANAGE_VAULT_DOCUMENTS,
  handler: async (request, { user, params }) => {
    const documentId = parseInt(params.id);

    if (isNaN(documentId)) {
      return NextResponse.json(
        { error: 'Invalid document ID' },
        { status: 400 }
      );
    }

    // Fetch document with approval
    const document = await prisma.vaultDocument.findUnique({
      where: { id: documentId },
      select: {
        id: true,
        title: true,
        serviceLine: true,
        status: true,
        approvalId: true,
        Approval: {
          select: {
            id: true,
            status: true,
          },
        },
      },
    });

    if (!document) {
      throw new AppError(404, 'Document not found', ErrorCodes.NOT_FOUND);
    }

    // Check authorization
    const canManage = await canManageVaultDocuments(user.id, document.serviceLine || undefined);
    if (!canManage) {
      throw new AppError(403, 'Insufficient permissions', ErrorCodes.FORBIDDEN);
    }

    // Verify approval is complete
    if (!document.Approval || document.Approval.status !== 'APPROVED') {
      throw new AppError(
        400,
        'Document approval must be completed before publishing',
        ErrorCodes.VALIDATION_ERROR
      );
    }

    // Publish document
    await handleVaultDocumentApprovalComplete(documentId, 'APPROVED', user.id);

    return NextResponse.json(
      successResponse({ id: documentId, status: 'PUBLISHED' })
    );
  },
});
