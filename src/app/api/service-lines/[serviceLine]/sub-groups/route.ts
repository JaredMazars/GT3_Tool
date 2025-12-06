import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/services/auth/auth';
import { checkUserPermission } from '@/lib/services/permissions/permissionService';
import { successResponse } from '@/lib/utils/apiUtils';
import { handleApiError } from '@/lib/utils/errorHandler';
import { getSubServiceLineGroupsByMaster } from '@/lib/utils/serviceLineExternal';
import { cache, CACHE_PREFIXES } from '@/lib/services/cache/CacheService';

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
    const hasPermission = await checkUserPermission(user.id, 'dashboard', 'READ');
    if (!hasPermission) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // 4. Check cache first
    const cacheKey = `${CACHE_PREFIXES.SERVICE_LINE}${masterCode}:sub-groups`;
    const cached = await cache.get<Array<{
      code: string;
      description: string;
      activeTasks: number;
      totalTasks: number;
      masterCode: string;
    }>>(cacheKey);

    if (cached) {
      return NextResponse.json(successResponse(cached));
    }

    // 5. Fetch SubServLineGroups with counts
    const subGroups = await getSubServiceLineGroupsByMaster(masterCode);

    // 6. Cache the results (10 minutes)
    await cache.set(cacheKey, subGroups, 600);

    // 7. Return success response
    return NextResponse.json(successResponse(subGroups));
  } catch (error) {
    return handleApiError(error, 'GET /api/service-lines/[serviceLine]/sub-groups');
  }
}








