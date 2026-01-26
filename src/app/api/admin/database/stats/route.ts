/**
 * Database Statistics API
 * GET /api/admin/database/stats - Get database statistics and table sizes
 */

export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { secureRoute, Feature } from '@/lib/api/secureRoute';
import { successResponse } from '@/lib/utils/apiUtils';
import { getTableStatistics } from '@/lib/services/admin/databaseService';
import { cache } from '@/lib/services/cache/CacheService';

/**
 * GET /api/admin/database/stats
 * Get database statistics including table sizes and row counts
 * Results are cached for 5 minutes
 */
export const GET = secureRoute.query({
  feature: Feature.MANAGE_DATABASE,
  handler: async (request, { user }) => {
    const cacheKey = 'admin:database:stats';
    
    // Try cache first
    const cached = await cache.get(cacheKey);
    if (cached) {
      return NextResponse.json(successResponse(cached));
    }

    // Fetch fresh data
    const stats = await getTableStatistics();

    // Cache for 5 minutes (300 seconds)
    await cache.set(cacheKey, stats, 300);

    return NextResponse.json(successResponse(stats));
  },
});
