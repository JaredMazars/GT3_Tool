import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { handleApiError } from '@/lib/utils/errorHandler';
import { successResponse } from '@/lib/utils/apiUtils';
import { getCurrentUser } from '@/lib/services/auth/auth';
import { cache, CACHE_PREFIXES } from '@/lib/services/cache/CacheService';
import { performanceMonitor } from '@/lib/utils/performanceMonitor';

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
  const startTime = Date.now();
  let cacheHit = false;
  
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

    // Enforce minimum search length (client-side should prevent this, but validate server-side)
    if (search && search.length < 2) {
      return NextResponse.json(successResponse({
        groups: [],
        metadata: {
          hasMore: false,
          total: 0,
          returned: 0,
        },
        message: 'Please enter at least 2 characters to search',
      }));
    }

    // Build cache key (no user ID - filters are same for all users)
    const cacheKey = `${CACHE_PREFIXES.ANALYTICS}group-filters:search:${search}:limit:30`;
    
    // Try cache first (60min TTL since filter options are relatively static)
    const cached = await cache.get(cacheKey);
    if (cached) {
      cacheHit = true;
      performanceMonitor.trackApiCall('/api/groups/filters', startTime, true);
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

    // Reduced limit for faster response times (reduced from 50 to 30)
    const FILTER_LIMIT = 30;
    
    // Get limited results only (removed total count query for performance)
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
      metadata: {
        hasMore: groups.length >= FILTER_LIMIT,
        total: groups.length, // Approximate - actual total may be higher if hasMore is true
        returned: groups.length,
      },
    };

    // Cache the response (60min TTL - increased from 30min)
    await cache.set(cacheKey, responseData, 3600);

    // Track performance
    performanceMonitor.trackApiCall('/api/groups/filters', startTime, cacheHit);

    return NextResponse.json(successResponse(responseData));
  } catch (error) {
    performanceMonitor.trackApiCall('/api/groups/filters [ERROR]', startTime, cacheHit);
    return handleApiError(error, 'Get Group Filters');
  }
}


