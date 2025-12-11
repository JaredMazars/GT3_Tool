import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/services/auth/auth';
import { checkFeature } from '@/lib/permissions/checkFeature';
import { Feature } from '@/lib/permissions/features';
import { successResponse } from '@/lib/utils/apiUtils';
import { handleApiError } from '@/lib/utils/errorHandler';
import { getExternalServiceLinesBySubGroup } from '@/lib/utils/serviceLineExternal';

/**
 * GET /api/service-lines/[serviceLine]/[subServiceLineGroup]/external-lines
 * Fetch external service lines for a specific sub-service line group
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ serviceLine: string; subServiceLineGroup: string }> }
) {
  try {
    // 1. Authenticate
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Parse and validate params
    const { serviceLine, subServiceLineGroup } = await context.params;
    const masterCode = serviceLine.toUpperCase();
    const subGroupCode = subServiceLineGroup.toUpperCase().trim();

    // 3. Check permission
    const hasPermission = await checkFeature(user.id, Feature.ACCESS_DASHBOARD);
    if (!hasPermission) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // 4. Fetch external service lines for this sub-service line group
    const externalServiceLines = await getExternalServiceLinesBySubGroup(
      subGroupCode,
      masterCode
    );

    // 5. Filter to ensure only lines that match the sub-service line group are returned
    const filteredLines = externalServiceLines.filter(line => 
      line.SubServlineGroupCode?.toUpperCase().trim() === subGroupCode
    );

    // 6. Return success response
    return NextResponse.json(successResponse(filteredLines));
  } catch (error) {
    return handleApiError(error, 'GET /api/service-lines/[serviceLine]/[subServiceLineGroup]/external-lines');
  }
}





