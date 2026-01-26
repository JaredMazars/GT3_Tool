import { NextResponse } from 'next/server';
import { successResponse } from '@/lib/utils/apiUtils';
import { getSubServiceLineGroupsByMaster } from '@/lib/utils/serviceLineExternal';
import { secureRoute, Feature } from '@/lib/api/secureRoute';
import { isValidServiceLine } from '@/lib/utils/serviceLineUtils';
import { AppError, ErrorCodes } from '@/lib/utils/errorHandler';

/**
 * GET /api/admin/service-lines/[serviceLine]/sub-groups
 * Get ALL sub-groups for a service line (admin-only, no user filtering)
 * 
 * This endpoint is used for user management - admins can see all sub-groups
 * for assignment purposes, even if they don't personally have access to them.
 * 
 * Unlike the regular /api/service-lines/[serviceLine]/sub-groups endpoint which
 * filters by current user's access, this endpoint returns ALL available sub-groups
 * for the specified service line.
 */
export const GET = secureRoute.queryWithParams<{ serviceLine: string }>({
  feature: Feature.MANAGE_SERVICE_LINES, // Admin only
  handler: async (request, { user, params }) => {
    const { serviceLine } = params;
    const masterCode = serviceLine.toUpperCase();

    // Validate service line
    if (!isValidServiceLine(masterCode)) {
      throw new AppError(400, 'Invalid service line', ErrorCodes.VALIDATION_ERROR);
    }

    // Get ALL sub-groups for this master code (no filtering by user access)
    // This allows admins to see all available sub-groups for assignment
    const allSubGroups = await getSubServiceLineGroupsByMaster(masterCode);

    return NextResponse.json(successResponse(allSubGroups));
  },
});
