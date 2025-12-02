/**
 * Service Line External Utilities
 * 
 * Utilities for working with external service lines and mapping them to master service lines.
 */

import { prisma } from '@/lib/db/prisma';
import { logger } from './logger';

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
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Map external service line code to master service line code
 * @param externalCode - External service line code
 * @returns Master service line code or null if not mapped
 */
export async function mapExternalToMaster(externalCode: string): Promise<string | null> {
  try {
    const external = await prisma.serviceLineExternal.findFirst({
      where: { ServLineCode: externalCode },
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
    return await prisma.serviceLineExternal.findMany({
      where: { masterCode },
      orderBy: { ServLineCode: 'asc' },
    });
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
      orderBy: { ServLineCode: 'asc' },
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
      orderBy: { ServLineCode: 'asc' },
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
      where.ServLineCode = { startsWith: externalCodePrefix };
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



