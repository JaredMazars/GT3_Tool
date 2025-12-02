/**
 * Permission Caching Layer
 * 
 * Caches user permissions to reduce database load and improve performance.
 * Permissions are cached for 5 minutes and invalidated on role/permission changes.
 * 
 * This implementation uses distributed Redis cache with in-memory fallback.
 */

import { prisma } from '@/lib/db/prisma';
import { logger } from '@/lib/utils/logger';
import { PermissionAction } from '@/lib/services/permissions/permissionService';
import { cache } from '@/lib/services/cache/CacheService';

/**
 * Cache configuration
 */
const CACHE_TTL = 5 * 60; // 5 minutes in seconds

/**
 * Generate cache key for permission check
 */
function getPermissionCacheKey(
  userId: string,
  resourceKey: string,
  action: PermissionAction
): string {
  return `perm:${userId}:${resourceKey}:${action}`;
}

/**
 * Generate cache key for user permissions
 */
function getUserPermissionsCacheKey(userId: string): string {
  return `user_perms:${userId}`;
}

/**
 * Generate cache key for service line access
 */
function getServiceLineCacheKey(userId: string): string {
  return `service_lines:${userId}`;
}

/**
 * Cached permission check
 * 
 * Checks cache first, falls back to database if not cached.
 * 
 * @param userId - User ID
 * @param resourceKey - Resource key
 * @param action - Action to check
 * @returns true if user has permission
 */
export async function checkUserPermissionCached(
  userId: string,
  resourceKey: string,
  action: PermissionAction
): Promise<boolean> {
  const cacheKey = getPermissionCacheKey(userId, resourceKey, action);
  
  // Check cache first
  const cached = await cache.get<boolean>(cacheKey);
  if (cached !== null) {
    return cached;
  }

  // Cache miss - fetch from database
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    if (!user) {
      await cache.set(cacheKey, false, CACHE_TTL);
      return false;
    }

    // SYSTEM_ADMIN bypasses all permission checks
    if (user.role === 'SYSTEM_ADMIN') {
      await cache.set(cacheKey, true, CACHE_TTL);
      return true;
    }

    // Find the permission by resource key
    const permission = await prisma.permission.findFirst({
      where: { resourceKey },
    });

    if (!permission) {
      await cache.set(cacheKey, false, CACHE_TTL);
      return false;
    }

    // Parse available actions
    const availableActions = JSON.parse(permission.availableActions) as PermissionAction[];
    
    if (!availableActions.includes(action)) {
      await cache.set(cacheKey, false, CACHE_TTL);
      return false;
    }

    // Get role permission
    const rolePermission = await prisma.rolePermission.findUnique({
      where: {
        role_permissionId: {
          role: user.role,
          permissionId: permission.id,
        },
      },
    });

    if (!rolePermission) {
      await cache.set(cacheKey, false, CACHE_TTL);
      return false;
    }

    // Parse allowed actions for this role
    const allowedActions = JSON.parse(rolePermission.allowedActions) as PermissionAction[];
    const hasPermission = allowedActions.includes(action);

    // Cache the result
    await cache.set(cacheKey, hasPermission, CACHE_TTL);
    return hasPermission;
  } catch (error) {
    logger.error('Error checking user permission (cached)', { userId, resourceKey, action, error });
    return false;
  }
}

/**
 * Get cached user permissions
 * 
 * Returns all permissions for a user.
 * Useful for frontend to check multiple permissions at once.
 * 
 * @param userId - User ID
 * @returns Array of permission matrix entries
 */
