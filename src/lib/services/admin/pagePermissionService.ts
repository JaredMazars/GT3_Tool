/**
 * Page Permission Service
 * Business logic for managing page permissions
 */

import { prisma } from '@/lib/db/prisma';
import { PageAccessLevel, PagePermission, PageRegistryEntry } from '@/types/pagePermissions';
import { clearPagePermissionCache, clearMultiplePagePermissions } from '@/lib/cache/pagePermissionCache';
import { discoverPages, getConventionBasedPermission } from './pageDiscovery';
import { AppError, ErrorCodes } from '@/lib/utils/errorHandler';

/**
 * Sync page registry with discovered pages
 * Updates registry with all found pages and marks missing ones as inactive
 */
export async function syncPageRegistry(): Promise<{
  discovered: number;
  updated: number;
  deactivated: number;
}> {
  const discoveredPages = await discoverPages();
  const now = new Date();
  const oneMinuteAgo = new Date(now.getTime() - 60000);
  
  let discovered = 0;
  let updated = 0;
  
  // Upsert all discovered pages
  for (const page of discoveredPages) {
    const result = await prisma.pageRegistry.upsert({
      where: { pathname: page.pathname },
      update: {
        lastSeen: now,
        active: true,
        category: page.category,
      },
      create: {
        pathname: page.pathname,
        pageTitle: page.pageTitle,
        category: page.category,
        discovered: true,
        active: true,
        lastSeen: now,
        updatedAt: now,
      },
      select: {
        createdAt: true,
        updatedAt: true,
      },
    });

    if (result.createdAt.getTime() === result.updatedAt.getTime()) {
      discovered++;
    } else {
      updated++;
    }
  }
  
  // Mark pages not seen in this scan as potentially deleted
  const deactivateResult = await prisma.pageRegistry.updateMany({
    where: {
      lastSeen: { lt: oneMinuteAgo },
      active: true,
    },
    data: { active: false },
  });
  
  return {
    discovered,
    updated,
    deactivated: deactivateResult.count,
  };
}

/**
 * Get all page registry entries
 */
export async function getPageRegistry(filters?: {
  active?: boolean;
  category?: string;
}): Promise<PageRegistryEntry[]> {
  return await prisma.pageRegistry.findMany({
    where: {
      active: filters?.active,
      category: filters?.category,
    },
    select: {
      id: true,
      pathname: true,
      pageTitle: true,
      category: true,
      discovered: true,
      active: true,
      lastSeen: true,
      createdAt: true,
      updatedAt: true,
    },
    orderBy: [
      { category: 'asc' },
      { pathname: 'asc' },
    ],
    // Registry is bounded by number of actual pages in app
    take: 1000,
  });
}

/**
 * Get all page permissions from database
 */
export async function getAllPagePermissions(filters?: {
  pathname?: string;
  role?: string;
  active?: boolean;
  take?: number;
}): Promise<PagePermission[]> {
  const results = await prisma.pagePermission.findMany({
    where: {
      pathname: filters?.pathname ? { contains: filters.pathname } : undefined,
      role: filters?.role,
      active: filters?.active,
    },
    select: {
      id: true,
      pathname: true,
      role: true,
      accessLevel: true,
      description: true,
      active: true,
      createdAt: true,
      updatedAt: true,
      createdBy: true,
    },
    orderBy: [
      { pathname: 'asc' },
      { role: 'asc' },
    ],
    take: filters?.take ?? 500,
  });
  return results as PagePermission[];
}

/**
 * Get page permissions for a specific pathname (all roles)
 */
export async function getPagePermissionsByPath(
  pathname: string
): Promise<PagePermission[]> {
  const results = await prisma.pagePermission.findMany({
    where: {
      pathname,
      active: true,
    },
    select: {
      id: true,
      pathname: true,
      role: true,
      accessLevel: true,
      description: true,
      active: true,
      createdAt: true,
      updatedAt: true,
      createdBy: true,
    },
    orderBy: { role: 'asc' },
    // Bounded by number of roles (typically < 10)
    take: 50,
  });
  return results as PagePermission[];
}

/**
 * Get single page permission by pathname and role
 */
export async function getPagePermission(
  pathname: string,
  role: string
): Promise<PagePermission | null> {
  const result = await prisma.pagePermission.findUnique({
    where: {
      pathname_role: {
        pathname,
        role,
      },
    },
  });
  return result as PagePermission | null;
}

/**
 * Create a new page permission override
 */
export async function createPagePermission(data: {
  pathname: string;
  role: string;
  accessLevel: PageAccessLevel;
  description?: string;
  createdBy: string;
}): Promise<PagePermission> {
  // Check if permission already exists
  const existing = await getPagePermission(data.pathname, data.role);
  
  if (existing) {
    throw new AppError(
      409,
      'Page permission already exists for this pathname and role',
      ErrorCodes.VALIDATION_ERROR,
      { pathname: data.pathname, role: data.role }
    );
  }
  
  const permission = await prisma.pagePermission.create({
    data: {
      pathname: data.pathname,
      role: data.role,
      accessLevel: data.accessLevel,
      description: data.description,
      active: true,
      createdBy: data.createdBy,
      updatedAt: new Date(),
    },
    select: {
      id: true,
      pathname: true,
      role: true,
      accessLevel: true,
      description: true,
      active: true,
      createdAt: true,
      updatedAt: true,
      createdBy: true,
    },
  });

  // Clear cache for this page
  await clearPagePermissionCache(data.pathname);

  return permission as PagePermission;
}

