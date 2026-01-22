export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getRedisStatus, pingRedis } from '@/lib/cache/redisClient';
import { secureRoute, Feature } from '@/lib/api/secureRoute';
import { successResponse } from '@/lib/utils/apiUtils';

/**
 * GET /api/health/redis
 * Check Redis connection health
 * Requires admin access
 */
export const GET = secureRoute.query({
  feature: Feature.ACCESS_ADMIN,
  handler: async (request, { user }) => {
    // Get connection status
    const status = getRedisStatus();

    // Try to ping Redis if connected
    let pingResult = false;
    let pingError: string | null = null;

    if (status.connected) {
      try {
        pingResult = await pingRedis();
      } catch (error) {
        pingError = error instanceof Error ? error.message : String(error);
      }
    }

    return NextResponse.json(
      successResponse({
        configured: status.configured,
        connected: status.connected,
        status: status.status,
        ping: {
          success: pingResult,
          error: pingError,
        },
        timestamp: new Date().toISOString(),
      })
    );
  },
});
