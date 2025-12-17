/**
 * Service Line External Utilities
 * 
 * Utilities for working with external service lines and mapping them to master service lines.
 */

import { prisma } from '@/lib/db/prisma';
import { logger } from './logger';
import { cache, CACHE_PREFIXES } from '@/lib/services/cache/CacheService';

/**
 * External Service Line interface
 */
export interface ServiceLineExternal {
  id: number;
  ServLineCode: string | null;
  ServLineDesc: string | null;
  GLPrefix: string | null;
  SLGroup: string | null;
  masterCode: string | null;
  SubServlineGroupCode: string | null;
  SubServlineGroupDesc: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Map external service line code to master service line code
 * @param externalCode - External service line code (SubServlineGroupCode)
 * @returns Master service line code or null if not mapped
 */
export async function mapExternalToMaster(externalCode: string): Promise<string | null> {
  try {
    const external = await prisma.serviceLineExternal.findFirst({
      where: { SubServlineGroupCode: externalCode },
      select: { masterCode: true },
    });
    return external?.masterCode || null;
  } catch (error) {
    logger.error('Error mapping external service line to master', { externalCode, error });
    return null;
  }
}

/**
 * Get all external service lines mapped to a master code
 * @param masterCode - Master service line code
 * @returns Array of external service lines
 */
export async function getExternalServiceLinesByMaster(
  masterCode: string
): Promise<ServiceLineExternal[]> {
  try {
    // Try cache first
    const cacheKey = `${CACHE_PREFIXES.SERVICE_LINE}master:${masterCode}`;
    const cached = await cache.get<ServiceLineExternal[]>(cacheKey);
    if (cached) {
      return cached;
    }

    // Fetch from database - only get records with complete data for task creation
    const result = await prisma.serviceLineExternal.findMany({
      where: { 
        masterCode,
        ServLineCode: { not: null },
        ServLineDesc: { not: null },
        SubServlineGroupCode: { not: null },
      },
      orderBy: { SubServlineGroupCode: 'asc' },
    });

    // Cache for 10 minutes (600 seconds)
    await cache.set(cacheKey, result, 600);
    
    return result;
  } catch (error) {
    logger.error('Error fetching external service lines by master', { masterCode, error });
    return [];
  }
}

/**
 * Get all external service lines
 * @returns Array of all external service lines
 */
export async function getAllExternalServiceLines(): Promise<ServiceLineExternal[]> {
  try {
    return await prisma.serviceLineExternal.findMany({
      orderBy: { SubServlineGroupCode: 'asc' },
    });
  } catch (error) {
    logger.error('Error fetching all external service lines', { error });
    return [];
  }
}

/**
 * Get unmapped external service lines (no master code assigned)
 * @returns Array of external service lines without master code
 */
export async function getUnmappedExternalServiceLines(): Promise<ServiceLineExternal[]> {
  try {
    return await prisma.serviceLineExternal.findMany({
      where: { masterCode: null },
      orderBy: { SubServlineGroupCode: 'asc' },
    });
  } catch (error) {
    logger.error('Error fetching unmapped external service lines', { error });
    return [];
  }
}

/**
 * Map an external service line to a master code
 * @param externalId - External service line ID
 * @param masterCode - Master service line code to map to
 * @returns Updated external service line
 */
export async function setExternalMapping(
  externalId: number,
  masterCode: string | null
): Promise<ServiceLineExternal> {
  try {
    return await prisma.serviceLineExternal.update({
      where: { id: externalId },
      data: {
        masterCode,
      },
    });
  } catch (error) {
    logger.error('Error setting external service line mapping', { externalId, masterCode, error });
    throw new Error('Failed to set external service line mapping');
  }
}

/**
 * Sync external service lines from external database
 * This is a placeholder for when external DB sync is implemented
 */
export async function syncExternalServiceLines(): Promise<void> {
  try {
    logger.info('External service line sync initiated');
    
    // TODO: Implement sync logic when external DB connection is ready
    // This would:
    // 1. Fetch service lines from external DB
    // 2. Upsert them into ServiceLineExternal table
    // 3. Attempt to auto-map based on naming conventions or existing mappings
    
    logger.info('External service line sync completed');
  } catch (error) {
    logger.error('Error syncing external service lines', { error });
    throw new Error('Failed to sync external service lines');
  }
}

/**
 * Get mapping statistics
 * @returns Mapping statistics object
 */
export async function getMappingStatistics(): Promise<{
  total: number;
  mapped: number;
  unmapped: number;
  mappingsByMaster: Record<string, number>;
}> {
  try {
    const allExternal = await getAllExternalServiceLines();
    const mapped = allExternal.filter(e => e.masterCode !== null);
    const unmapped = allExternal.filter(e => e.masterCode === null);
    
    // Count mappings by master code
    const mappingsByMaster: Record<string, number> = {};
    for (const external of mapped) {
      if (external.masterCode) {
        mappingsByMaster[external.masterCode] = 
          (mappingsByMaster[external.masterCode] || 0) + 1;
      }
    }
    
    return {
      total: allExternal.length,
      mapped: mapped.length,
      unmapped: unmapped.length,
      mappingsByMaster,
    };
  } catch (error) {
    logger.error('Error getting mapping statistics', { error });
    return {
      total: 0,
      mapped: 0,
      unmapped: 0,
      mappingsByMaster: {},
    };
  }
}

/**
 * Bulk map external service lines based on naming pattern
 * @param pattern - Mapping pattern configuration
 */
export async function bulkMapByPattern(pattern: {
  externalCodePrefix?: string;
  masterCode: string;
}): Promise<number> {
  try {
    const { externalCodePrefix, masterCode } = pattern;
    
    const where: any = { masterCode: null };
    if (externalCodePrefix) {
      where.SubServlineGroupCode = { startsWith: externalCodePrefix };
    }
    
    const result = await prisma.serviceLineExternal.updateMany({
      where,
      data: {
        masterCode,
      },
    });
    
    logger.info('Bulk mapped external service lines', { 
      count: result.count, 
      masterCode,
      externalCodePrefix,
    });
    
    return result.count;
  } catch (error) {
    logger.error('Error bulk mapping external service lines', { pattern, error });
    throw new Error('Failed to bulk map external service lines');
  }
}

/**
 * Get unique SubServLineGroups for a master service line with task counts
 * @param masterCode - Master service line code (e.g., 'TAX', 'ACCOUNTING')
 * @returns Array of SubServiceLineGroups with counts
 */
export async function getSubServiceLineGroupsByMaster(
  masterCode: string
): Promise<Array<{
  code: string;
  description: string;
  activeTasks: number;
  totalTasks: number;
  masterCode: string;
}>> {
  try {
    // Get unique SubServLineGroups for this master code
    const subGroups = await prisma.serviceLineExternal.findMany({
      where: {
        masterCode,
        SubServlineGroupCode: { not: null },
      },
      select: {
        SubServlineGroupCode: true,
        SubServlineGroupDesc: true,
      },
      distinct: ['SubServlineGroupCode'],
      orderBy: { SubServlineGroupCode: 'asc' },
    });

    // For each SubServLineGroup, count tasks
    const groupsWithCounts = await Promise.all(
      subGroups.map(async (group) => {
        if (!group.SubServlineGroupCode) {
          return null;
        }

        // Get all ServLineCodes for this SubServLineGroup
        const servLineCodes = await prisma.serviceLineExternal.findMany({
          where: {
            SubServlineGroupCode: group.SubServlineGroupCode,
            masterCode,
          },
          select: { ServLineCode: true },
        });

        const codes = servLineCodes
          .map(s => s.ServLineCode)
          .filter((code): code is string => code !== null);

        if (codes.length === 0) {
          return {
            code: group.SubServlineGroupCode,
            description: group.SubServlineGroupDesc || '',
            activeTasks: 0,
            totalTasks: 0,
            masterCode,
          };
        }

        // Count tasks with matching ServLineCodes
        const [activeCount, totalCount] = await Promise.all([
          prisma.task.count({
            where: {
              Active: 'Yes',
              ServLineCode: { in: codes },
            },
          }),
          prisma.task.count({
            where: {
              ServLineCode: { in: codes },
            },
          }),
        ]);

        return {
          code: group.SubServlineGroupCode,
          description: group.SubServlineGroupDesc || '',
          activeTasks: activeCount,
          totalTasks: totalCount,
          masterCode,
        };
      })
    );

    return groupsWithCounts.filter((g): g is NonNullable<typeof g> => g !== null);
  } catch (error) {
    logger.error('Error fetching SubServLineGroups by master', { masterCode, error });
    return [];
  }
}

/**
 * Get ServLineCodes for a specific SubServLineGroup
 * @param subGroupCode - SubServLineGroup code
 * @param masterCode - Optional master code for additional filtering
 * @returns Array of ServLineCodes
 */
export async function getServLineCodesBySubGroup(
  subGroupCode: string,
  masterCode?: string
): Promise<string[]> {
  try {
    // Try cache first
    const cacheKey = `${CACHE_PREFIXES.SERVICE_LINE}subgroup:${subGroupCode}:${masterCode || 'all'}`;
    const cached = await cache.get<string[]>(cacheKey);
    if (cached) {
      return cached;
    }

    const where: any = {
      SubServlineGroupCode: subGroupCode,
    };
    
    if (masterCode) {
      where.masterCode = masterCode;
    }

    const results = await prisma.serviceLineExternal.findMany({
      where,
      select: { ServLineCode: true },
    });

    const codes = results
      .map(r => r.ServLineCode)
      .filter((code): code is string => code !== null);

    // Cache for 10 minutes (600 seconds)
    await cache.set(cacheKey, codes, 600);
    
    return codes;
  } catch (error) {
    logger.error('Error fetching ServLineCodes by SubServLineGroup', { subGroupCode, masterCode, error });
    return [];
  }
}

/**
 * Get external service lines for a specific SubServLineGroup
 * @param subGroupCode - SubServLineGroup code
 * @param masterCode - Optional master code for additional filtering
 * @returns Array of external service lines
 */
export async function getExternalServiceLinesBySubGroup(
  subGroupCode: string,
  masterCode?: string
): Promise<ServiceLineExternal[]> {
  try {
    // Normalize input for consistent matching
    const normalizedSubGroupCode = subGroupCode.toUpperCase().trim();
    const normalizedMasterCode = masterCode?.toUpperCase().trim();
    
    const where: any = {
      SubServlineGroupCode: normalizedSubGroupCode,
      ServLineCode: { not: null },
      ServLineDesc: { not: null },
    };
    
    if (normalizedMasterCode) {
      where.masterCode = normalizedMasterCode;
    }

    const results = await prisma.serviceLineExternal.findMany({
      where,
      orderBy: { ServLineCode: 'asc' },
    });

    return results;
  } catch (error) {
    logger.error('Error fetching external service lines by SubServLineGroup', { subGroupCode, masterCode, error });
    return [];
  }
}

/**
 * Check if a project belongs to a SubServLineGroup
 * @param projectId - Project ID
 * @param subGroupCode - SubServLineGroup code
 * @param masterCode - Optional master code for additional filtering
 * @returns True if project has tasks in this SubServLineGroup
 */
export async function isProjectInSubGroup(
  taskId: number,
  subGroupCode: string,
  masterCode?: string
): Promise<boolean> {
  try {
    // Get ServLineCodes for this SubServLineGroup
    const servLineCodes = await getServLineCodesBySubGroup(subGroupCode, masterCode);
    
    if (servLineCodes.length === 0) {
      return false;
    }

    // Check if project has any tasks with these ServLineCodes
    const taskCount = await prisma.task.count({
      where: {
        id: taskId,
        ServLineCode: { in: servLineCodes },
      },
    });

    return taskCount > 0;
  } catch (error) {
    logger.error('Error checking if project is in SubServLineGroup', { 
      taskId, 
      subGroupCode, 
      masterCode, 
      error 
    });
    return false;
  }
}




