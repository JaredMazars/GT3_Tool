/**
 * Database Index Health API
 * GET /api/admin/database/indexes - Get index fragmentation information
 */

export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { secureRoute, Feature } from '@/lib/api/secureRoute';
import { successResponse } from '@/lib/utils/apiUtils';
import { getIndexFragmentation } from '@/lib/services/admin/databaseService';
import { cache } from '@/lib/services/cache/CacheService';

/**
 * GET /api/admin/database/indexes
 * Get index health information showing fragmented indexes
 * Results are cached for 10 minutes
 */
export const GET = secureRoute.query({
  feature: Feature.MANAGE_DATABASE,
  handler: async (request, { user }) => {
    const cacheKey = 'admin:database:indexes';
    
    // Try cache first
    const cached = await cache.get(cacheKey);
    if (cached) {
      return NextResponse.json(successResponse(cached));
    }

    // Fetch fresh data
    const indexes = await getIndexFragmentation();

    // Cache for 10 minutes (600 seconds)
    await cache.set(cacheKey, indexes, 600);

    return NextResponse.json(successResponse(indexes));
  },
});
