import { NextResponse } from 'next/server';
import { secureRoute, Feature } from '@/lib/api/secureRoute';
import { getServiceLineRole } from '@/lib/services/service-lines/serviceLineService';
import { successResponse } from '@/lib/utils/apiUtils';
import { isValidServiceLine } from '@/lib/utils/serviceLineUtils';
import { AppError, ErrorCodes } from '@/lib/utils/errorHandler';

/**
 * GET /api/service-lines/[serviceLine]/my-role
 * Get current user's role in a specific service line
 */
export const GET = secureRoute.queryWithParams<{ serviceLine: string }>({
  feature: Feature.ACCESS_DASHBOARD,
  handler: async (request, { user, params }) => {
    const { serviceLine } = params;
    const serviceLineUpper = serviceLine.toUpperCase();

    // Validate service line
    if (!isValidServiceLine(serviceLineUpper)) {
      throw new AppError(400, 'Invalid service line', ErrorCodes.VALIDATION_ERROR);
    }

    // Get user's role in this service line
    const role = await getServiceLineRole(user.id, serviceLineUpper);

    return NextResponse.json(successResponse({ role }));
  },
});
