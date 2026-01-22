/**
 * API Route: Get Slow Queries
 * Returns top 10 slowest queries from DMV
 */

export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { secureRoute, Feature } from '@/lib/api/secureRoute';
import { successResponse } from '@/lib/utils/apiUtils';
import { getSlowQueries } from '@/lib/services/admin/databaseService';
import { cache } from '@/lib/services/cache/CacheService';

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
