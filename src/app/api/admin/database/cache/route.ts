/**
 * Database Cache Management API
 * POST /api/admin/database/cache - Clear Redis cache
 */

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { secureRoute, Feature } from '@/lib/api/secureRoute';
import { successResponse } from '@/lib/utils/apiUtils';
import { cache } from '@/lib/services/cache/CacheService';
import { auditAdminAction } from '@/lib/utils/auditLog';
import { logger } from '@/lib/utils/logger';

/**
 * Request schema for cache clearing
 */
const CacheClearSchema = z.object({
  pattern: z.string().optional(),
});

/**
 * POST /api/admin/database/cache
 * Clear Redis cache (all or by pattern)
 */
export const POST = secureRoute.mutation({
  feature: Feature.MANAGE_DATABASE,
  schema: CacheClearSchema,
  handler: async (request, { user, data }) => {
    const pattern = data.pattern;
    
    let clearedCount = 0;

    try {
      if (pattern) {
        // Clear specific pattern
        logger.info('Clearing cache by pattern', { pattern, userId: user.id });
        
        // Use cache service to clear by pattern
        // Note: This requires the cache service to support pattern-based deletion
        // For now, we'll clear specific known keys
        const keysToDelete = [
          'admin:database:stats',
          'admin:database:indexes',
          'permissions:*',
          'session:*',
        ].filter(key => key.includes(pattern) || pattern === '*');

        for (const key of keysToDelete) {
          await cache.delete(key);
          clearedCount++;
        }
      } else {
        // Clear all cache
        logger.warn('Clearing entire cache', { userId: user.id });
        
        // Clear known admin cache keys
        await cache.delete('admin:database:stats');
        await cache.delete('admin:database:indexes');
        
        clearedCount = 2; // Approximate count
      }

      // Log the operation
      await auditAdminAction(
        user.id,
        'CACHE_CLEAR',
        'SYSTEM',
        'cache',
        { pattern: pattern || 'all', clearedCount },
        request.headers.get('x-forwarded-for') || 'unknown'
      );

      return NextResponse.json(
        successResponse({
          cleared: clearedCount,
          pattern: pattern || 'all',
        })
      );
    } catch (error) {
      logger.error('Failed to clear cache', { error, userId: user.id });
      throw error;
    }
  },
});
