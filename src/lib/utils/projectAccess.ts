/**
 * Project Access Utilities
 * 
 * Simplified and clear project access checking with detailed access metadata.
 * Consolidates the complex project access logic from auth.ts into a single,
 * easy-to-understand API.
 */

import { prisma } from '@/lib/db/prisma';
import { isSystemAdmin } from './systemAdmin';
import { hasServiceLineRole } from './roleHierarchy';
import { logger } from './logger';

/**
 * Project access type - indicates HOW the user has access
 */
export enum ProjectAccessType {
  /** User is a SYSTEM_ADMIN with global access */
  SYSTEM_ADMIN = 'SYSTEM_ADMIN',
  /** User is Partner/Admin in project's service line (can see all projects) */
  SERVICE_LINE_ADMIN = 'SERVICE_LINE_ADMIN',
  /** User is explicitly assigned as ProjectUser member */
  PROJECT_MEMBER = 'PROJECT_MEMBER',
  /** User has no access */
  NO_ACCESS = 'NO_ACCESS',
}

/**
 * Project access result with detailed metadata
 */
export interface ProjectAccessResult {
  /** Whether user has access */
  canAccess: boolean;
  /** How the user has access */
  accessType: ProjectAccessType;
  /** User's role in project (if applicable) */
  projectRole?: string;
  /** User's role in service line (if applicable) */
  serviceLineRole?: string;
  /** Service line the project belongs to */
  serviceLine?: string;
  /** Whether user is SYSTEM_ADMIN */
  isSystemAdmin: boolean;
}

/**
 * Check if user can access a project
 * 
 * Returns detailed information about HOW the user has access.
 * 
 * Access Rules:
 * 1. SYSTEM_ADMIN → Full access (global)
 * 2. ADMIN/PARTNER in project's service line → Can see all projects
 * 3. ProjectUser member → Access based on role
 * 
 * @param userId - User ID to check
 * @param projectId - Project ID to check access for
 * @param requiredRole - Optional minimum project role required
 * @returns Detailed access result
 */
export async function canAccessProject(
  userId: string,
  projectId: number,
  requiredRole?: string
): Promise<ProjectAccessResult> {
  try {
    // Get user info
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    if (!user) {
      return {
        canAccess: false,
        accessType: ProjectAccessType.NO_ACCESS,
        isSystemAdmin: false,
      };
    }

    // Check if SYSTEM_ADMIN (global access)
    if (isSystemAdmin(user)) {
      return {
        canAccess: true,
        accessType: ProjectAccessType.SYSTEM_ADMIN,
        isSystemAdmin: true,
      };
    }

    // Get project info
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { serviceLine: true },
    });

    if (!project) {
      return {
        canAccess: false,
        accessType: ProjectAccessType.NO_ACCESS,
        isSystemAdmin: false,
      };
    }

    // Check service line access
    const serviceLineUser = await prisma.serviceLineUser.findUnique({
      where: {
        userId_serviceLine: {
          userId,
          serviceLine: project.serviceLine,
        },
      },
      select: { role: true },
    });

    // If user is Partner/Admin in service line, they can see all projects
    if (serviceLineUser && (serviceLineUser.role === 'ADMINISTRATOR' || serviceLineUser.role === 'PARTNER')) {
      return {
        canAccess: true,
        accessType: ProjectAccessType.SERVICE_LINE_ADMIN,
        serviceLineRole: serviceLineUser.role,
        serviceLine: project.serviceLine,
        isSystemAdmin: false,
      };
    }

    // Check project membership
    const projectUser = await prisma.projectUser.findUnique({
      where: {
        projectId_userId: {
          projectId,
          userId,
        },
      },
      select: { role: true },
    });

    if (!projectUser) {
      return {
        canAccess: false,
        accessType: ProjectAccessType.NO_ACCESS,
        serviceLine: project.serviceLine,
        isSystemAdmin: false,
      };
    }

    // If required role specified, check role hierarchy
    if (requiredRole) {
      const { hasProjectRole } = await import('./roleHierarchy');
      const hasRequiredRole = hasProjectRole(projectUser.role, requiredRole);
      
      if (!hasRequiredRole) {
        return {
          canAccess: false,
          accessType: ProjectAccessType.PROJECT_MEMBER,
          projectRole: projectUser.role,
          serviceLine: project.serviceLine,
          serviceLineRole: serviceLineUser?.role,
          isSystemAdmin: false,
        };
      }
    }

    return {
      canAccess: true,
      accessType: ProjectAccessType.PROJECT_MEMBER,
      projectRole: projectUser.role,
      serviceLine: project.serviceLine,
      serviceLineRole: serviceLineUser?.role,
      isSystemAdmin: false,
    };
  } catch (error) {
    logger.error('Error checking project access', { userId, projectId, error });
    return {
      canAccess: false,
      accessType: ProjectAccessType.NO_ACCESS,
      isSystemAdmin: false,
    };
  }
}

/**
 * Simple boolean check for project access
 * @param userId - User ID
 * @param projectId - Project ID
 * @param requiredRole - Optional minimum role required
 * @returns true if user can access project
 */
