/**
 * Cache Invalidation Utilities
 * 
 * Provides event-driven cache invalidation for mutations.
 * Use these functions after creating, updating, or deleting entities
 * to ensure cache consistency.
 */

import { cache, CACHE_PREFIXES } from './CacheService';
import { logger } from '@/lib/utils/logger';

/**
 * Invalidate all caches related to a specific task
 */
export async function invalidateTaskCache(taskId: number): Promise<void> {
  try {
    await Promise.all([
      cache.invalidate(`${CACHE_PREFIXES.TASK}${taskId}`),
    ]);
    logger.debug('Task cache invalidated', { taskId });
  } catch (error) {
    // Silent fail - cache invalidation errors are not critical
  }
}

/**
 * Invalidate all caches related to a specific client
 */
export async function invalidateClientCache(clientId: number | string): Promise<void> {
  try {
    await cache.invalidate(`${CACHE_PREFIXES.CLIENT}${clientId}`);
    logger.debug('Client cache invalidated', { clientId });
  } catch (error) {
    // Silent fail - cache invalidation errors are not critical
  }
}

/**
 * Invalidate workspace counts cache for a specific service line and sub-group
 */
export async function invalidateWorkspaceCounts(
  serviceLine?: string,
  subServiceLineGroup?: string
): Promise<void> {
  try {
    if (serviceLine && subServiceLineGroup) {
      // Invalidate specific service line + sub-group
      await cache.invalidate(`${CACHE_PREFIXES.ANALYTICS}counts:${serviceLine}:${subServiceLineGroup}`);
    } else {
      // Invalidate all workspace counts
      await cache.invalidate(`${CACHE_PREFIXES.ANALYTICS}counts`);
    }
    logger.debug('Workspace counts cache invalidated', { serviceLine, subServiceLineGroup });
  } catch (error) {
    // Silent fail - cache invalidation errors are not critical
  }
}

/**
 * Invalidate all standard tasks cache for a service line
 */
export async function invalidateStandardTasksCache(serviceLine?: string): Promise<void> {
  try {
    if (serviceLine) {
      await cache.invalidate(`${CACHE_PREFIXES.SERVICE_LINE}standard-tasks:${serviceLine}`);
    } else {
      await cache.invalidate(`${CACHE_PREFIXES.SERVICE_LINE}standard-tasks`);
    }
    logger.debug('Standard tasks cache invalidated', { serviceLine });
  } catch (error) {
    // Silent fail - cache invalidation errors are not critical
  }
}

/**
 * Invalidate service line related caches
 */
export async function invalidateServiceLineCache(
  masterCode?: string,
  subGroupCode?: string
): Promise<void> {
  try {
    const promises: Promise<number>[] = [];
    
    if (masterCode) {
      promises.push(cache.invalidate(`${CACHE_PREFIXES.SERVICE_LINE}master:${masterCode}`));
    }
    if (subGroupCode) {
      promises.push(cache.invalidate(`${CACHE_PREFIXES.SERVICE_LINE}subgroup:${subGroupCode}`));
    }
    
    // Always invalidate service line mappings when any service line data changes
    promises.push(cache.invalidate(`${CACHE_PREFIXES.SERVICE_LINE}`));
    
    await Promise.all(promises);
    logger.debug('Service line cache invalidated', { masterCode, subGroupCode });
  } catch (error) {
    // Silent fail - cache invalidation errors are not critical
  }
}

/**
 * Invalidate user-related caches (permissions, preferences, etc.)
 */
export async function invalidateUserCache(userId: string): Promise<void> {
  try {
    await Promise.all([
      cache.invalidate(`${CACHE_PREFIXES.USER}${userId}`),
      cache.invalidate(`${CACHE_PREFIXES.PERMISSION}${userId}`),
    ]);
    logger.debug('User cache invalidated', { userId });
  } catch (error) {
    // Silent fail - cache invalidation errors are not critical
  }
}

/**
 * Invalidate analytics caches
 */
