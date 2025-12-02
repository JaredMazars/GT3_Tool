/**
 * Authorization Service
 * Handles system-level, service-line-level, and project-level permissions
 */

import { prisma } from '@/lib/db/prisma';
import { logger } from '@/lib/utils/logger';
import { SystemRole, ServiceLineRole } from '@/types';

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
