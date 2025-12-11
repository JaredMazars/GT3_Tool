import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/services/auth/auth';
import { checkFeature } from '@/lib/permissions/checkFeature';
import { Feature } from '@/lib/permissions/features';
import { successResponse } from '@/lib/utils/apiUtils';
import { handleApiError } from '@/lib/utils/errorHandler';
import { getExternalServiceLinesByMaster } from '@/lib/utils/serviceLineExternal';

/**
 * GET /api/service-lines/[serviceLine]/external-lines
 * Fetch all external service lines for a specific master service line
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ serviceLine: string }> }
) {
  try {
    // 1. Authenticate
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Parse and validate params
    const { serviceLine } = await context.params;
    const masterCode = serviceLine.toUpperCase();

    // 3. Check permission
    const hasPermission = await checkFeature(user.id, Feature.ACCESS_DASHBOARD);
    if (!hasPermission) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // 4. Fetch all external service lines for this master service line
    const externalServiceLines = await getExternalServiceLinesByMaster(masterCode);

    // 5. Return success response
    return NextResponse.json(successResponse(externalServiceLines));
  } catch (error) {
    return handleApiError(error, 'GET /api/service-lines/[serviceLine]/external-lines');
  }
}





