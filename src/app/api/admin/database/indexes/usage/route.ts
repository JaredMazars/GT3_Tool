/**
 * API Route: Get Index Usage Statistics
 * Returns used/unused index statistics
 */

export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { secureRoute, Feature } from '@/lib/api/secureRoute';
import { successResponse } from '@/lib/utils/apiUtils';
import { getIndexUsage } from '@/lib/services/admin/databaseService';
import { cache } from '@/lib/services/cache/CacheService';

const CACHE_KEY = 'admin:database:index-usage';
const CACHE_TTL = 10 * 60; // 10 minutes

export const GET = secureRoute.query({
  feature: Feature.MANAGE_DATABASE,
  handler: async () => {
    // Try cache first
    const cached = await cache.get<ReturnType<typeof getIndexUsage>>(CACHE_KEY);
    if (cached) {
      return NextResponse.json(successResponse(cached));
    }

    // Get fresh data
    const usage = await getIndexUsage();

    // Cache result
    await cache.set(CACHE_KEY, usage, CACHE_TTL);

    return NextResponse.json(successResponse(usage));
  },
});
