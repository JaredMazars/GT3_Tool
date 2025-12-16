import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { handleApiError } from '@/lib/utils/errorHandler';
import { successResponse } from '@/lib/utils/apiUtils';
import { getCurrentUser } from '@/lib/services/auth/auth';
import { cache, CACHE_PREFIXES } from '@/lib/services/cache/CacheService';

/**
 * GET /api/groups/filters
 * Fetch all distinct groups for filter dropdowns
 * Returns all groupCode/groupDesc pairs
 * 
 * Performance optimizations:
 * - Redis caching (30min TTL for relatively static data)
 * - No pagination (returns all distinct values)
 * - Optional search parameter for server-side filtering
 * - Uses groupBy for efficient distinct queries
 */
export async function GET(request: NextRequest) {
  try {
    // 1. Authenticate
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Check Permission
    const { checkFeature } = await import('@/lib/permissions/checkFeature');
    const { Feature } = await import('@/lib/permissions/features');
    const { getUserSubServiceLineGroups } = await import('@/lib/services/service-lines/serviceLineService');
    
    const hasPagePermission = await checkFeature(user.id, Feature.ACCESS_CLIENTS);
    const userSubGroups = await getUserSubServiceLineGroups(user.id);
    const hasServiceLineAccess = userSubGroups.length > 0;
    
    // Grant access if user has either page permission OR service line assignment
    if (!hasPagePermission && !hasServiceLineAccess) {
      return NextResponse.json({ error: 'Forbidden - Insufficient permissions' }, { status: 403 });
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';

    // Build cache key
    const cacheKey = `${CACHE_PREFIXES.ANALYTICS}group-filters:search:${search}:user:${user.id}`;
    
    // Try cache first (30min TTL since filter options are relatively static)
    const cached = await cache.get(cacheKey);
    if (cached) {
      return NextResponse.json(successResponse(cached));
    }

    // Build where clause for search
    interface WhereClause {
      OR?: Array<Record<string, { contains: string }>>;
    }
    
    const where: WhereClause = {};

    if (search) {
      where.OR = [
        { groupDesc: { contains: search } },
        { groupCode: { contains: search } },
      ];
    }

    // Get distinct groups using groupBy with limit for performance
    // Limit to top 200 matches to improve response time
    const FILTER_LIMIT = 200;
    
    const groupsData = await prisma.client.groupBy({
      by: ['groupCode', 'groupDesc'],
      where,
      orderBy: {
        groupDesc: 'asc',
      },
      take: FILTER_LIMIT,
    });

    // Format the response
    const groups = groupsData
      .filter(group => group.groupCode && group.groupDesc)
      .map(group => ({
        code: group.groupCode!,
        name: group.groupDesc!,
      }));

    const responseData = {
      groups,
    };

    // Cache the response (30min TTL)
    await cache.set(cacheKey, responseData, 1800);

    return NextResponse.json(successResponse(responseData));
  } catch (error) {
    return handleApiError(error, 'Get Group Filters');
  }
}


