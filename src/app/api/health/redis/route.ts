/**
 * Redis Health Check API
 * 
 * GET /api/health/redis - Get comprehensive Redis health status
 * 
 * Returns detailed Redis metrics including:
 * - Connection status and latency
 * - Memory usage
 * - Cache hit rate
 * - Connected clients
 * - Queue statistics
 */

import { NextRequest, NextResponse } from 'next/server';
import { getRedisHealth, getQueueStats } from '@/lib/monitoring/redisHealth';
import { getCurrentUser } from '@/lib/services/auth/auth';
import { handleApiError } from '@/lib/utils/errorHandler';
import { successResponse } from '@/lib/utils/apiUtils';

/**
 * GET /api/health/redis
 * Get Redis health status
 * 
 * Only accessible to SYSTEM_ADMIN users
 */
export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only system admins can access health endpoints
    if (user.systemRole !== 'SYSTEM_ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get Redis health
    const health = await getRedisHealth();
    
    // Get queue stats
    const queueStats = await getQueueStats();

    const response = {
      redis: health,
      queues: queueStats,
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json(successResponse(response));
  } catch (error) {
    return handleApiError(error, 'GET /api/health/redis');
  }
}

