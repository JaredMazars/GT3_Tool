/**
 * Permission Caching Layer
 * 
 * Caches user permissions to reduce database load and improve performance.
 * Permissions are cached for 5 minutes and invalidated on role/permission changes.
 * 
 * This implementation uses in-memory caching with optional Redis support.
 */

import { prisma } from '@/lib/db/prisma';
import { logger } from '@/lib/utils/logger';
import { PermissionAction } from '@/lib/services/permissions/permissionService';

/**
 * Cache configuration
 */
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes in milliseconds
const MAX_CACHE_SIZE = 10000; // Maximum cached entries

/**
 * Cache entry
 */
interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

/**
 * In-memory cache storage
 */
class MemoryCache {
  private cache: Map<string, CacheEntry<any>> = new Map();

  set<T>(key: string, value: T, ttl: number = CACHE_TTL): void {
    // Prevent unbounded cache growth
    if (this.cache.size >= MAX_CACHE_SIZE) {
      // Clear expired entries first
      this.clearExpired();
      
      // If still too large, clear oldest entries
      if (this.cache.size >= MAX_CACHE_SIZE) {
        const keysToDelete = Array.from(this.cache.keys()).slice(0, 1000);
        keysToDelete.forEach(k => this.cache.delete(k));
      }
    }

    this.cache.set(key, {
      value,
      expiresAt: Date.now() + ttl,
    });
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return null;
    }

    // Check expiration
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return entry.value as T;
  }

  delete(key: string): void {
    this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  clearExpired(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
      }
    }
  }

  deletePattern(pattern: string): void {
    const regex = new RegExp(pattern);
    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key);
      }
    }
  }

  size(): number {
    return this.cache.size;
  }
}

// Global cache instance
const cache = new MemoryCache();

// Periodic cleanup
setInterval(() => cache.clearExpired(), 60 * 1000); // Every minute

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
  const cached = cache.get<boolean>(cacheKey);
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
      cache.set(cacheKey, false, CACHE_TTL);
      return false;
    }

    // SYSTEM_ADMIN bypasses all permission checks
    if (user.role === 'SYSTEM_ADMIN') {
      cache.set(cacheKey, true, CACHE_TTL);
      return true;
    }

    // Find the permission by resource key
    const permission = await prisma.permission.findFirst({
      where: { resourceKey },
    });

    if (!permission) {
      cache.set(cacheKey, false, CACHE_TTL);
      return false;
    }

    // Parse available actions
    const availableActions = JSON.parse(permission.availableActions) as PermissionAction[];
    
    if (!availableActions.includes(action)) {
      cache.set(cacheKey, false, CACHE_TTL);
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
      cache.set(cacheKey, false, CACHE_TTL);
      return false;
    }

    // Parse allowed actions for this role
    const allowedActions = JSON.parse(rolePermission.allowedActions) as PermissionAction[];
    const hasPermission = allowedActions.includes(action);

    // Cache the result
    cache.set(cacheKey, hasPermission, CACHE_TTL);
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
  const cached = cache.get<any[]>(cacheKey);
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
      cache.set(cacheKey, [], CACHE_TTL);
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

      cache.set(cacheKey, result, CACHE_TTL);
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

    cache.set(cacheKey, result, CACHE_TTL);
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
  const cached = cache.get<string[]>(cacheKey);
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
      cache.set(cacheKey, [], CACHE_TTL);
      return [];
    }

    // SYSTEM_ADMIN has access to all service lines
    if (user.role === 'SYSTEM_ADMIN') {
      const allServiceLines = await prisma.serviceLineMaster.findMany({
        where: { active: true },
        select: { code: true },
      });
      
      const result = allServiceLines.map(sl => sl.code);
      cache.set(cacheKey, result, CACHE_TTL);
      return result;
    }

    // Get user's service line assignments
    const serviceLineUsers = await prisma.serviceLineUser.findMany({
      where: { userId },
      select: { serviceLine: true },
    });

    const result = serviceLineUsers.map(slu => slu.serviceLine);
    cache.set(cacheKey, result, CACHE_TTL);
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
export function invalidateUserPermissions(userId: string): void {
  // Clear all permission checks for this user
  cache.deletePattern(`^perm:${userId}:`);
  
  // Clear user permissions cache
  cache.delete(getUserPermissionsCacheKey(userId));
  
  // Clear service line cache
  cache.delete(getServiceLineCacheKey(userId));
  
  logger.info('Invalidated permission cache for user', { userId });
}

/**
 * Invalidate permission cache for a role
 * 
 * Call this when role permissions change.
 * 
 * @param role - Role name
 */
export function invalidateRolePermissions(role: string): void {
  // This is expensive but necessary - clear all cached permissions
  // In production, consider maintaining a role->users mapping
  cache.clear();
  
  logger.info('Invalidated all permission cache due to role change', { role });
}

/**
 * Invalidate service line cache for a user
 * 
 * Call this when user's service line assignments change.
 * 
 * @param userId - User ID
 */
export function invalidateUserServiceLines(userId: string): void {
  cache.delete(getServiceLineCacheKey(userId));
  
  logger.info('Invalidated service line cache for user', { userId });
}

/**
 * Clear all caches
 * 
 * Use sparingly - only for maintenance or critical updates.
 */
export function clearAllCaches(): void {
  cache.clear();
  logger.warn('Cleared all permission caches');
}

/**
 * Get cache statistics
 * 
 * @returns Cache stats
 */
export function getCacheStats(): {
  size: number;
  maxSize: number;
  ttl: number;
} {
  return {
    size: cache.size(),
    maxSize: MAX_CACHE_SIZE,
    ttl: CACHE_TTL,
  };
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
