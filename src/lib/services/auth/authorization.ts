/**
 * Authorization Service
 * Handles system-level, service-line-level, and project-level permissions
 */

import { prisma } from '@/lib/db/prisma';
import { logger } from '@/lib/utils/logger';

/**
 * System Roles (User.role)
 */
export enum SystemRole {
  SUPERUSER = 'SUPERUSER', // System-wide access to all features and service lines
  USER = 'USER',           // Regular user, requires service line access
}

/**
 * Service Line Roles (ServiceLineUser.role)
 * Maps to business titles: ADMIN=Partner, MANAGER=Manager, USER=Staff, VIEWER=Viewer
 */
export enum ServiceLineRole {
  ADMIN = 'ADMIN',     // Partner level - can approve acceptance/engagement letters
  MANAGER = 'MANAGER', // Manager level - can manage projects
  USER = 'USER',       // Staff level - can complete work
  VIEWER = 'VIEWER',   // View-only access
}

/**
 * Feature permissions that can be checked
 */
export enum Feature {
  APPROVE_ACCEPTANCE = 'APPROVE_ACCEPTANCE',
  APPROVE_ENGAGEMENT_LETTER = 'APPROVE_ENGAGEMENT_LETTER',
  MANAGE_PROJECT = 'MANAGE_PROJECT',
  DELETE_PROJECT = 'DELETE_PROJECT',
  ASSIGN_TEAM_MEMBERS = 'ASSIGN_TEAM_MEMBERS',
  EDIT_PROJECT_DATA = 'EDIT_PROJECT_DATA',
  VIEW_PROJECT = 'VIEW_PROJECT',
}

/**
 * Check if user is a system superuser
 */
export async function isSystemSuperuser(userId: string): Promise<boolean> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    return user?.role === SystemRole.SUPERUSER;
  } catch (error) {
    logger.error('Error checking system superuser', { userId, error });
    return false;
  }
}

/**
 * Get user's system role
 */
export async function getUserSystemRole(userId: string): Promise<SystemRole | null> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    if (!user) return null;

    // Validate that the role is a valid SystemRole
    if (user.role === SystemRole.SUPERUSER || user.role === SystemRole.USER) {
      return user.role as SystemRole;
    }

    // Default to USER if invalid
    return SystemRole.USER;
  } catch (error) {
    logger.error('Error getting user system role', { userId, error });
    return null;
  }
}

/**
 * Get user's role in a specific service line
 */
export async function getServiceLineRole(
  userId: string,
  serviceLine: string
): Promise<ServiceLineRole | null> {
  try {
    const serviceLineUser = await prisma.serviceLineUser.findUnique({
      where: {
        userId_serviceLine: {
          userId,
          serviceLine,
        },
      },
      select: { role: true },
    });

    if (!serviceLineUser) return null;

    // Return the role as a ServiceLineRole enum
    return serviceLineUser.role as ServiceLineRole;
  } catch (error) {
    logger.error('Error getting service line role', { userId, serviceLine, error });
    return null;
  }
}

/**
 * Check if user is a Partner (ADMIN) in a service line
 */
export async function isPartner(userId: string, serviceLine: string): Promise<boolean> {
  const role = await getServiceLineRole(userId, serviceLine);
  return role === ServiceLineRole.ADMIN;
}

/**
 * Check if user is a Manager in a service line
 */
export async function isManager(userId: string, serviceLine: string): Promise<boolean> {
  const role = await getServiceLineRole(userId, serviceLine);
  return role === ServiceLineRole.MANAGER;
}

/**
 * Check if user has service line access at all
 */
export async function hasServiceLineAccess(
  userId: string,
  serviceLine: string
): Promise<boolean> {
  try {
    // Superusers have access to all service lines
    const isSuperuser = await isSystemSuperuser(userId);
    if (isSuperuser) return true;

    // Check if user has ServiceLineUser entry
    const serviceLineUser = await prisma.serviceLineUser.findUnique({
      where: {
        userId_serviceLine: {
          userId,
          serviceLine,
        },
      },
    });

    return !!serviceLineUser;
  } catch (error) {
    logger.error('Error checking service line access', { userId, serviceLine, error });
    return false;
  }
}

/**
 * Check if user can approve client acceptance for a project
 * Rules: SUPERUSER OR Partner (ServiceLineUser.role = ADMIN for project's service line)
 */
export async function canApproveAcceptance(
  userId: string,
  projectId: number
): Promise<boolean> {
  try {
    // Check if user is a superuser
    const isSuperuser = await isSystemSuperuser(userId);
    if (isSuperuser) return true;

    // Get the project's service line
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { serviceLine: true },
    });

    if (!project) {
      logger.warn('Project not found for approval check', { projectId });
      return false;
    }

    // Check if user is a Partner (ADMIN) in the project's service line
    const isServiceLinePartner = await isPartner(userId, project.serviceLine);
    
    // Also verify they have project access
    if (isServiceLinePartner) {
      const hasProjectAccess = await prisma.projectUser.findUnique({
        where: {
          projectId_userId: {
            projectId,
            userId,
          },
        },
      });
      
      return !!hasProjectAccess;
    }

    return false;
  } catch (error) {
    logger.error('Error checking approval permission', { userId, projectId, error });
    return false;
  }
}

