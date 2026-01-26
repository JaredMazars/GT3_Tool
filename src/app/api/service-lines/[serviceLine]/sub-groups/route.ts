import { NextResponse } from 'next/server';
import { successResponse } from '@/lib/utils/apiUtils';
import { getSubServiceLineGroupsByMaster } from '@/lib/utils/serviceLineExternal';
import { getUserSubServiceLineGroups, checkServiceLineAccess } from '@/lib/services/service-lines/serviceLineService';
import { secureRoute, Feature } from '@/lib/api/secureRoute';
import { isValidServiceLine } from '@/lib/utils/serviceLineUtils';
import { AppError, ErrorCodes } from '@/lib/utils/errorHandler';

/**
 * GET /api/service-lines/[serviceLine]/sub-groups
 * Fetch SubServLineGroups for a specific master service line with project counts
 */
export const GET = secureRoute.queryWithParams<{ serviceLine: string }>({
  feature: Feature.ACCESS_DASHBOARD,
  handler: async (request, { user, params }) => {
    const { serviceLine } = params;
    const masterCode = serviceLine.toUpperCase();

    // Validate service line
    if (!isValidServiceLine(masterCode)) {
      throw new AppError(400, 'Invalid service line', ErrorCodes.VALIDATION_ERROR);
    }

    // Check service line access
    const hasAccess = await checkServiceLineAccess(user.id, masterCode);
    if (!hasAccess) {
      throw new AppError(403, 'Access denied to this service line', ErrorCodes.FORBIDDEN);
    }

    // Get user's accessible sub-service line groups
    const userSubGroups = await getUserSubServiceLineGroups(user.id);

    // Fetch ALL SubServLineGroups with counts for this master code
    const allSubGroups = await getSubServiceLineGroupsByMaster(masterCode);
    
    // Filter to only sub-groups the user has access to
    const accessibleSubGroups = allSubGroups.filter(sg => 
      userSubGroups.includes(sg.code)
    );

    return NextResponse.json(successResponse(accessibleSubGroups));
  },
});






