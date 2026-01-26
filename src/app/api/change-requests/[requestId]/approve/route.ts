import { NextResponse } from 'next/server';
import { secureRoute } from '@/lib/api/secureRoute';
import { successResponse } from '@/lib/utils/apiUtils';
import { ResolveChangeRequestSchema } from '@/lib/validation/schemas';
import { AppError, ErrorCodes } from '@/lib/utils/errorHandler';
import { approveChangeRequest } from '@/lib/services/clients/changeRequestService';
import { invalidateClientCache } from '@/lib/services/cache/cacheInvalidation';
import { invalidateClientListCache } from '@/lib/services/cache/listCache';
import { invalidateApprovalsCache } from '@/lib/services/cache/cacheInvalidation';

/**
 * PATCH /api/change-requests/[requestId]/approve
 * Approve a change request
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

    // Approve the change request
    const changeRequest = await approveChangeRequest(requestId, user.id, data);

    // Invalidate caches
    await Promise.all([
      invalidateClientCache(changeRequest.Client?.GSClientID ?? ''),
      invalidateClientListCache(),
      invalidateApprovalsCache(),
    ]);

    return NextResponse.json(
      successResponse(changeRequest, { message: 'Change request approved successfully' }),
      {
        headers: {
          'Cache-Control': 'no-store',
        },
      }
    );
  },
});
