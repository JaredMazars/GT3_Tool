/**
 * Static Data Cache
 * 
 * In-memory caching for frequently accessed, rarely changing data
 * to reduce database queries and improve performance.
 */

import { prisma } from '@/lib/db/prisma';

// Cache entry interface
interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

// Cache storage
const cache = new Map<string, CacheEntry<any>>();

// Cache keys
const CACHE_KEYS = {
  CARL_PARTNERS: 'carl_partners',
  SERVICE_LINE_MAPPINGS: 'service_line_mappings',
} as const;

// Cache TTLs in milliseconds
const CACHE_TTL = {
  CARL_PARTNERS: 24 * 60 * 60 * 1000, // 24 hours
  SERVICE_LINE_MAPPINGS: 60 * 60 * 1000, // 1 hour
} as const;

/**
 * Generic cache get/set function with TTL
 */
function getCachedData<T>(key: string): T | null {
  const entry = cache.get(key);
  
  if (!entry) {
    return null;
  }
  
  // Check if expired
  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return null;
  }
  
  return entry.data;
}

function setCachedData<T>(key: string, data: T, ttl: number): void {
  cache.set(key, {
    data,
    expiresAt: Date.now() + ttl,
  });
}

/**
 * Get CARL partner employee codes
 * Cached for 24 hours
 * 
 * @returns Set of employee codes for CARL category partners
 */
export async function getCarlPartnerCodes(): Promise<Set<string>> {
  const cached = getCachedData<Set<string>>(CACHE_KEYS.CARL_PARTNERS);
  
  if (cached) {
    return cached;
  }
  
  // Fetch from database
  const carlPartners = await prisma.employee.findMany({
    where: {
      EmpCatCode: 'CARL',
    },
    select: {
      EmpCode: true,
    },
  });
  
  const codes = new Set(carlPartners.map(emp => emp.EmpCode));
  
  // Cache for 24 hours
  setCachedData(CACHE_KEYS.CARL_PARTNERS, codes, CACHE_TTL.CARL_PARTNERS);
  
  return codes;
}

/**
 * Service line mapping from external service line codes to master codes
 */
export interface ServiceLineMapping {
  ServLineCode: string;
  masterCode: string;
}

/**
 * Get service line external mappings
 * Cached for 1 hour
 * 
 * @returns Map of ServLineCode -> masterCode
 */
export async function getServiceLineMappings(): Promise<Map<string, string>> {
  const cached = getCachedData<Map<string, string>>(CACHE_KEYS.SERVICE_LINE_MAPPINGS);
  
  if (cached) {
    return cached;
  }
  
  // Fetch from database
  const serviceLineExternals = await prisma.serviceLineExternal.findMany({
    select: {
      ServLineCode: true,
      masterCode: true,
    },
  });
  
  const mappings = new Map<string, string>();
  serviceLineExternals.forEach((sl) => {
    if (sl.ServLineCode && sl.masterCode) {
      mappings.set(sl.ServLineCode, sl.masterCode);
    }
  });
  
  // Cache for 1 hour
  setCachedData(CACHE_KEYS.SERVICE_LINE_MAPPINGS, mappings, CACHE_TTL.SERVICE_LINE_MAPPINGS);
  
  return mappings;
}

/**
 * Clear all cached data
 * Useful for testing or manual cache invalidation
 */
export function clearStaticCache(): void {
  cache.clear();
}

/**
 * Clear specific cache entry
 */
export function clearCacheEntry(key: string): void {
  cache.delete(key);
}

/**
 * Get cache statistics
 * Useful for monitoring
 */
export function getCacheStats() {
  const stats = {
    size: cache.size,
    entries: Array.from(cache.keys()).map(key => {
      const entry = cache.get(key);
      return {
        key,
        expiresIn: entry ? Math.max(0, entry.expiresAt - Date.now()) : 0,
      };
    }),
  };
  
  return stats;
}

