/**
 * Create or update multiple page permissions for a pathname (bulk operation)
 */
export async function bulkUpsertPagePermissions(
  pathname: string,
  permissions: Record<string, PageAccessLevel>,
  description: string | undefined,
  createdBy: string
): Promise<PagePermission[]> {
  const results: PagePermission[] = [];

  // Use transaction to ensure all succeed or all fail
  await prisma.$transaction(async (tx) => {
    for (const [role, accessLevel] of Object.entries(permissions)) {
      const permission = await tx.pagePermission.upsert({
        where: {
          pathname_role: {
            pathname,
            role,
          },
        },
        update: {
          accessLevel,
          description,
          active: true,
        },
        create: {
          pathname,
          role,
          accessLevel,
          description,
          active: true,
          createdBy,
          updatedAt: new Date(),
        },
        select: {
          id: true,
          pathname: true,
          role: true,
          accessLevel: true,
          description: true,
          active: true,
          createdAt: true,
          updatedAt: true,
          createdBy: true,
        },
      });

      results.push(permission as PagePermission);
    }
  });

  // Clear cache for this page
  await clearPagePermissionCache(pathname);

  return results;
}

/**
 * Update an existing page permission
 */
export async function updatePagePermission(
  id: number,
  data: {
    accessLevel?: PageAccessLevel;
    description?: string;
    active?: boolean;
  }
): Promise<PagePermission> {
  const existing = await prisma.pagePermission.findUnique({
    where: { id },
    select: { pathname: true },
  });

  if (!existing) {
    throw new AppError(
      404,
      'Page permission not found',
      ErrorCodes.NOT_FOUND,
      { id }
    );
  }

  const updated = await prisma.pagePermission.update({
    where: { id },
    data,
    select: {
      id: true,
      pathname: true,
      role: true,
      accessLevel: true,
      description: true,
      active: true,
      createdAt: true,
      updatedAt: true,
      createdBy: true,
    },
  });

  // Clear cache for this page
  await clearPagePermissionCache(existing.pathname);

  return updated as PagePermission;
}

/**
 * Delete a page permission (reverts to code-based or convention defaults)
 */
export async function deletePagePermission(id: number): Promise<void> {
  const existing = await prisma.pagePermission.findUnique({
    where: { id },
    select: { pathname: true },
  });

  if (!existing) {
    throw new AppError(
      404,
      'Page permission not found',
      ErrorCodes.NOT_FOUND,
      { id }
    );
  }

  await prisma.pagePermission.delete({
    where: { id },
  });

  // Clear cache for this page
  await clearPagePermissionCache(existing.pathname);
}

/**
 * Delete all permissions for a pathname
 */
export async function deletePagePermissionsByPath(pathname: string): Promise<number> {
  const result = await prisma.pagePermission.deleteMany({
    where: { pathname },
  });
  
  // Clear cache for this page
  await clearPagePermissionCache(pathname);
  
  return result.count;
}

/**
 * Get merged permissions for display in UI
 * Combines database overrides with convention-based defaults
 */
export async function getMergedPagePermissions(): Promise<Array<{
  pathname: string;
  permissions: Record<string, {
    accessLevel: PageAccessLevel;
    source: 'DB' | 'CODE' | 'AUTO';
    id?: number;
    description?: string;
  }>;
  category?: string;
}>> {
  // Get all registry entries (discovered pages)
  const registry = await getPageRegistry({ active: true });
  
  // Get all database permissions
  const dbPermissions = await getAllPagePermissions({ active: true });
  
  // Group DB permissions by pathname
  const dbPermsByPath: Record<string, PagePermission[]> = {};
  for (const perm of dbPermissions) {
    if (!dbPermsByPath[perm.pathname]) {
      dbPermsByPath[perm.pathname] = [];
    }
    dbPermsByPath[perm.pathname]!.push(perm);
  }
  
  // Build merged result
  const result: Array<{
    pathname: string;
    permissions: Record<string, {
      accessLevel: PageAccessLevel;
      source: 'DB' | 'CODE' | 'AUTO';
      id?: number;
      description?: string;
    }>;
    category?: string;
  }> = [];
  
  // Process each registered page
  for (const page of registry) {
    const conventions = getConventionBasedPermission(page.pathname);
    const dbPerms = dbPermsByPath[page.pathname] || [];
    
    const permissions: Record<string, {
      accessLevel: PageAccessLevel;
      source: 'DB' | 'CODE' | 'AUTO';
      id?: number;
      description?: string;
    }> = {};
    
    // Start with convention-based defaults for all roles
    for (const [role, accessLevel] of Object.entries(conventions)) {
      permissions[role] = {
        accessLevel,
        source: 'AUTO',
      };
    }
    
    // Override with DB permissions where they exist
    for (const dbPerm of dbPerms) {
      permissions[dbPerm.role] = {
        accessLevel: dbPerm.accessLevel as PageAccessLevel,
        source: 'DB',
        id: dbPerm.id,
        description: dbPerm.description || undefined,
      };
    }
    
    result.push({
      pathname: page.pathname,
      permissions,
      category: page.category || undefined,
    });
  }
  
  return result;
}

