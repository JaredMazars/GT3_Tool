/**
 * Simple in-memory cache service
 * For production, consider using Redis or another distributed cache
 */

interface CacheEntry<T> {
  data: T;
  expiry: number;
}

export class CacheService {
  private cache = new Map<string, CacheEntry<unknown>>();

  /**
   * Get cached value
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return null;
    }

    // Check if expired
    if (Date.now() > entry.expiry) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  /**
   * Set cached value with TTL in seconds
   */
  set<T>(key: string, data: T, ttlSeconds: number = 300): void {
    const expiry = Date.now() + (ttlSeconds * 1000);
    this.cache.set(key, { data, expiry });
  }

  /**
   * Delete cached value
   */
  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  /**
   * Invalidate cache entries matching pattern
   */
  invalidate(pattern: string): number {
    let count = 0;
    
    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        this.cache.delete(key);
        count++;
      }
    }
    
    return count;
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get cache size
   */
  size(): number {
    return this.cache.size;
  }

  /**
   * Clean up expired entries
   */
  cleanup(): number {
    let count = 0;
    const now = Date.now();
    
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiry) {
        this.cache.delete(key);
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






