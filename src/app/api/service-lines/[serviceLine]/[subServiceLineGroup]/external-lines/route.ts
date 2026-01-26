import { NextResponse } from 'next/server';
import { successResponse } from '@/lib/utils/apiUtils';
import { getExternalServiceLinesBySubGroup } from '@/lib/utils/serviceLineExternal';
import { getUserSubServiceLineGroups, checkServiceLineAccess } from '@/lib/services/service-lines/serviceLineService';
import { secureRoute, Feature } from '@/lib/api/secureRoute';
import { isValidServiceLine } from '@/lib/utils/serviceLineUtils';
import { AppError, ErrorCodes } from '@/lib/utils/errorHandler';

/**
 * GET /api/service-lines/[serviceLine]/[subServiceLineGroup]/external-lines
 * Fetch external service lines for a specific sub-service line group
 */
export const GET = secureRoute.queryWithParams<{ serviceLine: string; subServiceLineGroup: string }>({
  feature: Feature.ACCESS_DASHBOARD,
  handler: async (request, { user, params }) => {
    const { serviceLine, subServiceLineGroup } = params;
    const masterCode = serviceLine.toUpperCase();
    const subGroupCode = subServiceLineGroup.toUpperCase().trim();

    // Validate service line
    if (!isValidServiceLine(masterCode)) {
      throw new AppError(400, 'Invalid service line', ErrorCodes.VALIDATION_ERROR);
    }

    // Check service line access
    const hasAccess = await checkServiceLineAccess(user.id, masterCode);
    if (!hasAccess) {
      throw new AppError(403, 'Access denied to this service line', ErrorCodes.FORBIDDEN);
    }

    // Check sub-service line group access
    const userSubGroups = await getUserSubServiceLineGroups(user.id);
    if (!userSubGroups.includes(subGroupCode)) {
      throw new AppError(403, 'Access denied to this sub-service line group', ErrorCodes.FORBIDDEN);
    }

    // Fetch external service lines for this sub-service line group
    const externalServiceLines = await getExternalServiceLinesBySubGroup(
      subGroupCode,
      masterCode
    );

    // Filter to ensure only lines that match the sub-service line group are returned
    const filteredLines = externalServiceLines.filter(line => 
      line.SubServlineGroupCode?.toUpperCase().trim() === subGroupCode
    );

    return NextResponse.json(successResponse(filteredLines));
  },
});





















