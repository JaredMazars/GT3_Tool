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
      select: {
        id: true,
        ServLineCode: true,
        ServLineDesc: true,
        GLPrefix: true,
        SLGroup: true,
        masterCode: true,
        SubServlineGroupCode: true,
        SubServlineGroupDesc: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { SubServlineGroupCode: 'asc' },
      // Bounded by actual service lines in system
      take: 500,
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
      select: {
        id: true,
        ServLineCode: true,
        ServLineDesc: true,
        GLPrefix: true,
        SLGroup: true,
        masterCode: true,
        SubServlineGroupCode: true,
        SubServlineGroupDesc: true,
        createdAt: true,
        updatedAt: true,
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
 * 
 * OPTIMIZED: Uses batched queries instead of N+1 pattern
 * CACHED: Results are cached for 10 minutes to improve performance
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
    // Check cache first for performance
    const cacheKey = `${CACHE_PREFIXES.SERVICE_LINE}subgroups:${masterCode}`;
    const cached = await cache.get<Array<{
      code: string;
      description: string;
      activeTasks: number;
      totalTasks: number;
      masterCode: string;
    }>>(cacheKey);
    if (cached) {
      return cached;
    }

    // Step 1: Get all SubServLineGroups with their ServLineCodes in a single query
    const allMappings = await prisma.serviceLineExternal.findMany({
      where: {
        masterCode,
        SubServlineGroupCode: { not: null },
      },
      select: {
        SubServlineGroupCode: true,
        SubServlineGroupDesc: true,
        ServLineCode: true,
      },
      orderBy: { SubServlineGroupCode: 'asc' },
    });

    if (allMappings.length === 0) {
      return [];
    }

    // Step 2: Build maps for SubServLineGroup -> description and SubServLineGroup -> ServLineCodes
    const subGroupDescriptions = new Map<string, string>();
    const subGroupToServLineCodes = new Map<string, string[]>();
    const allServLineCodes: string[] = [];

    for (const mapping of allMappings) {
      if (!mapping.SubServlineGroupCode) continue;

      // Store description (first one wins)
      if (!subGroupDescriptions.has(mapping.SubServlineGroupCode)) {
        subGroupDescriptions.set(mapping.SubServlineGroupCode, mapping.SubServlineGroupDesc || '');
      }

      // Collect ServLineCodes per SubServLineGroup
      if (mapping.ServLineCode) {
        const existing = subGroupToServLineCodes.get(mapping.SubServlineGroupCode) || [];
        existing.push(mapping.ServLineCode);
        subGroupToServLineCodes.set(mapping.SubServlineGroupCode, existing);
        allServLineCodes.push(mapping.ServLineCode);
      }
    }

    // Get unique SubServLineGroup codes (preserving order)
    const uniqueSubGroupCodes = Array.from(subGroupDescriptions.keys());

    if (allServLineCodes.length === 0) {
      // No ServLineCodes means no tasks to count
      return uniqueSubGroupCodes.map(code => ({
        code,
        description: subGroupDescriptions.get(code) || '',
        activeTasks: 0,
        totalTasks: 0,
        masterCode,
      }));
    }

    // Step 3: Get task counts for ALL ServLineCodes in a single aggregated query
    const taskCounts = await prisma.task.groupBy({
      by: ['ServLineCode', 'Active'],
      where: {
        ServLineCode: { in: allServLineCodes },
      },
      _count: true,
    });

    // Step 4: Build a map of ServLineCode -> { total, active }
    const servLineCodeCounts = new Map<string, { total: number; active: number }>();
    for (const item of taskCounts) {
      if (!item.ServLineCode) continue;
      const existing = servLineCodeCounts.get(item.ServLineCode) || { total: 0, active: 0 };
      existing.total += item._count;
      if (item.Active === 'Yes') {
        existing.active += item._count;
      }
      servLineCodeCounts.set(item.ServLineCode, existing);
    }

    // Step 5: Aggregate counts by SubServLineGroup
    const result = uniqueSubGroupCodes.map(subGroupCode => {
      const servLineCodes = subGroupToServLineCodes.get(subGroupCode) || [];
      let totalTasks = 0;
      let activeTasks = 0;

      for (const code of servLineCodes) {
        const counts = servLineCodeCounts.get(code);
        if (counts) {
          totalTasks += counts.total;
          activeTasks += counts.active;
        }
      }

      return {
        code: subGroupCode,
        description: subGroupDescriptions.get(subGroupCode) || '',
        activeTasks,
        totalTasks,
        masterCode,
      };
    });

    // Cache result (10 minutes = 600 seconds)
    await cache.set(cacheKey, result, 600);

    return result;
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




