import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/services/auth/auth';
import { checkUserPermission } from '@/lib/services/permissions/permissionService';
import { successResponse } from '@/lib/utils/apiUtils';
import { handleApiError } from '@/lib/utils/errorHandler';
import { getMappingStatistics } from '@/lib/utils/serviceLineExternal';

export async function GET(request: NextRequest) {
  try {
    // 1. Authenticate
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Check permission
    const hasPermission = await checkUserPermission(
      user.id,
      'admin.service-line-mapping',
      'READ'
    );
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










