import { prisma } from '@/lib/db/prisma';
import { cache, CACHE_PREFIXES } from '@/lib/services/cache/CacheService';
import { logger } from '@/lib/utils/logger';

/**
 * Get service line codes for a sub-service line group with caching
 * This eliminates duplicate queries across planner endpoints
 * 
 * @param subServiceLineGroup - The sub-service line group code
 * @returns Array of external service line codes
 */
export async function getCachedServiceLineMapping(
  subServiceLineGroup: string
): Promise<string[]> {
  const cacheKey = `${CACHE_PREFIXES.SERVICE_LINE}external:${subServiceLineGroup}`;
  
  // Try cache first
  const cached = await cache.get<string[]>(cacheKey);
  if (cached) {
    return cached;
  }

  // Cache miss - query database
  const mappings = await prisma.serviceLineExternal.findMany({
    where: {
      SubServlineGroupCode: subServiceLineGroup
    },
    select: {
      ServLineCode: true
    }
  });
  
  const codes = mappings
    .map(m => m.ServLineCode)
    .filter((code): code is string => !!code);
  
  // Cache for 30 minutes (relatively static data)
  await cache.set(cacheKey, codes, 1800);
  
  logger.debug('Cached service line mapping', {
    subServiceLineGroup,
    codesCount: codes.length
  });
  
  return codes;
}
