import { NextResponse } from 'next/server';
import { checkServiceLineAccess, getServiceLineStats } from '@/lib/services/service-lines/serviceLineService';
import { successResponse } from '@/lib/utils/apiUtils';
import { isValidServiceLine } from '@/lib/utils/serviceLineUtils';
import { secureRoute, Feature } from '@/lib/api/secureRoute';
import { AppError, ErrorCodes } from '@/lib/utils/errorHandler';

/**
 * GET /api/service-lines/[serviceLine]
 * Get statistics for a specific service line
 */
export const GET = secureRoute.queryWithParams<{ serviceLine: string }>({
  feature: Feature.ACCESS_DASHBOARD,
  handler: async (request, { user, params }) => {
    const { serviceLine } = params;

    // Validate service line
    if (!isValidServiceLine(serviceLine)) {
      throw new AppError(400, 'Invalid service line', ErrorCodes.VALIDATION_ERROR);
    }

    // Check access
    const hasAccess = await checkServiceLineAccess(user.id, serviceLine);
    if (!hasAccess) {
      throw new AppError(403, 'Access denied to this service line', ErrorCodes.FORBIDDEN);
    }

    const stats = await getServiceLineStats(serviceLine);

    return NextResponse.json(successResponse(stats));
  },
});
