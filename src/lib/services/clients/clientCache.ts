/**
 * Client Caching Utilities
 * 
 * Centralized caching logic for client data
 * Handles cache keys, TTLs, and invalidation strategies
 */

import { cache, CACHE_PREFIXES } from '@/lib/services/cache/CacheService';
import { logger } from '@/lib/utils/logger';

/**
 * Cache TTLs (in seconds)
 */
export const CLIENT_CACHE_TTL = {
  DETAIL: 600,        // 10 minutes for client detail
  LIST: 300,          // 5 minutes for client list
  TASK_COUNTS: 600,   // 10 minutes for task counts
} as const;

/**
 * Generate cache key for client detail
 * 
 * @param clientID - Client ID (GUID)
 * @param serviceLine - Optional service line filter
 * @param includeArchived - Whether archived tasks are included
 * @returns Cache key
 */
export function getClientDetailCacheKey(
  clientID: string,
  serviceLine?: string,
  includeArchived: boolean = false
): string {
  const parts = ['client', clientID];
  if (serviceLine) parts.push(serviceLine);
  if (includeArchived) parts.push('archived');
  return `${CACHE_PREFIXES.TASK}${parts.join(':')}`;
}

/**
 * Get cached client data
 * 
 * @param clientID - Client ID (GUID)
 * @param serviceLine - Optional service line filter
 * @param includeArchived - Whether archived tasks are included
 * @returns Cached client data or null
 */
export async function getCachedClient<T>(
  clientID: string,
  serviceLine?: string,
  includeArchived: boolean = false
): Promise<T | null> {
  const cacheKey = getClientDetailCacheKey(clientID, serviceLine, includeArchived);
  
  try {
    const cached = await cache.get<T>(cacheKey);
    if (cached) {
      logger.debug('Client cache hit', { clientID, serviceLine, includeArchived });
    }
    return cached;
  } catch (error) {
    logger.error('Error getting cached client', { clientID, error });
    return null;
  }
}

/**
 * Set client data in cache
 * 
 * @param clientID - Client ID (GUID)
 * @param data - Client data to cache
 * @param serviceLine - Optional service line filter
 * @param includeArchived - Whether archived tasks are included
 */
export async function setCachedClient<T>(
  clientID: string,
  data: T,
  serviceLine?: string,
  includeArchived: boolean = false
): Promise<void> {
  const cacheKey = getClientDetailCacheKey(clientID, serviceLine, includeArchived);
  
  try {
    await cache.set(cacheKey, data, CLIENT_CACHE_TTL.DETAIL);
    logger.debug('Client cached', { clientID, serviceLine, includeArchived });
  } catch (error) {
    logger.error('Error caching client', { clientID, error });
  }
}

/**
 * Invalidate all cache entries for a client
 * Called when client is updated or tasks are modified
 * 
 * @param clientID - Client ID (GUID)
 */
export async function invalidateClientCache(clientID: string): Promise<void> {
  try {
    const pattern = `${CACHE_PREFIXES.TASK}client:${clientID}`;
    const count = await cache.invalidate(pattern);
    logger.info('Client cache invalidated', { clientID, count });
  } catch (error) {
    logger.error('Error invalidating client cache', { clientID, error });
  }
}

/**
 * Invalidate task counts cache for a client
 * More targeted invalidation when only counts change
 * 
 * @param clientID - Client ID (GUID)
 */
export async function invalidateClientTaskCounts(clientID: string): Promise<void> {
  try {
    const pattern = `${CACHE_PREFIXES.TASK}counts:client:${clientID}`;
    const count = await cache.invalidate(pattern);
    logger.debug('Client task counts cache invalidated', { clientID, count });
  } catch (error) {
    logger.error('Error invalidating client task counts cache', { clientID, error });
  }
}

/**
 * Invalidate all client-related caches
 * Nuclear option for when client data structure changes
 */
export async function invalidateAllClientCaches(): Promise<void> {
  try {
    const pattern = `${CACHE_PREFIXES.TASK}client`;
    const count = await cache.invalidate(pattern);
    logger.info('All client caches invalidated', { count });
  } catch (error) {
    logger.error('Error invalidating all client caches', { error });
  }
}

/**
 * Warm up cache for a client
 * Pre-loads client data into cache for faster subsequent access
 * 
 * @param clientID - Client ID (GUID)
 * @param dataFetcher - Function that fetches the client data
 * @param serviceLine - Optional service line filter
 * @param includeArchived - Whether archived tasks are included
 */
export async function warmClientCache<T>(
  clientID: string,
  dataFetcher: () => Promise<T>,
  serviceLine?: string,
  includeArchived: boolean = false
): Promise<T> {
  try {
    // Check if already cached
    const cached = await getCachedClient<T>(clientID, serviceLine, includeArchived);
    if (cached) {
      return cached;
    }

    // Fetch and cache
    const data = await dataFetcher();
    await setCachedClient(clientID, data, serviceLine, includeArchived);
    
    return data;
  } catch (error) {
    logger.error('Error warming client cache', { clientID, error });
    // Fetch without caching on error
    return dataFetcher();
  }
}





