/**
 * Service Line Utilities
 * 
 * Utilities for working with service lines from the ServiceLineMaster table.
 */

import { prisma } from '@/lib/db/prisma';
import { logger } from './logger';

/**
 * Service Line Master interface
 * Represents the ServiceLineMaster database table structure
 */
export interface ServiceLineMaster {
  code: string;
  name: string;
  description: string | null;
  active: boolean;
  sortOrder: number;
}

/**
 * Get all active service lines
 * @returns Array of active service lines
 */
export async function getActiveServiceLines(): Promise<ServiceLineMaster[]> {
  try {
    return await prisma.serviceLineMaster.findMany({
      where: { active: true },
      select: {
        code: true,
        name: true,
        description: true,
        active: true,
        sortOrder: true,
      },
      orderBy: [
        { sortOrder: 'asc' },
        { code: 'asc' }, // Deterministic secondary sort
      ],
      take: 100, // Reasonable limit for service lines
    });
  } catch (error) {
    logger.error('Error fetching active service lines', { error });
    return [];
  }
}

/**
 * Get all service lines (including inactive)
 * @returns Array of all service lines
 */
export async function getAllServiceLines(): Promise<ServiceLineMaster[]> {
  try {
    return await prisma.serviceLineMaster.findMany({
      select: {
        code: true,
        name: true,
        description: true,
        active: true,
        sortOrder: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { sortOrder: 'asc' },
      // Bounded by actual service lines in system
      take: 100,
    });
  } catch (error) {
    logger.error('Error fetching all service lines', { error });
    return [];
  }
}

/**
 * Get service line by code
 * @param code - Service line code
 * @returns Service line or null
 */
export async function getServiceLineByCode(code: string): Promise<ServiceLineMaster | null> {
  try {
    return await prisma.serviceLineMaster.findUnique({
      where: { code },
    });
  } catch (error) {
    logger.error('Error fetching service line by code', { code, error });
    return null;
  }
}

/**
 * Check if service line exists and is active
 * @param code - Service line code
 * @returns true if service line exists and is active
 */
export async function isActiveServiceLine(code: string): Promise<boolean> {
  try {
    const serviceLine = await prisma.serviceLineMaster.findUnique({
      where: { code },
      select: { active: true },
    });
    return serviceLine?.active ?? false;
  } catch (error) {
    logger.error('Error checking if service line is active', { code, error });
    return false;
  }
}

/**
 * Get service line codes (for filtering)
 * @param activeOnly - If true, only return active service lines
 * @returns Array of service line codes
 */
export async function getServiceLineCodes(activeOnly: boolean = true): Promise<string[]> {
  try {
    const serviceLines = await prisma.serviceLineMaster.findMany({
      where: activeOnly ? { active: true } : undefined,
      orderBy: { sortOrder: 'asc' },
      select: { code: true },
    });
    return serviceLines.map(sl => sl.code);
  } catch (error) {
    logger.error('Error fetching service line codes', { error });
    return [];
  }
}

/**
 * Create a new service line
 * @param serviceLine - Service line data
 * @returns Created service line
 */
export async function createServiceLine(
  serviceLine: Omit<ServiceLineMaster, 'createdAt' | 'updatedAt'>
): Promise<ServiceLineMaster> {
  try {
    return await prisma.serviceLineMaster.create({
      data: {
        code: serviceLine.code,
        name: serviceLine.name,
        description: serviceLine.description,
        active: serviceLine.active,
        sortOrder: serviceLine.sortOrder,
        updatedAt: new Date(),
      },
    });
  } catch (error) {
    logger.error('Error creating service line', { serviceLine, error });
    throw new Error('Failed to create service line');
  }
}

/**
 * Update a service line
 * @param code - Service line code
 * @param data - Updated data
 * @returns Updated service line
 */
export async function updateServiceLine(
  code: string,
  data: Partial<Omit<ServiceLineMaster, 'code' | 'createdAt' | 'updatedAt'>>
): Promise<ServiceLineMaster> {
  try {
    return await prisma.serviceLineMaster.update({
      where: { code },
      data: {
        ...data,
      },
    });
  } catch (error) {
    logger.error('Error updating service line', { code, data, error });
    throw new Error('Failed to update service line');
  }
}

/**
 * Deactivate a service line
 * @param code - Service line code
 * @returns Updated service line
 */
export async function deactivateServiceLine(code: string): Promise<ServiceLineMaster> {
  return updateServiceLine(code, { active: false });
}

/**
 * Activate a service line
 * @param code - Service line code
 * @returns Updated service line
 */
export async function activateServiceLine(code: string): Promise<ServiceLineMaster> {
  return updateServiceLine(code, { active: true });
}

/**
 * Get service line display name from database
 * Looks up the service line by code and returns its display name
 * 
 * @param code - Service line code
 * @returns Formatted display name or code if not found
 * 
 * NOTE: This is an async DB lookup. For synchronous type-based formatting,
 * use formatServiceLineName() from @/lib/utils/serviceLineUtils instead.
 */
export async function getServiceLineDisplayName(code: string): Promise<string> {
  const serviceLine = await getServiceLineByCode(code);
  return serviceLine?.name || code;
}

/**
 * Validate service line code
 * @param code - Service line code to validate
 * @returns true if valid and active
 */
export async function validateServiceLineCode(code: string): Promise<boolean> {
  return isActiveServiceLine(code);
}

/**
 * Get service line options for forms/selects
 * @returns Array of { value, label } options
 */
export async function getServiceLineOptions(): Promise<Array<{ value: string; label: string }>> {
  const serviceLines = await getActiveServiceLines();
  return serviceLines.map(sl => ({
    value: sl.code,
    label: sl.name,
  }));
}



