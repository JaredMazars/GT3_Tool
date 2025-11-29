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
  SYSTEM_ADMIN = 'SYSTEM_ADMIN', // System-wide access to all features and service lines
  USER = 'USER',                  // Regular user, requires service line access
}

/**
 * Service Line Roles (ServiceLineUser.role)
 * ADMINISTRATOR > PARTNER > MANAGER > SUPERVISOR > USER > VIEWER
 */
export enum ServiceLineRole {
  ADMINISTRATOR = 'ADMINISTRATOR', // Service line administrator (highest)
  PARTNER = 'PARTNER',             // Partner level - can approve acceptance/engagement letters
  MANAGER = 'MANAGER',             // Manager level - can manage projects
  SUPERVISOR = 'SUPERVISOR',       // Supervisor level - between Manager and User
  USER = 'USER',                   // Staff level - can complete work
  VIEWER = 'VIEWER',               // View-only access
}

/**
 * Feature permissions that can be checked
 * 
 * @deprecated This enum is deprecated. Use the unified permission system instead.
 * These features are now stored in the database as permissions with resource keys:
 * - APPROVE_ACCEPTANCE -> 'project.approve-acceptance'
 * - APPROVE_ENGAGEMENT_LETTER -> 'project.approve-engagement-letter'
 * - MANAGE_PROJECT -> 'project.manage'
 * - DELETE_PROJECT -> 'project.delete'
 * - ASSIGN_TEAM_MEMBERS -> 'project.assign-team'
 * - EDIT_PROJECT_DATA -> 'project.edit-data'
 * - VIEW_PROJECT -> 'project.view'
 * 
 * Use checkUserPermission() from permissionService instead.
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
 * Map legacy Feature enum to new permission resource keys
 */
const FEATURE_TO_RESOURCE_MAP: Record<Feature, string> = {
  [Feature.APPROVE_ACCEPTANCE]: 'project.approve-acceptance',
  [Feature.APPROVE_ENGAGEMENT_LETTER]: 'project.approve-engagement-letter',
  [Feature.MANAGE_PROJECT]: 'project.manage',
  [Feature.DELETE_PROJECT]: 'project.delete',
  [Feature.ASSIGN_TEAM_MEMBERS]: 'project.assign-team',
  [Feature.EDIT_PROJECT_DATA]: 'project.edit-data',
  [Feature.VIEW_PROJECT]: 'project.view',
};

/**
 * Check if user is a System Admin
 */
export async function isSystemAdmin(userId: string): Promise<boolean> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    return user?.role === SystemRole.SYSTEM_ADMIN;
  } catch (error) {
    logger.error('Error checking system admin', { userId, error });
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
    if (user.role === SystemRole.SYSTEM_ADMIN || user.role === SystemRole.USER) {
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
 * @deprecated Use getServiceLineRole from serviceLineService instead (more flexible typing)
 * This version is kept for internal authorization use only
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
 * Check if user is an Administrator or Partner in a service line
 * These are the roles that can approve letters
 */
export async function isPartner(userId: string, serviceLine: string): Promise<boolean> {
  const role = await getServiceLineRole(userId, serviceLine);
  return role === ServiceLineRole.ADMINISTRATOR || role === ServiceLineRole.PARTNER;
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
 * @deprecated Use checkServiceLineAccess from serviceLineService instead (supports role hierarchy)
 * This simplified version is kept for internal authorization use only
 */
export async function hasServiceLineAccess(
  userId: string,
  serviceLine: string
): Promise<boolean> {
  try {
    // System Admins have access to all service lines
    const isAdmin = await isSystemAdmin(userId);
    if (isAdmin) return true;

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
 * Rules: SYSTEM_ADMIN OR Administrator/Partner (ServiceLineUser.role = ADMINISTRATOR or PARTNER)
 */
export async function canApproveAcceptance(
  userId: string,
  projectId: number
): Promise<boolean> {
  try {
    // Check if user is a system admin
    const isAdmin = await isSystemAdmin(userId);
    if (isAdmin) return true;

    // Get the project's service line
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { serviceLine: true },
    });

    if (!project) {
      logger.warn('Project not found for approval check', { projectId });
      return false;
    }

    // Check if user is an Administrator or Partner in the project's service line
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
 * Same rules as acceptance: SYSTEM_ADMIN OR Administrator/Partner
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
    const isAdmin = await isSystemAdmin(userId);

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
        // System Admin OR Administrator/Partner in service line
        return isAdmin || serviceLineRole === ServiceLineRole.ADMINISTRATOR || serviceLineRole === ServiceLineRole.PARTNER;

      case Feature.DELETE_PROJECT:
        // System Admin OR Project ADMIN OR Service Line ADMINISTRATOR/PARTNER/MANAGER
        return (
          isAdmin ||
          projectUser.role === 'ADMIN' ||
          serviceLineRole === ServiceLineRole.ADMINISTRATOR ||
          serviceLineRole === ServiceLineRole.PARTNER ||
          serviceLineRole === ServiceLineRole.MANAGER
        );

      case Feature.MANAGE_PROJECT:
      case Feature.ASSIGN_TEAM_MEMBERS:
        // System Admin OR Project ADMIN OR Service Line ADMINISTRATOR/PARTNER/MANAGER
        return (
          isAdmin ||
          projectUser.role === 'ADMIN' ||
          serviceLineRole === ServiceLineRole.ADMINISTRATOR ||
          serviceLineRole === ServiceLineRole.PARTNER ||
          serviceLineRole === ServiceLineRole.MANAGER
        );

      case Feature.EDIT_PROJECT_DATA:
        // Anyone with EDITOR or above on project, OR USER or above in service line
        return (
          isAdmin ||
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
 * @deprecated Use getUserServiceLines from serviceLineService instead (returns enhanced data with stats)
 * This simplified version is kept for internal authorization use only
 */
export async function getUserServiceLines(userId: string): Promise<
  Array<{
    serviceLine: string;
    role: string;
  }>
> {
  try {
    // System Admins have access to all service lines
    const isAdmin = await isSystemAdmin(userId);
    if (isAdmin) {
      // Load all active service lines from database
      const activeServiceLines = await prisma.serviceLineMaster.findMany({
        where: { active: true },
        orderBy: { sortOrder: 'asc' },
        select: { code: true },
      });
      
      // Return all active service lines with ADMINISTRATOR role
      return activeServiceLines.map(sl => ({
        serviceLine: sl.code,
        role: ServiceLineRole.ADMINISTRATOR,
      }));
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
 * @deprecated Use formatServiceLineRole from roleHierarchy instead
 */
export function formatServiceLineRole(role: string): string {
  switch (role) {
    case ServiceLineRole.ADMINISTRATOR:
      return 'Administrator';
    case ServiceLineRole.PARTNER:
      return 'Partner';
    case ServiceLineRole.MANAGER:
      return 'Manager';
    case ServiceLineRole.SUPERVISOR:
      return 'Supervisor';
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
 * @deprecated Use formatSystemRole from roleHierarchy instead
 */
export function formatSystemRole(role: string): string {
  switch (role) {
    case SystemRole.SYSTEM_ADMIN:
      return 'System Administrator';
    case SystemRole.USER:
      return 'User';
    default:
      return role;
  }
}
