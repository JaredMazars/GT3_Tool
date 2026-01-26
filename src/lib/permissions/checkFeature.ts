/**
 * Feature Permission Checking
 * Simple, fast permission checks without database queries
 */

import { prisma } from '@/lib/db/prisma';
import { Feature } from './features';
import { roleHasFeature, getRoleFeatures } from './featurePermissions';
import { SystemRole, ServiceLineRole } from '@/types';
import { logger } from '@/lib/utils/logger';

/**
 * Check if a user has a specific feature
 * Uses in-memory role-to-feature mapping (no database queries for permission check)
 * 
 * @param userId - User ID to check
 * @param feature - Feature to check access for
 * @param serviceLine - Optional service line context (uses highest role if not provided)
 * @returns true if user has the feature
 */
export async function checkFeature(
  userId: string,
  feature: Feature,
  serviceLine?: string
): Promise<boolean> {
  try {
    // Get user's system role
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    if (!user) {
      return false;
    }

    // Check system role first (SYSTEM_ADMIN has all features)
    if (user.role === SystemRole.SYSTEM_ADMIN) {
      return true;
    }

    // If service line is provided, check service line role
    if (serviceLine) {
      // Check both masterCode and subServiceLineGroup to handle both cases:
      // - Master service lines (e.g., "TAX", "AUDIT")
      // - Sub-service line groups (e.g., "TCN", "TCM")
      const serviceLineUser = await prisma.serviceLineUser.findFirst({
        where: {
          userId,
          OR: [
            { masterCode: serviceLine },
            { subServiceLineGroup: serviceLine },
          ],
        },
        select: { role: true },
      });

      if (serviceLineUser) {
        return roleHasFeature(serviceLineUser.role as ServiceLineRole, feature);
      }
    }

    // Check user's highest service line role across all service lines
    const serviceLineUsers = await prisma.serviceLineUser.findMany({
      where: { userId },
      select: { role: true },
      orderBy: { createdAt: 'asc' },
    });

    if (serviceLineUsers.length > 0) {
      // Get the highest role
      const roles = serviceLineUsers.map(slu => slu.role as ServiceLineRole);
      const highestRole = getHighestServiceLineRole(roles);
      
      if (highestRole) {
        return roleHasFeature(highestRole, feature);
      }
    }

    // Fall back to system role
    return roleHasFeature(user.role as SystemRole, feature);
  } catch (error) {
    logger.error('Error checking feature', { userId, feature, error });
    return false;
  }
}

/**
 * Check if user has any of the specified features
 * @param userId - User ID to check
 * @param features - Array of features to check
 * @param serviceLine - Optional service line context
 * @returns true if user has at least one feature
 */
export async function checkAnyFeature(
  userId: string,
  features: Feature[],
  serviceLine?: string
): Promise<boolean> {
  const results = await Promise.all(
    features.map(feature => checkFeature(userId, feature, serviceLine))
  );
  return results.some(result => result);
}

/**
 * Check if user has all of the specified features
 * @param userId - User ID to check
 * @param features - Array of features to check
 * @param serviceLine - Optional service line context
 * @returns true if user has all features
 */
export async function checkAllFeatures(
  userId: string,
  features: Feature[],
  serviceLine?: string
): Promise<boolean> {
  const results = await Promise.all(
    features.map(feature => checkFeature(userId, feature, serviceLine))
  );
  return results.every(result => result);
}

/**
 * Get all features a user has access to
 * @param userId - User ID
 * @param serviceLine - Optional service line context
 * @returns Array of features the user can access
 */
export async function getUserFeatures(
  userId: string,
  serviceLine?: string
): Promise<Feature[]> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    if (!user) {
      return [];
    }

    // SYSTEM_ADMIN has all features
    if (user.role === SystemRole.SYSTEM_ADMIN) {
      return getRoleFeatures(SystemRole.SYSTEM_ADMIN);
    }

    // If service line is provided, get features for that service line role
    if (serviceLine) {
      // Check both masterCode and subServiceLineGroup to handle both cases:
      // - Master service lines (e.g., "TAX", "AUDIT")
      // - Sub-service line groups (e.g., "TCN", "TCM")
      const serviceLineUser = await prisma.serviceLineUser.findFirst({
        where: {
          userId,
          OR: [
            { masterCode: serviceLine },
            { subServiceLineGroup: serviceLine },
          ],
        },
        select: { role: true },
      });

      if (serviceLineUser) {
        return getRoleFeatures(serviceLineUser.role as ServiceLineRole);
      }
    }

    // Get features from highest service line role
    const serviceLineUsers = await prisma.serviceLineUser.findMany({
      where: { userId },
      select: { role: true },
    });

    if (serviceLineUsers.length > 0) {
      const roles = serviceLineUsers.map(slu => slu.role as ServiceLineRole);
      const highestRole = getHighestServiceLineRole(roles);
      
      if (highestRole) {
        return getRoleFeatures(highestRole);
      }
    }

    // Fall back to system role features
    return getRoleFeatures(user.role as SystemRole);
  } catch (error) {
    logger.error('Error getting user features', { userId, error });
    return [];
  }
}

/**
 * Get the highest service line role from a list of roles
 * Role hierarchy: ADMINISTRATOR > PARTNER > MANAGER > SUPERVISOR > USER > VIEWER
 */
function getHighestServiceLineRole(roles: ServiceLineRole[]): ServiceLineRole | null {
  const roleHierarchy: Record<ServiceLineRole, number> = {
    [ServiceLineRole.ADMINISTRATOR]: 6,
    [ServiceLineRole.PARTNER]: 5,
    [ServiceLineRole.MANAGER]: 4,
    [ServiceLineRole.SUPERVISOR]: 3,
    [ServiceLineRole.USER]: 2,
    [ServiceLineRole.VIEWER]: 1,
  };

  let highestRole: ServiceLineRole | null = null;
  let highestLevel = 0;

  for (const role of roles) {
    const level = roleHierarchy[role] || 0;
    if (level > highestLevel) {
      highestLevel = level;
      highestRole = role;
    }
  }

  return highestRole;
}

/**
 * Require a feature, throw error if user doesn't have it
 * @param userId - User ID
 * @param feature - Feature required
 * @param serviceLine - Optional service line context
 * @throws Error if user doesn't have the feature
 */
export async function requireFeature(
  userId: string,
  feature: Feature,
  serviceLine?: string
): Promise<void> {
  const hasFeature = await checkFeature(userId, feature, serviceLine);
  
  if (!hasFeature) {
    throw new Error(`Access denied: ${feature} feature required`);
  }
}




























