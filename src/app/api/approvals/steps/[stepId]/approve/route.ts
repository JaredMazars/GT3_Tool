/**
 * POST /api/approvals/steps/[stepId]/approve
 * Approve an approval step
 */

import { NextResponse } from 'next/server';
import { secureRoute, Feature } from '@/lib/api/secureRoute';
import { approvalService } from '@/lib/services/approvals/approvalService';
import { invalidateApprovalsCache, invalidateWorkflowCache } from '@/lib/services/cache/cacheInvalidation';
import { successResponse } from '@/lib/utils/apiUtils';
import { AppError, ErrorCodes } from '@/lib/utils/errorHandler';
import { z } from 'zod';

const ApproveStepSchema = z.object({
  comment: z.string().optional(),
});

export const POST = secureRoute.mutationWithParams<typeof ApproveStepSchema, { stepId: string }>({
  feature: Feature.APPROVE_CLIENT_ACCEPTANCE,
  schema: ApproveStepSchema,
  handler: async (request, { user, params, data }) => {
    const stepId = parseInt(params.stepId, 10);
    
    if (isNaN(stepId)) {
      throw new AppError(400, 'Invalid step ID', ErrorCodes.VALIDATION_ERROR);
    }

    const result = await approvalService.approveStep(stepId, user.id, data.comment);

    // Invalidate approvals cache and workflow-specific caches
    await Promise.all([
      invalidateApprovalsCache(),
      invalidateWorkflowCache(result.workflowType, result.workflowId),
    ]);

    return NextResponse.json(successResponse(result));
  },
});
