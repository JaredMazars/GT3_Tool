export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { successResponse } from '@/lib/utils/apiUtils';
import { cache, CACHE_PREFIXES } from '@/lib/services/cache/CacheService';
import { performanceMonitor } from '@/lib/utils/performanceMonitor';
import { secureRoute, Feature } from '@/lib/api/secureRoute';

/**
 * GET /api/groups/filters
 * Fetch all distinct groups for filter dropdowns
 */
export const GET = secureRoute.query({
  feature: Feature.ACCESS_CLIENTS,
  handler: async (request, { user }) => {
    const startTime = Date.now();
    let cacheHit = false;

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';

    if (search && search.length < 2) {
      return NextResponse.json(successResponse({
        groups: [],
        metadata: { hasMore: false, total: 0, returned: 0 },
        message: 'Please enter at least 2 characters to search',
      }));
    }

    const cacheKey = `${CACHE_PREFIXES.ANALYTICS}group-filters:search:${search}:limit:30`;
    
    const cached = await cache.get(cacheKey);
    if (cached) {
      cacheHit = true;
      performanceMonitor.trackApiCall('/api/groups/filters', startTime, true);
      return NextResponse.json(successResponse(cached));
    }

    interface WhereClause { OR?: Array<Record<string, { contains: string }>> }
    const where: WhereClause = {};
    if (search) {
      where.OR = [{ groupDesc: { contains: search } }, { groupCode: { contains: search } }];
    }

    const FILTER_LIMIT = 30;
    const groupsData = await prisma.client.groupBy({
      by: ['groupCode', 'groupDesc'],
      where,
      orderBy: [{ groupDesc: 'asc' }, { groupCode: 'asc' }],
      take: FILTER_LIMIT,
    });

    const groups = groupsData
      .filter(group => group.groupCode && group.groupDesc)
      .map(group => ({ code: group.groupCode!, name: group.groupDesc! }));

    const responseData = {
      groups,
      metadata: { hasMore: groups.length >= FILTER_LIMIT, total: groups.length, returned: groups.length },
    };

    await cache.set(cacheKey, responseData, 3600);
    performanceMonitor.trackApiCall('/api/groups/filters', startTime, cacheHit);

    return NextResponse.json(successResponse(responseData));
  },
});
