import { NextResponse } from 'next/server';
import { secureRoute } from '@/lib/api/secureRoute';
import { successResponse } from '@/lib/utils/apiUtils';
import { approvalService } from '@/lib/services/approvals/approvalService';
import { handleVaultDocumentApprovalComplete } from '@/lib/services/document-vault/documentVaultWorkflow';
import { AppError, ErrorCodes } from '@/lib/utils/errorHandler';
import { z } from 'zod';
import { invalidateApprovalsCache } from '@/lib/services/cache/cacheInvalidation';
import { logger } from '@/lib/utils/logger';

const ApproveStepSchema = z.object({
  comment: z.string().optional(),
}).strict();

/**
 * POST /api/approvals/[id]/steps/[stepId]/approve
 * Approve a specific approval step
 */
export const POST = secureRoute.mutationWithParams<typeof ApproveStepSchema, { id: string; stepId: string }>({
  schema: ApproveStepSchema,
  handler: async (request, { user, data, params }) => {
    const stepId = parseInt(params.stepId, 10);

    if (isNaN(stepId)) {
      throw new AppError(400, 'Invalid step ID', ErrorCodes.VALIDATION_ERROR);
    }

    // Approve the step
    const result = await approvalService.approveStep(stepId, user.id, data.comment);

    // If approval is complete, trigger workflow-specific handlers
    if (result.isComplete && result.approval.workflowType === 'VAULT_DOCUMENT') {
      try {
        await handleVaultDocumentApprovalComplete(
          result.approval.workflowId,
          'APPROVED',
          user.id
        );
        logger.info('Vault document published after approval', {
          workflowId: result.approval.workflowId,
          approvalId: result.approval.id,
        });
      } catch (error) {
        logger.error('Failed to publish document after approval', {
          workflowId: result.approval.workflowId,
          error,
        });
        // Don't fail the approval - just log the error
      }
    }

    // Invalidate approvals cache
    await invalidateApprovalsCache();

    return NextResponse.json(
      successResponse(result, {
        message: result.isComplete ? 'Approval completed successfully' : 'Step approved successfully',
      }),
      {
        headers: {
          'Cache-Control': 'no-store',
        },
      }
    );
  },
});
