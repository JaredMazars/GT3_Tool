/**
 * Page Permission Cache Management
 * Redis caching for page permissions to improve performance
 */

import { getRedisClient, isRedisAvailable } from './redisClient';
import { PageAccessResult } from '@/types/pagePermissions';

/**
 * Cache prefix for page permissions
 */
const CACHE_PREFIX = 'page_perm';

/**
 * TTL for page permission cache (10 minutes)
 */
const PAGE_PERMISSION_TTL = 600;

/**
 * Generate cache key for page permission
 */
function getCacheKey(pathname: string, role: string): string {
  return `${CACHE_PREFIX}:${pathname}:${role}`;
}

/**
 * Get cached page permission result
 */
export async function getCachedPagePermission(
  pathname: string,
  role: string
): Promise<PageAccessResult | null> {
  const redis = getRedisClient();
  if (!redis || !isRedisAvailable()) {
    return null;
  }
  
  try {
    const key = getCacheKey(pathname, role);
    const cached = await redis.get(key);
    
    if (!cached) {
      return null;
    }
    
    return JSON.parse(cached) as PageAccessResult;
  } catch (error) {
    console.error('Error getting cached page permission:', error);
    return null;
  }
}

/**
 * Set page permission in cache
 */
export async function setCachedPagePermission(
  pathname: string,
  role: string,
  result: PageAccessResult
): Promise<void> {
  const redis = getRedisClient();
  if (!redis || !isRedisAvailable()) {
    return;
  }
  
  try {
    const key = getCacheKey(pathname, role);
    await redis.setex(key, PAGE_PERMISSION_TTL, JSON.stringify(result));
  } catch (error) {
    console.error('Error setting cached page permission:', error);
    // Don't throw - caching is not critical
  }
}

/**
 * Clear page permission cache for a specific page
 * Clears all role variations for the page
 */
export async function clearPagePermissionCache(pathname?: string): Promise<void> {
  const redis = getRedisClient();
  if (!redis || !isRedisAvailable()) {
    return;
  }
  
  try {
    if (pathname) {
      // Clear specific page for all roles
      const pattern = `${CACHE_PREFIX}:${pathname}:*`;
      const keys = await redis.keys(pattern);
      
      if (keys.length > 0) {
        await redis.del(...keys);
      }
    } else {
      // Clear all page permissions
      const keys = await redis.keys(`${CACHE_PREFIX}:*`);
      
      if (keys.length > 0) {
        await redis.del(...keys);
      }
    }
  } catch (error) {
    console.error('Error clearing page permission cache:', error);
    // Don't throw - caching is not critical
  }
}

/**
 * Clear cache for multiple pathnames
 */
export async function clearMultiplePagePermissions(pathnames: string[]): Promise<void> {
  const redis = getRedisClient();
  if (!redis || !isRedisAvailable()) {
    return;
  }
  
  try {
    const keys: string[] = [];
    
    for (const pathname of pathnames) {
      const pattern = `${CACHE_PREFIX}:${pathname}:*`;
      const patternKeys = await redis.keys(pattern);
      keys.push(...patternKeys);
    }
    
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  } catch (error) {
    console.error('Error clearing multiple page permissions:', error);
    // Don't throw - caching is not critical
  }
}

/**
 * Get cache statistics for page permissions
 */
export async function getPagePermissionCacheStats(): Promise<{
  totalKeys: number;
  keysByPage: Record<string, number>;
}> {
  const redis = getRedisClient();
  if (!redis || !isRedisAvailable()) {
    return {
      totalKeys: 0,
      keysByPage: {},
    };
  }
  
  try {
    const keys = await redis.keys(`${CACHE_PREFIX}:*`);
    
    const keysByPage: Record<string, number> = {};
    
    for (const key of keys) {
      // Extract pathname from key: page_perm:pathname:role
      const parts = key.split(':');
      if (parts.length >= 3) {
        const pathname = parts[1];
        if (pathname) {
          keysByPage[pathname] = (keysByPage[pathname] || 0) + 1;
        }
      }
    }
    
    return {
      totalKeys: keys.length,
      keysByPage,
    };
  } catch (error) {
    console.error('Error getting cache stats:', error);
    return {
      totalKeys: 0,
      keysByPage: {},
    };
  }
}

