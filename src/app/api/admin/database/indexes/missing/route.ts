/**
 * API Route: Get Missing Index Recommendations
 * Returns SQL Server missing index recommendations
 */

export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { secureRoute, Feature } from '@/lib/api/secureRoute';
import { successResponse } from '@/lib/utils/apiUtils';
import { getMissingIndexes } from '@/lib/services/admin/databaseService';
import { cache } from '@/lib/services/cache/CacheService';

const CACHE_KEY = 'admin:database:missing-indexes';
const CACHE_TTL = 10 * 60; // 10 minutes

export const GET = secureRoute.query({
  feature: Feature.MANAGE_DATABASE,
  handler: async () => {
    // Try cache first
    const cached = await cache.get<ReturnType<typeof getMissingIndexes>>(CACHE_KEY);
    if (cached) {
      return NextResponse.json(successResponse(cached));
    }

    // Get fresh data
    const indexes = await getMissingIndexes();

    // Cache result
    await cache.set(CACHE_KEY, indexes, CACHE_TTL);

    return NextResponse.json(successResponse(indexes));
  },
});
