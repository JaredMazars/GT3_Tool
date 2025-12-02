import { prisma } from '@/lib/db/prisma';

/**
 * Permission actions that can be performed on resources
 */
export type PermissionAction = 'CREATE' | 'READ' | 'UPDATE' | 'DELETE';

/**
 * Resource types for permissions
 */
export type ResourceType = 'PAGE' | 'FEATURE';

/**
 * User roles supported by the system
 * SYSTEM_ADMIN is the system level admin (full access)
 * ADMINISTRATOR is the service line level admin (highest service line role)
 */
export type UserRole = 'SYSTEM_ADMIN' | 'ADMINISTRATOR' | 'PARTNER' | 'MANAGER' | 'SUPERVISOR' | 'USER' | 'VIEWER';

/**
 * Permission resource definition
 */
export interface Permission {
  id: number;
  resourceType: ResourceType;
  resourceKey: string;
  displayName: string;
  description: string | null;
  availableActions: PermissionAction[];
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Role permission definition
 */
export interface RolePermission {
  id: number;
  role: UserRole;
  permissionId: number;
  allowedActions: PermissionAction[];
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Permission matrix entry for UI
 */
export interface PermissionMatrixEntry {
  permission: Permission;
  rolePermissions: {
    [key in UserRole]?: {
      isActive: boolean;
      allowedActions: PermissionAction[];
    };
  };
}

/**
 * Check if a user has permission to perform a specific action on a resource
 * @param userId - The user ID to check
 * @param resourceKey - The resource identifier (e.g., "clients", "projects.create")
 * @param action - The action to perform (CREATE, READ, UPDATE, DELETE)
 * @returns true if user has permission, false otherwise
 */
export async function checkUserPermission(
  userId: string,
  resourceKey: string,
  action: PermissionAction
): Promise<boolean> {
  try {
    // Get user and their role
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    if (!user) {
      return false;
    }

    // SYSTEM_ADMIN bypasses all permission checks
    if (user.role === 'SYSTEM_ADMIN') {
      return true;
    }

    // Find the permission by resource key
    const permission = await prisma.permission.findFirst({
      where: { resourceKey },
    });

    if (!permission) {
      // If permission doesn't exist, deny access
      return false;
    }

    // Parse available actions
    const availableActions = JSON.parse(permission.availableActions) as PermissionAction[];
    
    // Check if the action is even available for this resource
    if (!availableActions.includes(action)) {
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
      // No explicit permission granted for this role
      return false;
    }

    // Parse allowed actions for this role
    const allowedActions = JSON.parse(rolePermission.allowedActions) as PermissionAction[];
    
    // Check if the action is allowed
    return allowedActions.includes(action);
  } catch (error) {
    console.error('Error checking user permission:', error);
    return false;
  }
}

/**
 * Get all permissions for a user based on their role
 * @param userId - The user ID
 * @returns Array of permissions with allowed actions
 */
export async function getUserPermissions(userId: string): Promise<PermissionMatrixEntry[]> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    if (!user) {
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

      return allPermissions.map(permission => ({
        permission: {
          id: permission.id,
          resourceType: permission.resourceType as ResourceType,
          resourceKey: permission.resourceKey,
          displayName: permission.displayName,
          description: permission.description,
          availableActions: JSON.parse(permission.availableActions) as PermissionAction[],
          createdAt: permission.createdAt,
          updatedAt: permission.updatedAt,
        },
        rolePermissions: {
          SYSTEM_ADMIN: {
            isActive: true,
            allowedActions: JSON.parse(permission.availableActions) as PermissionAction[],
          },
        },
      }));
    }

    // Get role permissions
    const rolePermissions = await prisma.rolePermission.findMany({
      where: { role: user.role },
      include: {
        Permission: true,
      },
    });

    return rolePermissions.map(rp => ({
      permission: {
        id: rp.Permission.id,
        resourceType: rp.Permission.resourceType as ResourceType,
        resourceKey: rp.Permission.resourceKey,
        displayName: rp.Permission.displayName,
        description: rp.Permission.description,
        availableActions: JSON.parse(rp.Permission.availableActions) as PermissionAction[],
        createdAt: rp.Permission.createdAt,
        updatedAt: rp.Permission.updatedAt,
      },
      rolePermissions: {
        [user.role as UserRole]: {
          isActive: true,
          allowedActions: JSON.parse(rp.allowedActions) as PermissionAction[],
        },
      },
    }));
  } catch (error) {
    console.error('Error getting user permissions:', error);
    return [];
  }
}

/**
 * Get all permissions for a specific role
 * @param role - The role to get permissions for
 * @returns Array of role permissions
 */
export async function getRolePermissions(role: UserRole): Promise<RolePermission[]> {
  try {
    const rolePermissions = await prisma.rolePermission.findMany({
      where: { role },
      orderBy: { permissionId: 'asc' },
    });

    return rolePermissions.map(rp => ({
      id: rp.id,
      role: rp.role as UserRole,
      permissionId: rp.permissionId,
      allowedActions: JSON.parse(rp.allowedActions) as PermissionAction[],
      createdAt: rp.createdAt,
      updatedAt: rp.updatedAt,
    }));
  } catch (error) {
    console.error('Error getting role permissions:', error);
    return [];
  }
}

