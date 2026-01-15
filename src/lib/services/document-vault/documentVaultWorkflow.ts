/**
 * Document Vault Workflow Handlers
 * Handles approval completion for vault documents
 */

import { prisma } from '@/lib/db/prisma';
import { logger } from '@/lib/utils/logger';
import { invalidateDocumentVaultCache } from './documentVaultCache';
import { AppError, ErrorCodes } from '@/lib/utils/errorHandler';

/**
 * Handle approval completion for a vault document
 * Called when the approval workflow is completed
 */
export async function handleVaultDocumentApprovalComplete(
  documentId: number,
  approvalStatus: 'APPROVED' | 'REJECTED',
  completedById: string,
  comment?: string
): Promise<void> {
  try {
    // Fetch document
    const document = await prisma.vaultDocument.findUnique({
      where: { id: documentId },
      select: {
        id: true,
        title: true,
        serviceLine: true,
        status: true,
      },
    });

    if (!document) {
      throw new AppError(404, 'Document not found', ErrorCodes.NOT_FOUND);
    }

    if (approvalStatus === 'APPROVED') {
      // Publish the document
      await prisma.vaultDocument.update({
        where: { id: documentId },
        data: {
          status: 'PUBLISHED',
          publishedAt: new Date(),
        },
      });

      logger.info('Document published after approval', {
        documentId,
        title: document.title,
        completedById,
      });
    } else {
      // Rejection - set back to DRAFT
      await prisma.vaultDocument.update({
        where: { id: documentId },
        data: {
          status: 'DRAFT',
        },
      });

      logger.info('Document rejected, set to DRAFT', {
        documentId,
        title: document.title,
        completedById,
        comment,
      });
    }

    // Invalidate cache
    await invalidateDocumentVaultCache(documentId, document.serviceLine || undefined);
  } catch (error) {
    logger.error('Error handling vault document approval completion', {
      documentId,
      approvalStatus,
      error,
    });
    throw error;
  }
}

/**
 * Check and sync document status with approval status
 * Utility function to ensure document status matches its approval
 */
export async function syncDocumentWithApproval(documentId: number): Promise<void> {
  try {
    const document = await prisma.vaultDocument.findUnique({
      where: { id: documentId },
      select: {
        id: true,
        status: true,
        serviceLine: true,
        approvalId: true,
        Approval: {
          select: {
            id: true,
            status: true,
            completedAt: true,
          },
        },
      },
    });

    if (!document || !document.Approval) {
      return; // No approval linked
    }

    const approvalStatus = document.Approval.status;
    let newStatus: string | null = null;

    // Sync document status with approval status
    if (approvalStatus === 'APPROVED' && document.status !== 'PUBLISHED') {
      newStatus = 'PUBLISHED';
    } else if (approvalStatus === 'REJECTED' && document.status !== 'DRAFT') {
      newStatus = 'DRAFT';
    } else if (approvalStatus === 'PENDING' && document.status !== 'PENDING_APPROVAL') {
      newStatus = 'PENDING_APPROVAL';
    }

    if (newStatus) {
      await prisma.vaultDocument.update({
        where: { id: documentId },
        data: {
          status: newStatus,
          publishedAt: newStatus === 'PUBLISHED' ? new Date() : undefined,
        },
      });

      await invalidateDocumentVaultCache(documentId, document.serviceLine || undefined);

      logger.info('Document status synced with approval', {
        documentId,
        newStatus,
        approvalStatus,
      });
    }
  } catch (error) {
    logger.error('Error syncing document with approval', { documentId, error });
    throw error;
  }
}
