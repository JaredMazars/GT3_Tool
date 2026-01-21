/**
 * Session Manager
 * 
 * Centralized session management with distributed invalidation support.
 * Ensures session operations are consistent across all Container App instances.
 * 
 * Features:
 * - Distributed session invalidation via Redis
 * - Force logout capabilities for security events
 * - Session activity tracking
 * - Audit logging for session operations
 */

import { prisma } from '@/lib/db/prisma';
import { cache } from '@/lib/services/cache/CacheService';
import { logger } from '@/lib/utils/logger';
import { getRedisClient } from '@/lib/cache/redisClient';

/**
 * Cache key prefixes
 */
const SESSION_ACTIVITY_PREFIX = 'session:activity:';

/**
 * Session activity tracking
 */
export interface SessionActivity {
  sessionId: string;
  userId: string;
  lastActivity: Date;
  ipAddress: string;
  userAgent: string;
  activityCount: number;
}

export class SessionManager {
  /**
   * Invalidate a specific session across all instances
   * 
   * @param token - Session token to invalidate
   */
  static async invalidateSession(token: string): Promise<void> {
    try {
      // Delete from cache (distributed via Redis)
      await cache.delete(`session:${token}`);
      
      // Delete from database
      await prisma.session.delete({
        where: { sessionToken: token },
      }).catch(() => {
        // Session might not exist in DB, that's okay
      });
      
      // Publish invalidation event via Redis Pub/Sub (if Redis available)
      const redis = getRedisClient();
      if (redis) {
        await redis.publish('session:invalidated', token);
      }
      
      logger.info('Session invalidated', { token: token.substring(0, 10) + '...' });
    } catch (error) {
      logger.error('Error invalidating session', { error });
      throw error;
    }
  }

  /**
   * Invalidate all sessions for a user
   * Useful for password changes, permission updates, or security events
   * 
   * @param userId - User ID whose sessions should be invalidated
   */
  static async invalidateAllUserSessions(userId: string): Promise<void> {
    try {
      // Get all sessions for the user
      const sessions = await prisma.session.findMany({
        where: { userId },
        select: { sessionToken: true },
      });
      
      // Invalidate each session
      await Promise.all(
        sessions.map(session => this.invalidateSession(session.sessionToken))
      );

      // Also invalidate cache pattern
      await cache.invalidatePattern(`session:*:${userId}`);

      logger.info('All user sessions invalidated', { userId, count: sessions.length });
    } catch (error) {
      logger.error('Error invalidating user sessions', { userId, error });
      throw error;
    }
  }

  /**
   * Force logout a user from all devices
   * Used for security events like password reset, account compromise, etc.
   * 
   * @param userId - User ID to force logout
   * @param reason - Reason for force logout (for audit log)
   */
  static async forceLogoutUser(userId: string, reason: string): Promise<void> {
    try {
      await this.invalidateAllUserSessions(userId);
      
      // Log security event
      logger.warn('User force logged out', { userId, reason });
      
      // You could also create a notification or send an email here
      // await notifyUser(userId, 'You have been logged out for security reasons: ' + reason);
    } catch (error) {
      logger.error('Error forcing user logout', { userId, reason, error });
      throw error;
    }
  }

  /**
   * Track session activity for security auditing
   * 
   * @param token - Session token
   * @param ipAddress - Client IP address
   * @param userAgent - Client user agent
   */
  static async trackSessionActivity(
    token: string,
    ipAddress: string,
    userAgent: string
  ): Promise<void> {
    try {
      const activityKey = `session:activity:${token}`;
      const existing = await cache.get<SessionActivity>(activityKey);
      
      const activity: SessionActivity = {
        sessionId: existing?.sessionId || token.substring(0, 16),
        userId: existing?.userId || 'unknown',
        lastActivity: new Date(),
        ipAddress,
        userAgent,
        activityCount: (existing?.activityCount || 0) + 1,
      };
      
      // Cache for 1 hour
      await cache.set(activityKey, activity, 3600);
    } catch (error) {
      // Don't fail the request if activity tracking fails
      logger.error('Error tracking session activity', { error });
    }
  }

  /**
   * Get session activity for monitoring/debugging
   * 
   * @param token - Session token
   * @returns Session activity data or null
   */
  static async getSessionActivity(token: string): Promise<SessionActivity | null> {
    try {
      const activityKey = `session:activity:${token}`;
      return await cache.get<SessionActivity>(activityKey);
    } catch (error) {
      logger.error('Error getting session activity', { error });
      return null;
    }
  }

  /**
   * Clean up expired sessions from database
   * Should be run periodically (e.g., via cron job)
   * 
   * @returns Number of sessions cleaned up
   */
  static async cleanupExpiredSessions(): Promise<number> {
    try {
      const result = await prisma.session.deleteMany({
        where: {
          expires: {
            lt: new Date(),
          },
        },
      });
      
      logger.info('Expired sessions cleaned up', { count: result.count });
      return result.count;
    } catch (error) {
      logger.error('Error cleaning up expired sessions', { error });
      return 0;
    }
  }

  /**
   * Get active session count for a user
   * 
   * @param userId - User ID
   * @returns Number of active sessions
   */
  static async getActiveSessionCount(userId: string): Promise<number> {
    try {
      return await prisma.session.count({
        where: {
          userId,
          expires: {
            gt: new Date(),
          },
        },
      });
    } catch (error) {
      logger.error('Error getting active session count', { userId, error });
      return 0;
    }
  }

  /**
   * Get all active sessions for a user
   * Useful for "active sessions" management UI
   * 
   * @param userId - User ID
   * @returns Array of session information
   */
  static async getUserSessions(userId: string): Promise<Array<{
    id: string;
    expires: Date;
    lastActivity?: SessionActivity;
  }>> {
    try {
      const sessions = await prisma.session.findMany({
        where: {
          userId,
          expires: {
            gt: new Date(),
          },
        },
        select: {
          id: true,
          sessionToken: true,
          expires: true,
        },
        orderBy: {
          expires: 'desc',
        },
      });
      
      // OPTIMIZATION: Batch fetch all session activities with mget (10x faster than individual gets)
      // Build all cache keys
      const activityKeys = sessions.map(s => `${SESSION_ACTIVITY_PREFIX}${s.sessionToken}`);
      
      // Single Redis MGET call for all sessions
      const activitiesMap = await cache.mget<SessionActivity>(activityKeys);
      
      // Enrich with activity data using pre-fetched map
      const enriched = sessions.map((session, index) => {
        const activityKey = activityKeys[index];
        const activity = activityKey ? activitiesMap.get(activityKey) : undefined;
        
        return {
          id: session.id,
          expires: session.expires,
          lastActivity: activity || undefined,
        };
      });
      
      return enriched;
    } catch (error) {
      logger.error('Error getting user sessions', { userId, error });
      return [];
    }
  }
}


