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
  CLIENT_ACCEPTANCE: 'client:acceptance:',
  TASK: 'task:',
  SERVICE_LINE: 'sl:',
  NOTIFICATION: 'notif:',
  ANALYTICS: 'analytics:',
  DOCUMENT_VAULT: 'document:vault:',
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
   * Batch get multiple cached values in a single operation (much faster than multiple get() calls)
   * Returns a Map with keys and their corresponding values (null for cache misses)
   * 
   * OPTIMIZATION: Uses Redis MGET for 10x faster batch retrieval
   * 
   * @param keys - Array of cache keys to fetch
   * @returns Map of keys to values (null for misses)
   */
  async mget<T>(keys: string[]): Promise<Map<string, T | null>> {
    const result = new Map<string, T | null>();
    
    if (keys.length === 0) {
      return result;
    }

    // Sanitize all keys
    const safeKeys = keys.map(k => this.sanitizeKey(k));
    const keyMap = new Map(keys.map((k, i) => [safeKeys[i], k])); // Map sanitized -> original
    
    const redis = getRedisClient();
    
    // Try Redis first (MGET is much faster than multiple GET calls)
    if (redis && isRedisAvailable()) {
      try {
        const values = await redis.mget(...safeKeys);
        
        for (let i = 0; i < safeKeys.length; i++) {
          const originalKey = keys[i];
          if (!originalKey) continue;
          
          const value = values[i];
          
          if (value) {
            try {
              result.set(originalKey, JSON.parse(value) as T);
              logger.debug('Redis mget cache hit', { key: safeKeys[i] });
            } catch (parseError) {
              logError('JSON parse error in mget', parseError, { key: safeKeys[i] });
              result.set(originalKey, null);
            }
          } else {
            result.set(originalKey, null);
            logger.debug('Redis mget cache miss', { key: safeKeys[i] });
          }
        }
        
        return result;
      } catch (error) {
        logError('Redis mget error, falling back to memory', error, { keyCount: keys.length });
      }
    }
    
    // Fallback to memory cache (check each key individually)
    const now = Date.now();
    for (let i = 0; i < keys.length; i++) {
      const originalKey = keys[i];
      if (!originalKey) continue;
      
      const safeKey = safeKeys[i];
      if (!safeKey) continue;
      
      const entry = this.memoryCache.get(safeKey);
      
      if (!entry) {
        result.set(originalKey, null);
        continue;
      }
      
      // Check if expired
      if (now > entry.expiry) {
        this.memoryCache.delete(safeKey);
        result.set(originalKey, null);
        continue;
      }
      
      logger.debug('Memory cache mget hit', { key: safeKey });
      result.set(originalKey, entry.data as T);
    }
    
    return result;
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
   * @deprecated Use invalidatePattern() for wildcard patterns
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
   * Invalidate cache entries matching pattern with wildcard support
   * Supports Redis wildcard patterns: * ? [abc] etc.
   * 
   * Security: Pattern is validated but wildcards are preserved
   */
  async invalidatePattern(pattern: string): Promise<number> {
    // Validate pattern but preserve wildcards
    const safePattern = this.sanitizePattern(pattern);
    const redis = getRedisClient();
    let count = 0;

    if (redis && isRedisAvailable()) {
      try {
        // Use SCAN instead of KEYS for better performance
        const keys: string[] = [];
        let cursor = '0';
        
        do {
          const result = await redis.scan(cursor, 'MATCH', safePattern, 'COUNT', 100);
          cursor = result[0];
          keys.push(...result[1]);
        } while (cursor !== '0');
        
        if (keys.length > 0) {
          count = await redis.del(...keys);
          logger.info('Redis pattern invalidation', { pattern: safePattern, count });
        }
        return count;
      } catch (error) {
        logError('Redis pattern invalidation error', error, { pattern: safePattern });
        return 0;
      }
    }

    // Fallback: Memory cache pattern matching
    const regex = new RegExp(
      '^' + safePattern.replace(/\*/g, '.*').replace(/\?/g, '.') + '$'
    );
    
    for (const key of this.memoryCache.keys()) {
      if (regex.test(key)) {
        this.memoryCache.delete(key);
        count++;
      }
    }
    
    return count;
  }

  /**
   * Sanitize pattern while preserving wildcards
   * Only removes truly dangerous characters
   */
  private sanitizePattern(pattern: string): string {
    // Preserve wildcards (*, ?) and standard separators (:, -, _)
    // Remove only dangerous injection characters
    return pattern
      .replace(/[^a-zA-Z0-9:_\-*?]/g, '_')  // Preserves * and ?
      .substring(0, 200);
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


