/**
 * Update or create a role permission
 * @param role - The role to update
 * @param permissionId - The permission ID
 * @param actions - The allowed actions
 */
export async function updateRolePermission(
  role: UserRole,
  permissionId: number,
  actions: PermissionAction[]
): Promise<void> {
  try {
    // If actions is empty, delete the role permission
    if (actions.length === 0) {
      await prisma.rolePermission.deleteMany({
        where: {
          role,
          permissionId,
        },
      });
      return;
    }

    // Upsert the role permission
    await prisma.rolePermission.upsert({
      where: {
        role_permissionId: {
          role,
          permissionId,
        },
      },
      create: {
        role,
        permissionId,
        allowedActions: JSON.stringify(actions),
      },
      update: {
        allowedActions: JSON.stringify(actions),
      },
    });
  } catch (error) {
    console.error('Error updating role permission:', error);
    throw new Error('Failed to update role permission');
  }
}

/**
 * Get the full permission matrix for admin UI
 * @returns Array of permission matrix entries with all roles
 */
export async function getPermissionMatrix(): Promise<PermissionMatrixEntry[]> {
  try {
    // Get all permissions
    const permissions = await prisma.permission.findMany({
      include: {
        RolePermission: true,
      },
      orderBy: [
        { resourceType: 'asc' },
        { displayName: 'asc' },
      ],
    });

    // NOTE: These are SERVICE LINE roles, not system roles
    // Permission matrix shows service line role permissions
    // System roles are only: SYSTEM_ADMIN, USER
    // SYSTEM_ADMIN bypasses all checks, so only service line roles shown in matrix
    const roles: UserRole[] = ['ADMINISTRATOR', 'PARTNER', 'MANAGER', 'SUPERVISOR', 'USER', 'VIEWER'];

    return permissions.map(permission => {
      const rolePermissions: PermissionMatrixEntry['rolePermissions'] = {};

      // Build role permissions map
      roles.forEach(role => {
        const rolePermission = permission.RolePermission.find(rp => rp.role === role);
        
        if (rolePermission) {
          rolePermissions[role] = {
            isActive: true,
            allowedActions: JSON.parse(rolePermission.allowedActions) as PermissionAction[],
          };
        } else {
          rolePermissions[role] = {
            isActive: false,
            allowedActions: [],
          };
        }
      });

      return {
        permission: {
          id: permission.id,
          resourceType: permission.resourceType as ResourceType,
          resourceKey: permission.resourceKey,
          displayName: permission.displayName,
          description: permission.description,
          availableActions: JSON.parse(permission.availableActions) as PermissionAction[],
          createdAt: permission.createdAt,
          updatedAt: permission.updatedAt,
        },
        rolePermissions,
      };
    });
  } catch (error) {
    console.error('Error getting permission matrix:', error);
    return [];
  }
}

/**
 * Check if a user has permission for multiple actions (all must pass)
 * @param userId - The user ID
 * @param resourceKey - The resource identifier
 * @param actions - Array of actions to check
 * @returns true if user has all permissions, false otherwise
 */
export async function checkUserPermissions(
  userId: string,
  resourceKey: string,
  actions: PermissionAction[]
): Promise<boolean> {
  const results = await Promise.all(
    actions.map(action => checkUserPermission(userId, resourceKey, action))
  );
  return results.every(result => result);
}

/**
 * Check if user has any of the specified permissions (at least one must pass)
 * @param userId - The user ID
 * @param resourceKey - The resource identifier
 * @param actions - Array of actions to check
 * @returns true if user has any permission, false otherwise
 */
export async function checkUserHasAnyPermission(
  userId: string,
  resourceKey: string,
  actions: PermissionAction[]
): Promise<boolean> {
  const results = await Promise.all(
    actions.map(action => checkUserPermission(userId, resourceKey, action))
  );
  return results.some(result => result);
}

/**
 * Bulk update role permissions
 * @param updates - Array of role permission updates
 */
export async function bulkUpdateRolePermissions(
  updates: Array<{
    role: UserRole;
    permissionId: number;
    actions: PermissionAction[];
  }>
): Promise<void> {
  try {
    await prisma.$transaction(
      updates.map(update =>
        update.actions.length === 0
          ? prisma.rolePermission.deleteMany({
              where: {
                role: update.role,
                permissionId: update.permissionId,
              },
            })
          : prisma.rolePermission.upsert({
              where: {
                role_permissionId: {
                  role: update.role,
                  permissionId: update.permissionId,
                },
              },
              create: {
                role: update.role,
                permissionId: update.permissionId,
                allowedActions: JSON.stringify(update.actions),
              },
              update: {
                allowedActions: JSON.stringify(update.actions),
              },
            })
      )
    );
  } catch (error) {
    console.error('Error bulk updating role permissions:', error);
    throw new Error('Failed to bulk update role permissions');
  }
}
