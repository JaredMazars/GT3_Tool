import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/services/auth/auth';
import { checkFeature } from '@/lib/permissions/checkFeature';
import { Feature } from '@/lib/permissions/features';
import { successResponse } from '@/lib/utils/apiUtils';
import { handleApiError } from '@/lib/utils/errorHandler';
import { getMappingStatistics } from '@/lib/utils/serviceLineExternal';

export async function GET(_request: NextRequest) {
  try {
    // 1. Authenticate
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Check permission
    const hasPermission = await checkFeature(user.id, Feature.MANAGE_SERVICE_LINES);
    if (!hasPermission) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // 3. Get statistics
    const stats = await getMappingStatistics();

    return NextResponse.json(successResponse(stats));
  } catch (error) {
    return handleApiError(error, 'GET /api/admin/service-line-mapping/stats');
  }
}