export async function invalidateAnalyticsCache(
  clientId?: number | string,
  type?: 'ratios' | 'documents' | 'rating'
): Promise<void> {
  try {
    if (clientId && type) {
      await cache.invalidate(`${CACHE_PREFIXES.ANALYTICS}${type}:${clientId}`);
    } else if (clientId) {
      await cache.invalidate(`${CACHE_PREFIXES.ANALYTICS}client:${clientId}`);
    } else {
      await cache.invalidate(`${CACHE_PREFIXES.ANALYTICS}`);
    }
    logger.debug('Analytics cache invalidated', { clientId, type });
  } catch (error) {
    // Silent fail - cache invalidation errors are not critical
  }
}

/**
 * Comprehensive invalidation after task creation/update
 * Use this when a task is created, updated, or deleted
 */
export async function invalidateOnTaskMutation(
  taskId: number,
  serviceLine?: string,
  subServiceLineGroup?: string
): Promise<void> {
  try {
    await Promise.all([
      invalidateTaskCache(taskId),
      invalidateWorkspaceCounts(serviceLine, subServiceLineGroup),
    ]);
    logger.debug('Task mutation caches invalidated', { taskId, serviceLine, subServiceLineGroup });
  } catch (error) {
    // Silent fail - cache invalidation errors are not critical
  }
}

/**
 * Comprehensive invalidation after client creation/update
 * Use this when a client is created, updated, or deleted
 */
export async function invalidateOnClientMutation(
  clientId: number | string
): Promise<void> {
  try {
    await Promise.all([
      invalidateClientCache(clientId),
      // Client changes can affect workspace counts (groups)
      invalidateWorkspaceCounts(),
    ]);
    logger.debug('Client mutation caches invalidated', { clientId });
  } catch (error) {
    // Silent fail - cache invalidation errors are not critical
  }
}

/**
 * Invalidate user's service line cache
 * Use this when a user's service line access is granted, revoked, or modified
 */
export async function invalidateUserServiceLines(userId: string): Promise<void> {
  try {
    await cache.delete(`${CACHE_PREFIXES.SERVICE_LINE}user:${userId}`);
    logger.info('Invalidated user service line cache', { userId });
  } catch (error) {
    // Silent fail - cache invalidation errors are not critical
  }
}

/**
 * Invalidate subgroups cache for a master service line
 * Use this when service line external mappings change
 */
export async function invalidateSubGroupsCache(masterCode: string): Promise<void> {
  try {
    await cache.delete(`${CACHE_PREFIXES.SERVICE_LINE}subgroups:${masterCode}`);
    logger.debug('Invalidated subgroups cache', { masterCode });
  } catch (error) {
    // Silent fail - cache invalidation errors are not critical
  }
}

/**
 * Comprehensive invalidation after service line access mutation
 * Use this when granting, revoking, or modifying service line access
 */
export async function invalidateOnServiceLineAccessMutation(
  userId: string,
  masterCode?: string
): Promise<void> {
  try {
    const promises: Promise<void>[] = [
      invalidateUserServiceLines(userId),
    ];
    
    if (masterCode) {
      promises.push(invalidateSubGroupsCache(masterCode));
    }
    
    await Promise.all(promises);
    logger.debug('Service line access mutation caches invalidated', { userId, masterCode });
  } catch (error) {
    // Silent fail - cache invalidation errors are not critical
  }
}

/**
 * Invalidate all caches related to a specific group
 * Use this when group data changes or when group-related analytics are updated
 */
export async function invalidateGroupCache(groupCode: string): Promise<void> {
  try {
    await Promise.all([
      cache.invalidate(`${CACHE_PREFIXES.ANALYTICS}graphs:group:${groupCode}`),
      // Invalidate group list caches that might include this group
      cache.invalidate(`${CACHE_PREFIXES.CLIENT}groups`),
    ]);
    logger.debug('Group cache invalidated', { groupCode });
  } catch (error) {
    // Silent fail - cache invalidation errors are not critical
  }
}

/**
 * Comprehensive invalidation after group mutation
 * Use this when a group is created, updated, or when clients are added/removed from a group
 */
export async function invalidateOnGroupMutation(
  groupCode: string
): Promise<void> {
  try {
    await Promise.all([
      invalidateGroupCache(groupCode),
      // Group changes can affect workspace counts
      invalidateWorkspaceCounts(),
    ]);
    logger.debug('Group mutation caches invalidated', { groupCode });
  } catch (error) {
    // Silent fail - cache invalidation errors are not critical
  }
}








