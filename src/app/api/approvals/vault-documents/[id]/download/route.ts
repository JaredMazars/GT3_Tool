import { NextRequest, NextResponse } from 'next/server';
import { secureRoute } from '@/lib/api/secureRoute';
import { Feature } from '@/lib/permissions/features';
import { prisma } from '@/lib/db/prisma';
import { successResponse } from '@/lib/utils/apiUtils';
import { generateVaultDocumentSasUrl } from '@/lib/services/documents/blobStorage';
import { logger } from '@/lib/utils/logger';
import { AppError, ErrorCodes } from '@/lib/utils/errorHandler';

/**
 * GET /api/approvals/vault-documents/[id]/download
 * Generate secure download URL for document pending approval
 * Only accessible by users assigned as approvers for this document
 */
export const GET = secureRoute.queryWithParams<{ id: string }>({
  feature: Feature.ACCESS_DOCUMENT_VAULT,
  handler: async (request, { user, params }) => {
    const documentId = parseInt(params.id);

    if (isNaN(documentId)) {
      throw new AppError(400, 'Invalid document ID', ErrorCodes.VALIDATION_ERROR);
    }

    // Fetch document with approval information
    const document = await prisma.vaultDocument.findUnique({
      where: { id: documentId },
      select: {
        id: true,
        title: true,
        fileName: true,
        filePath: true,
        mimeType: true,
        status: true,
        version: true,
        approvalId: true,
        Approval: {
          select: {
            id: true,
            status: true,
            workflowType: true,
            ApprovalStep: {
              select: {
                id: true,
                assignedToUserId: true,
                status: true,
              },
            },
          },
        },
      },
    });

    if (!document) {
      throw new AppError(404, 'Document not found', ErrorCodes.NOT_FOUND);
    }

    // Verify document is pending approval
    if (document.status !== 'PENDING_APPROVAL') {
      throw new AppError(
        403,
        'Document is not pending approval',
        ErrorCodes.FORBIDDEN
      );
    }

    // Verify document has an approval
    if (!document.approvalId || !document.Approval) {
      throw new AppError(
        404,
        'Approval not found for this document',
        ErrorCodes.NOT_FOUND
      );
    }

    // Verify user is assigned as an approver for this document
    const isApprover = document.Approval.ApprovalStep.some(
      (step) => step.assignedToUserId === user.id
    );

    if (!isApprover) {
      throw new AppError(
        403,
        'You are not authorized to view this document',
        ErrorCodes.FORBIDDEN
      );
    }

    // Generate SAS URL (valid for 1 hour)
    try {
      const sasUrl = await generateVaultDocumentSasUrl(document.filePath, 60);

      // Log download for audit
      logger.info('Document viewed by approver', {
        documentId,
        approvalId: document.approvalId,
        userId: user.id,
        fileName: document.fileName,
      });

      return NextResponse.json(
        successResponse({
          downloadUrl: sasUrl,
          fileName: document.fileName,
          mimeType: document.mimeType,
          expiresIn: 3600, // seconds
        }),
        {
          headers: {
            'Cache-Control': 'no-store',
          },
        }
      );
    } catch (error) {
      logger.error('Failed to generate download URL for approval', {
        error,
        documentId,
        userId: user.id,
      });
      throw new AppError(
        500,
        'Failed to generate download URL',
        ErrorCodes.INTERNAL_ERROR
      );
    }
  },
});
