import { NextRequest, NextResponse } from 'next/server';
import { secureRoute } from '@/lib/api/secureRoute';
import { Feature } from '@/lib/permissions/features';
import { prisma } from '@/lib/db/prisma';
import { successResponse } from '@/lib/utils/apiUtils';
import { canManageVaultDocuments } from '@/lib/services/document-vault/documentVaultAuthorization';
import { invalidateDocumentVaultCache } from '@/lib/services/document-vault/documentVaultCache';
import { AppError, ErrorCodes } from '@/lib/utils/errorHandler';
import { logger } from '@/lib/utils/logger';

/**
 * POST /api/admin/document-vault/[id]/submit
 * Submit a DRAFT document for approval
 */
export const POST = secureRoute.mutationWithParams<never, { id: string }>({
  feature: Feature.MANAGE_VAULT_DOCUMENTS,
  handler: async (request, { user, params }) => {
    const documentId = parseInt(params.id);

    if (isNaN(documentId)) {
      throw new AppError(400, 'Invalid document ID', ErrorCodes.VALIDATION_ERROR);
    }

    // Fetch document with category info
    const document = await prisma.vaultDocument.findUnique({
      where: { id: documentId },
      select: {
        id: true,
        title: true,
        documentType: true,
        serviceLine: true,
        status: true,
        version: true,
        categoryId: true,
        fileName: true,
        VaultDocumentCategory: {
          select: {
            id: true,
            name: true,
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

    // Only allow submitting DRAFT documents
    if (document.status !== 'DRAFT') {
      throw new AppError(
        400,
        'Only DRAFT documents can be submitted for approval',
        ErrorCodes.VALIDATION_ERROR
      );
    }

    // Validate required fields are present
    if (!document.title || !document.categoryId || !document.fileName) {
      throw new AppError(
        400,
        'Document must have title, category, and file before submission',
        ErrorCodes.VALIDATION_ERROR
      );
    }

    // Get category approvers for approval workflow
    const categoryApprovers = await prisma.categoryApprover.findMany({
      where: { categoryId: document.categoryId },
      select: {
        userId: true,
        stepOrder: true,
      },
      orderBy: { stepOrder: 'asc' },
    });

    // Validate approvers exist
    if (categoryApprovers.length === 0) {
      throw new AppError(
        400,
        `Category "${document.VaultDocumentCategory.name}" has no approvers assigned. Please contact an administrator to assign approvers to this category.`,
        ErrorCodes.VALIDATION_ERROR
      );
    }

    // Create approval with sequential steps from category approvers
    const approval = await prisma.$transaction(async (tx) => {
      // Create the approval
      const newApproval = await tx.approval.create({
        data: {
          workflowType: 'VAULT_DOCUMENT',
          workflowId: documentId,
          status: 'PENDING',
          priority: 'MEDIUM',
          title: `Document Approval: ${document.title}`,
          description: `Review and approve document: ${document.title} (${document.documentType})`,
          requestedById: user.id,
          requiresAllSteps: true, // Sequential approval - all must approve in order
          updatedAt: new Date(),
        },
      });

      // Create approval steps from category approvers
      const steps = await Promise.all(
        categoryApprovers.map((approver) =>
          tx.approvalStep.create({
            data: {
              approvalId: newApproval.id,
              stepOrder: approver.stepOrder,
              stepType: 'USER_APPROVAL',
              isRequired: true,
              assignedToUserId: approver.userId,
              status: 'PENDING',
              updatedAt: new Date(),
            },
          })
        )
      );

      // Set first step as current
      if (steps.length > 0) {
        await tx.approval.update({
          where: { id: newApproval.id },
          data: { currentStepId: steps[0]!.id },
        });
      }

      return newApproval;
    });

    // Update document status and link approval
    await prisma.vaultDocument.update({
      where: { id: documentId },
      data: {
        status: 'PENDING_APPROVAL',
        approvalId: approval.id,
      },
    });

    // Invalidate cache
    await invalidateDocumentVaultCache(documentId, document.serviceLine || undefined);

    logger.info('Document submitted for approval', {
      userId: user.id,
      documentId,
      approvalId: approval.id,
    });

    return NextResponse.json(
      successResponse({
        id: documentId,
        status: 'PENDING_APPROVAL',
        approvalId: approval.id,
        message: 'Document submitted for approval successfully',
      })
    );
  },
});
