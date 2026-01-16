import { NextResponse } from 'next/server';
import { secureRoute } from '@/lib/api/secureRoute';
import { successResponse } from '@/lib/utils/apiUtils';
import { approvalService } from '@/lib/services/approvals/approvalService';
import { handleVaultDocumentApprovalComplete } from '@/lib/services/document-vault/documentVaultWorkflow';
import { AppError, ErrorCodes } from '@/lib/utils/errorHandler';
import { z } from 'zod';
import { invalidateApprovalsCache } from '@/lib/services/cache/cacheInvalidation';
import { logger } from '@/lib/utils/logger';

const RejectStepSchema = z.object({
  comment: z.string().min(1, 'Rejection reason is required'),
}).strict();

/**
 * POST /api/approvals/[id]/steps/[stepId]/reject
 * Reject a specific approval step
 */
export const POST = secureRoute.mutationWithParams<typeof RejectStepSchema, { id: string; stepId: string }>({
  schema: RejectStepSchema,
  handler: async (request, { user, data, params }) => {
    const stepId = parseInt(params.stepId, 10);

    if (isNaN(stepId)) {
      throw new AppError(400, 'Invalid step ID', ErrorCodes.VALIDATION_ERROR);
    }

    // Reject the step
    const result = await approvalService.rejectStep(stepId, user.id, data.comment);

    // If approval is rejected, trigger workflow-specific handlers
    if (result.approval.status === 'REJECTED' && result.approval.workflowType === 'VAULT_DOCUMENT') {
      try {
        await handleVaultDocumentApprovalComplete(
          result.approval.workflowId,
          'REJECTED',
          user.id,
          data.comment
        );
        logger.info('Vault document rejected, set to DRAFT', {
          workflowId: result.approval.workflowId,
          approvalId: result.approval.id,
        });
      } catch (error) {
        logger.error('Failed to handle document rejection', {
          workflowId: result.approval.workflowId,
          error,
        });
        // Don't fail the rejection - just log the error
      }
    }

    // Invalidate approvals cache
    await invalidateApprovalsCache();

    return NextResponse.json(
      successResponse(result, { message: 'Approval rejected' }),
      {
        headers: {
          'Cache-Control': 'no-store',
        },
      }
    );
  },
});