export async function hasProjectAccess(
  userId: string,
  projectId: number,
  requiredRole?: string
): Promise<boolean> {
  const result = await canAccessProject(userId, projectId, requiredRole);
  return result.canAccess;
}

/**
 * Require project access, throw error if user doesn't have access
 * @param userId - User ID
 * @param projectId - Project ID
 * @param requiredRole - Optional minimum role required
 * @throws Error if user doesn't have access
 */
export async function requireProjectAccess(
  userId: string,
  projectId: number,
  requiredRole?: string
): Promise<void> {
  const result = await canAccessProject(userId, projectId, requiredRole);
  
  if (!result.canAccess) {
    const message = requiredRole
      ? `Access denied: ${requiredRole} role required`
      : 'Access denied: Not a project member';
    throw new Error(message);
  }
}

/**
 * Get user's effective role in project
 * 
 * Returns the highest applicable role:
 * - SYSTEM_ADMIN → 'SYSTEM_ADMIN'
 * - Service Line Administrator → 'ADMINISTRATOR'
 * - Project Member → Project role
 * 
 * @param userId - User ID
 * @param projectId - Project ID
 * @returns Effective role or null if no access
 */
export async function getEffectiveProjectRole(
  userId: string,
  projectId: number
): Promise<string | null> {
  const access = await canAccessProject(userId, projectId);
  
  if (!access.canAccess) {
    return null;
  }
  
  switch (access.accessType) {
    case ProjectAccessType.SYSTEM_ADMIN:
      return 'SYSTEM_ADMIN';
    case ProjectAccessType.SERVICE_LINE_ADMIN:
      return 'ADMINISTRATOR'; // Service line administrators have admin-level project access
    case ProjectAccessType.PROJECT_MEMBER:
      return access.projectRole || null;
    default:
      return null;
  }
}

/**
 * Check if user can manage project (assign users, delete, etc.)
 * 
 * Management access requires:
 * - SYSTEM_ADMIN, OR
 * - Service Line ADMIN/PARTNER/MANAGER, OR
 * - Project ADMIN role
 * 
 * @param userId - User ID
 * @param projectId - Project ID
 * @returns true if user can manage project
 */
export async function canManageProject(
  userId: string,
  projectId: number
): Promise<boolean> {
  const access = await canAccessProject(userId, projectId);
  
  if (!access.canAccess) {
    return false;
  }
  
  // SYSTEM_ADMIN can manage all projects
  if (access.isSystemAdmin) {
    return true;
  }
  
  // Service line ADMIN/PARTNER/MANAGER can manage projects
  if (access.serviceLineRole && hasServiceLineRole(access.serviceLineRole, 'MANAGER')) {
    return true;
  }
  
  // Project ADMIN can manage
  if (access.projectRole === 'ADMIN') {
    return true;
  }
  
  return false;
}

/**
 * Check if user can delete project
 * 
 * Delete access requires:
 * - SYSTEM_ADMIN, OR
 * - Service Line ADMIN/PARTNER/MANAGER, OR
 * - Project ADMIN role
 * 
 * @param userId - User ID
 * @param projectId - Project ID
 * @returns true if user can delete project
 */
export async function canDeleteProject(
  userId: string,
  projectId: number
): Promise<boolean> {
  // Same rules as manage for now
  return canManageProject(userId, projectId);
}

/**
 * Check if user can assign team members to project
 * 
 * Assignment access requires:
 * - SYSTEM_ADMIN, OR
 * - Service Line ADMIN/PARTNER/MANAGER, OR
 * - Project ADMIN role
 * 
 * @param userId - User ID
 * @param projectId - Project ID
 * @returns true if user can assign team members
 */
export async function canAssignTeamMembers(
  userId: string,
  projectId: number
): Promise<boolean> {
  // Same rules as manage for now
  return canManageProject(userId, projectId);
}

/**
 * Format access type for display
 * @param accessType - Access type
 * @returns Formatted string
 */
export function formatAccessType(accessType: ProjectAccessType): string {
  switch (accessType) {
    case ProjectAccessType.SYSTEM_ADMIN:
      return 'System Administrator';
    case ProjectAccessType.SERVICE_LINE_ADMIN:
      return 'Service Line Administrator';
    case ProjectAccessType.PROJECT_MEMBER:
      return 'Project Member';
    case ProjectAccessType.NO_ACCESS:
      return 'No Access';
    default:
      return 'Unknown';
  }
}

/**
 * Get detailed access summary for UI display
 * @param result - Project access result
 * @returns Human-readable access summary
 */
export function getAccessSummary(result: ProjectAccessResult): string {
  if (!result.canAccess) {
    return 'You do not have access to this project.';
  }
  
  switch (result.accessType) {
    case ProjectAccessType.SYSTEM_ADMIN:
      return 'You have full access as a System Administrator.';
    case ProjectAccessType.SERVICE_LINE_ADMIN:
      return `You have access as a ${result.serviceLineRole} in the ${result.serviceLine} service line.`;
    case ProjectAccessType.PROJECT_MEMBER:
      return `You are a project member with ${result.projectRole} role.`;
    default:
      return 'You have access to this project.';
  }
}


