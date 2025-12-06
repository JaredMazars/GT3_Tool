/**
 * Distributed cache service with Redis support and in-memory fallback
 * Automatically uses Redis if available, falls back to in-memory cache otherwise
 * 
 * Security Features:
 * - Cache key sanitization to prevent injection attacks
 * - Namespace isolation for different cache types
 * - Key length limits to prevent abuse
 */

import { getRedisClient, isRedisAvailable } from '@/lib/cache/redisClient';
import { logger, logError } from '@/lib/utils/logger';

interface CacheEntry<T> {
  data: T;
  expiry: number;
}

/**
 * Cache namespace prefixes for isolation
 * Prevents key collisions and enables targeted invalidation
 */
export const CACHE_PREFIXES = {
  SESSION: 'sess:',
  PERMISSION: 'perm:',
  RATE_LIMIT: 'rl:',
  USER: 'user:',
  CLIENT: 'client:',
  TASK: 'task:',
  SERVICE_LINE: 'sl:',
  NOTIFICATION: 'notif:',
  ANALYTICS: 'analytics:',
} as const;

export type CachePrefix = typeof CACHE_PREFIXES[keyof typeof CACHE_PREFIXES];

export class CacheService {
  // In-memory fallback cache (when Redis not available)
  private memoryCache = new Map<string, CacheEntry<unknown>>();

  /**
   * Sanitize cache key to prevent injection attacks
   * Removes special characters and limits length
   */
  private sanitizeKey(key: string): string {
    // Prevent cache poisoning via key injection
    return key
      .replace(/[^a-zA-Z0-9:_-]/g, '_')
      .substring(0, 200); // Limit key length to prevent abuse
  }

  /**
   * Get cached value (tries Redis first, falls back to memory)
   */
  async get<T>(key: string): Promise<T | null> {
    const safeKey = this.sanitizeKey(key);
    const redis = getRedisClient();
    
    // Try Redis first
    if (redis && isRedisAvailable()) {
      try {
        const value = await redis.get(safeKey);
        if (value) {
          logger.debug('Redis cache hit', { key: safeKey });
          return JSON.parse(value) as T;
        }
        logger.debug('Redis cache miss', { key: safeKey });
        return null;
      } catch (error) {
        logError('Redis get error, falling back to memory', error, { key: safeKey });
      }
    }
    
    // Fallback to memory cache
    const entry = this.memoryCache.get(safeKey);
    if (!entry) {
      return null;
    }
    
    // Check if expired
    if (Date.now() > entry.expiry) {
      this.memoryCache.delete(safeKey);
      return null;
    }
    
    logger.debug('Memory cache hit', { key: safeKey });
    return entry.data as T;
  }

  /**
   * Set cached value with TTL in seconds
   */
  async set<T>(key: string, data: T, ttlSeconds: number = 300): Promise<void> {
    const safeKey = this.sanitizeKey(key);
    const redis = getRedisClient();
    
    // Try Redis first
    if (redis && isRedisAvailable()) {
      try {
        await redis.setex(safeKey, ttlSeconds, JSON.stringify(data));
        logger.debug('Redis cache set', { key: safeKey, ttl: ttlSeconds });
        return;
      } catch (error) {
        logError('Redis set error, falling back to memory', error, { key: safeKey });
      }
    }
    
    // Fallback to memory cache
    const expiry = Date.now() + (ttlSeconds * 1000);
    this.memoryCache.set(safeKey, { data, expiry });
    logger.debug('Memory cache set', { key: safeKey });
  }

  /**
   * Delete cached value
   */
  async delete(key: string): Promise<boolean> {
    const safeKey = this.sanitizeKey(key);
    const redis = getRedisClient();
    
    if (redis && isRedisAvailable()) {
      try {
        await redis.del(safeKey);
        logger.debug('Redis cache deleted', { key: safeKey });
        return true;
      } catch (error) {
        logError('Redis delete error', error, { key: safeKey });
      }
    }
    
    return this.memoryCache.delete(safeKey);
  }

  /**
   * Invalidate cache entries matching pattern
   * Note: Pattern is sanitized for security
   */
  async invalidate(pattern: string): Promise<number> {
    const safePattern = this.sanitizeKey(pattern);
    const redis = getRedisClient();
    let count = 0;
    
    if (redis && isRedisAvailable()) {
      try {
        const keys = await redis.keys(`*${safePattern}*`);
        if (keys.length > 0) {
          count = await redis.del(...keys);
        }
        logger.info('Redis invalidated keys', { pattern: safePattern, count });
        return count;
      } catch (error) {
        logError('Redis invalidate error', error, { pattern: safePattern });
      }
    }
    
    // Fallback to memory cache
    for (const key of this.memoryCache.keys()) {
      if (key.includes(safePattern)) {
        this.memoryCache.delete(key);
        count++;
      }
    }
    
    return count;
  }

  /**
   * Clear all cache entries
   */
  async clear(): Promise<void> {
    const redis = getRedisClient();
    
    if (redis && isRedisAvailable()) {
      try {
        await redis.flushdb();
        logger.info('Redis cache cleared');
        return;
      } catch (error) {
        logError('Redis clear error', error);
      }
    }
    
    this.memoryCache.clear();
  }

  /**
   * Get cache size (memory cache only)
   */
  size(): number {
    return this.memoryCache.size;
  }

  /**
   * Clean up expired entries in memory cache
   */
  cleanup(): number {
    let count = 0;
    const now = Date.now();
    
    for (const [key, entry] of this.memoryCache.entries()) {
      if (now > entry.expiry) {
        this.memoryCache.delete(key);
        count++;
      }
    }
    
    return count;
  }
}

// Singleton instance
export const cache = new CacheService();

// Run cleanup every 5 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    cache.cleanup();
  }, 5 * 60 * 1000);
}


























