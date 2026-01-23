/**
 * API Route: Get Slow Queries
 * Returns top 10 slowest queries from DMV
 */

export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { secureRoute, Feature } from '@/lib/api/secureRoute';
import { successResponse } from '@/lib/utils/apiUtils';
import { getSlowQueries, clearQueryStatistics } from '@/lib/services/admin/databaseService';
import { cache } from '@/lib/services/cache/CacheService';
import { auditAdminAction } from '@/lib/utils/auditLog';

const CACHE_KEY = 'admin:database:slow-queries';
const CACHE_TTL = 5 * 60; // 5 minutes

export const GET = secureRoute.query({
  feature: Feature.MANAGE_DATABASE,
  handler: async () => {
    // Try cache first
    const cached = await cache.get<ReturnType<typeof getSlowQueries>>(CACHE_KEY);
    if (cached) {
      return NextResponse.json(successResponse(cached));
    }

    // Get fresh data
    const queries = await getSlowQueries();

    // Cache result
    await cache.set(CACHE_KEY, queries, CACHE_TTL);

    return NextResponse.json(successResponse(queries));
  },
});

/**
 * DELETE /api/admin/database/queries/slow
 * Clear SQL Server query execution statistics (DBCC FREEPROCCACHE)
 * WARNING: This will clear the plan cache and cause temporary performance impact
 */
export const DELETE = secureRoute.mutation({
  feature: Feature.MANAGE_DATABASE,
  handler: async (request, { user }) => {
    // Clear query execution statistics
    const result = await clearQueryStatistics();

    // Clear cache so fresh queries are fetched
    await cache.delete(CACHE_KEY);

    // Log the operation
    await auditAdminAction(
      user.id,
      'QUERY_STATS_CLEAR',
      'DATABASE',
      'query_stats',
      { operation: 'DBCC FREEPROCCACHE' },
      request.headers.get('x-forwarded-for') || 'unknown'
    );

    return NextResponse.json(successResponse(result));
  },
});
