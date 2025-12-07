import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/services/auth/auth';
import { getSubServiceLineGroupsByMaster } from '@/lib/utils/serviceLineExternal';
import { successResponse } from '@/lib/utils/apiUtils';
import { handleApiError } from '@/lib/utils/errorHandler';

export const dynamic = 'force-dynamic';

/**
 * GET /api/service-lines/[masterCode]/sub-groups
 * Get all sub-service line groups for a master service line
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { masterCode: string } }
) {
  try {
    // Authenticate user
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { masterCode } = params;

    // Get sub-service line groups
    const subGroups = await getSubServiceLineGroupsByMaster(masterCode);

    return NextResponse.json(successResponse(subGroups));
  } catch (error) {
    return handleApiError(error, `GET /api/service-lines/${params.masterCode}/sub-groups`);
  }
}
