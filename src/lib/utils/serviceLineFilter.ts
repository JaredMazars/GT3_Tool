/**
 * Service Line Filter Utility
 * 
 * Centralized utility to ensure all queries properly filter by service line access.
 * Use this to prevent data leakage across service lines.
 */

import { prisma } from '@/lib/db/prisma';
import { isSystemAdmin } from './systemAdmin';
import { logger } from './logger';

/**
 * Get accessible service line codes for a user
 * @param userId - User ID
 * @returns Array of service line codes user can access
 */
export async function getAccessibleServiceLines(userId: string): Promise<string[]> {
  try {
    // Get user
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    if (!user) {
      return [];
    }

    // SYSTEM_ADMIN has access to all service lines
    if (isSystemAdmin(user)) {
      const allServiceLines = await prisma.serviceLineMaster.findMany({
        where: { active: true },
        select: { code: true },
      });
      return allServiceLines.map(sl => sl.code);
    }

    // Get user's service line assignments
    const serviceLineUsers = await prisma.serviceLineUser.findMany({
      where: { userId },
      select: { subServiceLineGroup: true },
    });

    return serviceLineUsers.map(slu => slu.subServiceLineGroup);
  } catch (error) {
    logger.error('Error getting accessible service lines', { userId, error });
    return [];
  }
}

/**
 * Create Prisma where clause for service line filtering
 * @param userId - User ID
 * @returns Prisma where clause object
 */
export async function getServiceLineWhereClause(userId: string): Promise<{ serviceLine: { in: string[] } }> {
  const accessibleServiceLines = await getAccessibleServiceLines(userId);
  return {
    serviceLine: { in: accessibleServiceLines },
  };
}

/**
 * Builder function for service line filtering - RECOMMENDED PATTERN
 * Creates a where clause that can be merged with other conditions
 * 
 * @param userId - User ID
 * @returns Promise<{ serviceLine: { in: string[] } }>
 * 
 * @example
 * // Simple usage
 * const where = await buildServiceLineFilter(userId);
 * const projects = await prisma.task.findMany({ where });
 * 
 * @example
 * // With additional conditions
 * const where = {
 *   ...await buildServiceLineFilter(userId),
 *   archived: false,
 *   status: 'ACTIVE',
 * };
 * const projects = await prisma.task.findMany({ where });
 */
export async function buildServiceLineFilter(userId: string): Promise<{ serviceLine: { in: string[] } }> {
  return getServiceLineWhereClause(userId);
}

/**
 * Verify user has access to a specific service line
 * @param userId - User ID
 * @param serviceLine - Service line to check
 * @returns true if user has access
 */
export async function verifyServiceLineAccess(
  userId: string,
  serviceLine: string
): Promise<boolean> {
  const accessibleServiceLines = await getAccessibleServiceLines(userId);
  return accessibleServiceLines.includes(serviceLine);
}

/**
 * Middleware helper: Add service line filter to Prisma query
 * 
 * Usage:
 * ```typescript
 * const projects = await withServiceLineFilter(userId, (serviceLines) =>
 *   prisma.task.findMany({
 *     where: {
 *       serviceLine: { in: serviceLines },
 *       // other conditions
 *     },
 *   })
 * );
 * ```
 */
export async function withServiceLineFilter<T>(
  userId: string,
  query: (serviceLines: string[]) => Promise<T>
): Promise<T> {
  const accessibleServiceLines = await getAccessibleServiceLines(userId);
  return query(accessibleServiceLines);
}

/**
 * Check if a resource belongs to user's accessible service lines
 * @param userId - User ID
 * @param resourceServiceLine - Service line of the resource
 * @returns true if user can access resource
 */
export async function canAccessResourceServiceLine(
  userId: string,
  resourceServiceLine: string
): Promise<boolean> {
  const accessibleServiceLines = await getAccessibleServiceLines(userId);
  return accessibleServiceLines.includes(resourceServiceLine);
}

/**
 * Filter array of resources by service line access
 * @param userId - User ID
 * @param resources - Array of resources with serviceLine property
 * @returns Filtered array
 */
export async function filterByServiceLineAccess<T extends { serviceLine: string }>(
  userId: string,
  resources: T[]
): Promise<T[]> {
  const accessibleServiceLines = await getAccessibleServiceLines(userId);
  return resources.filter(resource => 
    accessibleServiceLines.includes(resource.serviceLine)
  );
}

/**
 * Validate and throw error if user doesn't have service line access
 * @param userId - User ID
 * @param serviceLine - Service line to validate
 * @throws Error if user doesn't have access
 */
export async function requireServiceLineAccess(
  userId: string,
  serviceLine: string
): Promise<void> {
  const hasAccess = await verifyServiceLineAccess(userId, serviceLine);
  
  if (!hasAccess) {
    throw new Error(`Access denied: No access to ${serviceLine} service line`);
  }
}

/**
 * Get service line filter summary for logging/debugging
 * @param userId - User ID
 * @returns Object with filter details
 */
export async function getServiceLineFilterSummary(userId: string): Promise<{
  userId: string;
  isSystemAdmin: boolean;
  accessibleServiceLines: string[];
  count: number;
}> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });

  const accessibleServiceLines = await getAccessibleServiceLines(userId);

  return {
    userId,
    isSystemAdmin: user ? isSystemAdmin(user) : false,
    accessibleServiceLines,
    count: accessibleServiceLines.length,
  };
}



