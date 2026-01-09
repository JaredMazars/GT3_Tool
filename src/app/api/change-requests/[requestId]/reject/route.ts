import { NextResponse } from 'next/server';
import { secureRoute } from '@/lib/api/secureRoute';
import { successResponse } from '@/lib/utils/apiUtils';
import { ResolveChangeRequestSchema } from '@/lib/validation/schemas';
import { AppError, ErrorCodes } from '@/lib/utils/errorHandler';
import { rejectChangeRequest } from '@/lib/services/clients/changeRequestService';
import { invalidateApprovalsCache } from '@/lib/services/cache/cacheInvalidation';

/**
 * PATCH /api/change-requests/[requestId]/reject
 * Reject a change request
 * 
 * Authorization:
 * - User's employee code must match the proposedEmployeeCode
 * - OR user is SYSTEM_ADMIN
 */
export const PATCH = secureRoute.mutationWithParams<typeof ResolveChangeRequestSchema, { requestId: string }>({
  schema: ResolveChangeRequestSchema,
  handler: async (request, { user, data, params }) => {
    const requestId = parseInt(params.requestId, 10);

    if (isNaN(requestId)) {
      throw new AppError(400, 'Invalid request ID', ErrorCodes.VALIDATION_ERROR);
    }

    // Reject the change request
    const changeRequest = await rejectChangeRequest(requestId, user.id, data);

    // Invalidate approvals cache
    await invalidateApprovalsCache();

    return NextResponse.json(
      successResponse(changeRequest, { message: 'Change request rejected' }),
      {
        headers: {
          'Cache-Control': 'no-store',
        },
      }
    );
  },
});