/**
 * Check if user can approve engagement letter for a project
 * Same rules as acceptance: SUPERUSER OR Partner (ServiceLineUser.role = ADMIN)
 */
export async function canApproveEngagementLetter(
  userId: string,
  projectId: number
): Promise<boolean> {
  // Same logic as acceptance approval
  return canApproveAcceptance(userId, projectId);
}

/**
 * Check feature-level permission
 */
export async function checkFeaturePermission(
  userId: string,
  projectId: number,
  feature: Feature
): Promise<boolean> {
  try {
    // Get user's system role
    const isSuperuser = await isSystemSuperuser(userId);

    // Get project details
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { serviceLine: true },
    });

    if (!project) return false;

    // Get user's project role
    const projectUser = await prisma.projectUser.findUnique({
      where: {
        projectId_userId: {
          projectId,
          userId,
        },
      },
      select: { role: true },
    });

    if (!projectUser) return false;

    // Get user's service line role
    const serviceLineRole = await getServiceLineRole(userId, project.serviceLine);

    // Check permission based on feature
    switch (feature) {
      case Feature.APPROVE_ACCEPTANCE:
      case Feature.APPROVE_ENGAGEMENT_LETTER:
        // Superuser OR Partner in service line
        return isSuperuser || serviceLineRole === ServiceLineRole.ADMIN;

      case Feature.DELETE_PROJECT:
        // Superuser OR Project ADMIN OR Service Line ADMIN/MANAGER
        return (
          isSuperuser ||
          projectUser.role === 'ADMIN' ||
          serviceLineRole === ServiceLineRole.ADMIN ||
          serviceLineRole === ServiceLineRole.MANAGER
        );

      case Feature.MANAGE_PROJECT:
      case Feature.ASSIGN_TEAM_MEMBERS:
        // Superuser OR Project ADMIN OR Service Line ADMIN/MANAGER
        return (
          isSuperuser ||
          projectUser.role === 'ADMIN' ||
          serviceLineRole === ServiceLineRole.ADMIN ||
          serviceLineRole === ServiceLineRole.MANAGER
        );

      case Feature.EDIT_PROJECT_DATA:
        // Anyone with EDITOR or above on project, OR USER or above in service line
        return (
          isSuperuser ||
          projectUser.role === 'ADMIN' ||
          projectUser.role === 'REVIEWER' ||
          projectUser.role === 'EDITOR' ||
          (serviceLineRole !== null && serviceLineRole !== ServiceLineRole.VIEWER)
        );

      case Feature.VIEW_PROJECT:
        // Anyone with project access
        return true;

      default:
        logger.warn('Unknown feature permission check', { feature });
        return false;
    }
  } catch (error) {
    logger.error('Error checking feature permission', { userId, projectId, feature, error });
    return false;
  }
}

/**
 * Get all service lines a user has access to
 */
export async function getUserServiceLines(userId: string): Promise<
  Array<{
    serviceLine: string;
    role: string;
  }>
> {
  try {
    // Superusers have access to all service lines
    const isSuperuser = await isSystemSuperuser(userId);
    if (isSuperuser) {
      // Return all possible service lines with ADMIN role
      return [
        { serviceLine: 'TAX', role: ServiceLineRole.ADMIN },
        { serviceLine: 'AUDIT', role: ServiceLineRole.ADMIN },
        { serviceLine: 'ACCOUNTING', role: ServiceLineRole.ADMIN },
        { serviceLine: 'ADVISORY', role: ServiceLineRole.ADMIN },
        { serviceLine: 'QRM', role: ServiceLineRole.ADMIN },
        { serviceLine: 'BUSINESS_DEV', role: ServiceLineRole.ADMIN },
        { serviceLine: 'IT', role: ServiceLineRole.ADMIN },
        { serviceLine: 'FINANCE', role: ServiceLineRole.ADMIN },
        { serviceLine: 'HR', role: ServiceLineRole.ADMIN },
      ];
    }

    // Get user's service line assignments
    const serviceLineUsers = await prisma.serviceLineUser.findMany({
      where: { userId },
      select: {
        serviceLine: true,
        role: true,
      },
    });

    return serviceLineUsers;
  } catch (error) {
    logger.error('Error getting user service lines', { userId, error });
    return [];
  }
}

/**
 * Format service line role for display
 */
export function formatServiceLineRole(role: string): string {
  switch (role) {
    case ServiceLineRole.ADMIN:
      return 'Partner';
    case ServiceLineRole.MANAGER:
      return 'Manager';
    case ServiceLineRole.USER:
      return 'Staff';
    case ServiceLineRole.VIEWER:
      return 'Viewer';
    default:
      return role;
  }
}

/**
 * Format system role for display
 */
export function formatSystemRole(role: string): string {
  switch (role) {
    case SystemRole.SUPERUSER:
      return 'System Administrator';
    case SystemRole.USER:
      return 'User';
    default:
      return role;
  }
}



