import { NextResponse } from 'next/server';
import { successResponse } from '@/lib/utils/apiUtils';
import { getExternalServiceLinesByMaster } from '@/lib/utils/serviceLineExternal';
import { checkServiceLineAccess } from '@/lib/services/service-lines/serviceLineService';
import { secureRoute, Feature } from '@/lib/api/secureRoute';
import { isValidServiceLine } from '@/lib/utils/serviceLineUtils';
import { AppError, ErrorCodes } from '@/lib/utils/errorHandler';

/**
 * GET /api/service-lines/[serviceLine]/external-lines
 * Fetch all external service lines for a specific master service line
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

    // Fetch all external service lines for this master service line
    const externalServiceLines = await getExternalServiceLinesByMaster(masterCode);

    return NextResponse.json(successResponse(externalServiceLines));
  },
});





















