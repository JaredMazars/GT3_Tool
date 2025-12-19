import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/services/auth/auth';
import { checkFeature } from '@/lib/permissions/checkFeature';
import { Feature } from '@/lib/permissions/features';
import { successResponse } from '@/lib/utils/apiUtils';
import { handleApiError } from '@/lib/utils/errorHandler';
import { getSubServiceLineGroupsByMaster } from '@/lib/utils/serviceLineExternal';
import { cache, CACHE_PREFIXES } from '@/lib/services/cache/CacheService';
import { getUserSubServiceLineGroups } from '@/lib/services/service-lines/serviceLineService';

/**
 * GET /api/service-lines/[serviceLine]/sub-groups
 * Fetch SubServLineGroups for a specific master service line with project counts
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

    // 4. Get user's accessible sub-service line groups
    const userSubGroups = await getUserSubServiceLineGroups(user.id);

    // 5. Fetch ALL SubServLineGroups with counts for this master code
    const allSubGroups = await getSubServiceLineGroupsByMaster(masterCode);
    
    // 6. Filter to only sub-groups the user has access to
    const accessibleSubGroups = allSubGroups.filter(sg => 
      userSubGroups.includes(sg.code)
    );

    // 7. Return success response (filtered by user access)
    return NextResponse.json(successResponse(accessibleSubGroups));
  } catch (error) {
    return handleApiError(error, 'GET /api/service-lines/[serviceLine]/sub-groups');
  }
}










