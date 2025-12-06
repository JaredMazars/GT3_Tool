import { NextResponse } from 'next/server';
import { getRedisStatus, pingRedis } from '@/lib/cache/redisClient';
import { getCurrentUser } from '@/lib/services/auth/auth';
import { isSystemAdmin } from '@/lib/services/auth/authorization';

/**
 * GET /api/health/redis
 * Check Redis connection health
 * Requires SYSTEM_ADMIN role
 */
export async function GET() {
  try {
    // Security: Only system admins can check Redis health
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const isAdmin = await isSystemAdmin(user.id);
    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

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

    return NextResponse.json({
      success: true,
      data: {
        configured: status.configured,
        connected: status.connected,
        status: status.status,
        ping: {
          success: pingResult,
          error: pingError,
        },
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to check Redis health',
      },
      { status: 500 }
    );
  }
}