export async function getUserPermissionsCached(userId: string): Promise<any[]> {
  const cacheKey = getUserPermissionsCacheKey(userId);
  
  // Check cache
  const cached = await cache.get<any[]>(cacheKey);
  if (cached !== null) {
    return cached;
  }

  // Cache miss - fetch from database
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    if (!user) {
      await cache.set(cacheKey, [], CACHE_TTL);
      return [];
    }

    // SYSTEM_ADMIN has all permissions
    if (user.role === 'SYSTEM_ADMIN') {
      const allPermissions = await prisma.permission.findMany({
        orderBy: [
          { resourceType: 'asc' },
          { displayName: 'asc' },
        ],
      });

      const result = allPermissions.map(permission => ({
        permission: {
          id: permission.id,
          resourceType: permission.resourceType,
          resourceKey: permission.resourceKey,
          displayName: permission.displayName,
          description: permission.description,
          availableActions: JSON.parse(permission.availableActions),
        },
        allowedActions: JSON.parse(permission.availableActions),
      }));

      await cache.set(cacheKey, result, CACHE_TTL);
      return result;
    }

    // Get role permissions
    const rolePermissions = await prisma.rolePermission.findMany({
      where: { role: user.role },
      include: {
        Permission: true,
      },
    });

    const result = rolePermissions.map(rp => ({
      permission: {
        id: rp.Permission.id,
        resourceType: rp.Permission.resourceType,
        resourceKey: rp.Permission.resourceKey,
        displayName: rp.Permission.displayName,
        description: rp.Permission.description,
        availableActions: JSON.parse(rp.Permission.availableActions),
      },
      allowedActions: JSON.parse(rp.allowedActions),
    }));

    await cache.set(cacheKey, result, CACHE_TTL);
    return result;
  } catch (error) {
    logger.error('Error getting user permissions (cached)', { userId, error });
    return [];
  }
}

/**
 * Get cached service lines for user
 * 
 * @param userId - User ID
 * @returns Array of service lines user has access to
 */
export async function getUserServiceLinesCached(userId: string): Promise<string[]> {
  const cacheKey = getServiceLineCacheKey(userId);
  
  // Check cache
  const cached = await cache.get<string[]>(cacheKey);
  if (cached !== null) {
    return cached;
  }

  // Cache miss - fetch from database
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    if (!user) {
      await cache.set(cacheKey, [], CACHE_TTL);
      return [];
    }

    // SYSTEM_ADMIN has access to all service lines
    if (user.role === 'SYSTEM_ADMIN') {
      const allServiceLines = await prisma.serviceLineMaster.findMany({
        where: { active: true },
        select: { code: true },
      });
      
      const result = allServiceLines.map(sl => sl.code);
      await cache.set(cacheKey, result, CACHE_TTL);
      return result;
    }

    // Get user's service line assignments
    const serviceLineUsers = await prisma.serviceLineUser.findMany({
      where: { userId },
      select: { serviceLine: true },
    });

    const result = serviceLineUsers.map(slu => slu.serviceLine);
    await cache.set(cacheKey, result, CACHE_TTL);
    return result;
  } catch (error) {
    logger.error('Error getting user service lines (cached)', { userId, error });
    return [];
  }
}

/**
 * Invalidate user's permission cache
 * 
 * Call this when user's role or permissions change.
 * 
 * @param userId - User ID
 */
export async function invalidateUserPermissions(userId: string): Promise<void> {
  // Clear all permission checks for this user
  await cache.invalidate(`perm:${userId}:`);
  
  // Clear user permissions cache
  await cache.delete(getUserPermissionsCacheKey(userId));
  
  // Clear service line cache
  await cache.delete(getServiceLineCacheKey(userId));
  
  logger.info('Invalidated permission cache for user', { userId });
}

/**
 * Invalidate permission cache for a role
 * 
 * Call this when role permissions change.
 * 
 * @param role - Role name
 */
export async function invalidateRolePermissions(role: string): Promise<void> {
  // This is expensive but necessary - clear all cached permissions
  // In production, consider maintaining a role->users mapping
  await cache.clear();
  
  logger.info('Invalidated all permission cache due to role change', { role });
}

/**
 * Invalidate service line cache for a user
 * 
 * Call this when user's service line assignments change.
 * 
 * @param userId - User ID
 */
export async function invalidateUserServiceLines(userId: string): Promise<void> {
  await cache.delete(getServiceLineCacheKey(userId));
  
  logger.info('Invalidated service line cache for user', { userId });
}

/**
 * Clear all caches
 * 
 * Use sparingly - only for maintenance or critical updates.
 */
export async function clearAllCaches(): Promise<void> {
  await cache.clear();
  logger.warn('Cleared all permission caches');
}

/**
 * Preload user permissions into cache
 * 
 * Useful for warming up cache for active users.
 * 
 * @param userId - User ID
 */
export async function preloadUserPermissions(userId: string): Promise<void> {
  await Promise.all([
    getUserPermissionsCached(userId),
    getUserServiceLinesCached(userId),
  ]);
  
  logger.debug('Preloaded permissions for user', { userId });
}
