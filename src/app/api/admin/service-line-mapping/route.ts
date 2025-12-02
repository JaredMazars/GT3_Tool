import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/services/auth/auth';
import { checkUserPermission } from '@/lib/services/permissions/permissionService';
import { successResponse } from '@/lib/utils/apiUtils';
import { handleApiError } from '@/lib/utils/errorHandler';
import { getAllExternalServiceLines } from '@/lib/utils/serviceLineExternal';
import { getAllServiceLines } from '@/lib/utils/serviceLine';

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

    // 3. Fetch external service lines
    const externalServiceLines = await getAllExternalServiceLines();

    // 4. Fetch master service lines for reference
    const masterServiceLines = await getAllServiceLines();

    // 5. Enrich external service lines with master details
    const enrichedData = externalServiceLines.map((external) => {
      const master = external.masterCode
        ? masterServiceLines.find((m) => m.code === external.masterCode)
        : null;

      return {
        ...external,
        masterServiceLine: master || null,
      };
    });

    return NextResponse.json(
      successResponse({
        externalServiceLines: enrichedData,
        masterServiceLines,
      })
    );
  } catch (error) {
    return handleApiError(error, 'GET /api/admin/service-line-mapping');
  }
}










