/**
 * Task Aggregation Utilities
 * 
 * Optimized utilities for aggregating task counts by service line
 * Reduces multiple sequential queries to single aggregated queries
 */

import { prisma } from '@/lib/db/prisma';
import { cache, CACHE_PREFIXES } from '@/lib/services/cache/CacheService';
import { logger } from '@/lib/utils/logger';

/**
 * Service line mapping interface
 */
export interface ServiceLineMapping {
  ServLineCode: string;
  masterCode: string;
}

/**
 * Task counts by master service line
 */
export interface TaskCountsByServiceLine {
  TAX: number;
  AUDIT: number;
  ACCOUNTING: number;
  ADVISORY: number;
  QRM: number;
  BUSINESS_DEV: number;
  IT: number;
  FINANCE: number;
  HR: number;
}

/**
 * Get all service line mappings with caching
 * Maps external ServLineCode to master service line code
 * 
 * @returns Map of ServLineCode to masterCode
 */
export async function getServiceLineMappings(): Promise<Map<string, string>> {
  const cacheKey = `${CACHE_PREFIXES.SERVICE_LINE}all-mappings`;
  
  try {
    // Try cache first
    const cached = await cache.get<ServiceLineMapping[]>(cacheKey);
    if (cached) {
      return new Map(cached.map(m => [m.ServLineCode, m.masterCode]));
    }

    // Fetch from database
    const mappings = await prisma.serviceLineExternal.findMany({
      where: {
        ServLineCode: { not: null },
        masterCode: { not: null },
      },
      select: {
        ServLineCode: true,
        masterCode: true,
      },
    });

    const validMappings = mappings
      .filter((m): m is ServiceLineMapping => 
        m.ServLineCode !== null && m.masterCode !== null
      );

    // Cache for 10 minutes
    await cache.set(cacheKey, validMappings, 600);

    return new Map(validMappings.map(m => [m.ServLineCode, m.masterCode]));
  } catch (error) {
    logger.error('Error fetching service line mappings', { error });
    return new Map();
  }
}

/**
 * Aggregate task counts by master service line
 * Converts raw grouped counts by ServLineCode to counts by master service line
 * 
 * @param rawCounts - Array of counts grouped by ServLineCode
 * @param mappings - Map of ServLineCode to masterCode
 * @returns Task counts organized by master service line
 */
export function aggregateByMasterServiceLine(
  rawCounts: Array<{ ServLineCode: string; _count: { id: number } }>,
  mappings: Map<string, string>
): TaskCountsByServiceLine {
  const counts: TaskCountsByServiceLine = {
    TAX: 0,
    AUDIT: 0,
    ACCOUNTING: 0,
    ADVISORY: 0,
    QRM: 0,
    BUSINESS_DEV: 0,
    IT: 0,
    FINANCE: 0,
    HR: 0,
  };

  for (const item of rawCounts) {
    const masterCode = mappings.get(item.ServLineCode);
    if (masterCode && masterCode in counts) {
      counts[masterCode as keyof TaskCountsByServiceLine] += item._count.id;
    }
  }

  return counts;
}

/**
 * Get task counts by service line for a client (optimized single query)
 * 
 * @param GSClientID - Client ID (GUID)
 * @param includeArchived - Whether to include archived tasks
 * @returns Task counts by master service line
 */
export async function getTaskCountsByServiceLine(
  GSClientID: string,
  includeArchived: boolean = false
): Promise<TaskCountsByServiceLine> {
  const cacheKey = `${CACHE_PREFIXES.TASK}counts:client:${GSClientID}:${includeArchived}`;
  
  try {
    // Try cache first
    const cached = await cache.get<TaskCountsByServiceLine>(cacheKey);
    if (cached) {
      logger.debug('Task counts cache hit', { GSClientID, includeArchived });
      return cached;
    }

    // Verify client exists
    const client = await prisma.client.findUnique({
      where: { GSClientID },
      select: { GSClientID: true },
    });

    if (!client) {
      logger.warn('Client not found for task counts', { GSClientID });
      return {
        TAX: 0,
        AUDIT: 0,
        ACCOUNTING: 0,
        ADVISORY: 0,
        QRM: 0,
        BUSINESS_DEV: 0,
        IT: 0,
        FINANCE: 0,
        HR: 0,
      };
    }

    // Get service line mappings (cached)
    const mappings = await getServiceLineMappings();

    // Single aggregated query instead of 9 separate counts
    const taskCountsRaw = await prisma.task.groupBy({
      by: ['ServLineCode'],
      where: {
        GSClientID: client.GSClientID,  // Use external GUID
        Active: includeArchived ? undefined : 'Yes',
      },
      _count: {
        id: true,
      },
    });

    // Aggregate by master service line
    const counts = aggregateByMasterServiceLine(taskCountsRaw, mappings);

    // Cache for 10 minutes
    await cache.set(cacheKey, counts, 600);

    logger.debug('Task counts fetched and cached', { GSClientID, includeArchived });
    return counts;
  } catch (error) {
    logger.error('Error fetching task counts by service line', { GSClientID, includeArchived, error });
    // Return zero counts on error
    return {
      TAX: 0,
      AUDIT: 0,
      ACCOUNTING: 0,
      ADVISORY: 0,
      QRM: 0,
      BUSINESS_DEV: 0,
      IT: 0,
      FINANCE: 0,
      HR: 0,
    };
  }
}

/**
 * Invalidate task counts cache for a client
 * Called when tasks are created, updated, or deleted
 * 
 * @param GSClientID - Client ID (GUID)
 */
export async function invalidateTaskCountsCache(GSClientID: string): Promise<void> {
  try {
    await cache.invalidate(`${CACHE_PREFIXES.TASK}counts:client:${GSClientID}`);
    logger.debug('Task counts cache invalidated', { GSClientID });
  } catch (error) {
    logger.error('Error invalidating task counts cache', { GSClientID, error });
  }
}

/**
 * Get total task count across all service lines for a client
 * 
 * @param GSClientID - Client ID (GUID)
 * @param includeArchived - Whether to include archived tasks
 * @returns Total task count
 */
export async function getTotalTaskCount(
  GSClientID: string,
  includeArchived: boolean = false
): Promise<number> {
  const counts = await getTaskCountsByServiceLine(GSClientID, includeArchived);
  return Object.values(counts).reduce((sum, count) => sum + count, 0);
}











