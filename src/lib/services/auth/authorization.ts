/**
 * Authorization Service
 * Handles system-level, service-line-level, and task-level permissions
 */

import { prisma } from '@/lib/db/prisma';
import { logger } from '@/lib/utils/logger';
import { SystemRole, ServiceLineRole } from '@/types';

/**
 * Check if user is a System Admin (database lookup)
 * 
 * Use this variant when you need to check system admin status by user ID via database lookup.
 * For other use cases:
 * - For simple role string checks: use `isSystemAdmin()` from `@/lib/utils/roleHierarchy`
 * - For user objects in memory: use `isSystemAdmin()` from `@/lib/utils/systemAdmin`
 * 
 * @param userId - User ID to check
 * @returns true if user is SYSTEM_ADMIN
 * @see {@link roleHierarchy.isSystemAdmin} for role string checks
 * @see {@link systemAdmin.isSystemAdmin} for user object checks
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
 * Check if user can approve client acceptance for a task
 * Rules: SYSTEM_ADMIN OR Administrator/Partner (ServiceLineUser.role = ADMINISTRATOR or PARTNER)
 */
export async function canApproveAcceptance(
  userId: string,
  taskId: number
): Promise<boolean> {
  try {
    // Check if user is a system admin
    const isAdmin = await isSystemAdmin(userId);
    if (isAdmin) return true;

    // Get the task's service line
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      select: { ServLineCode: true },
    });

    if (!task) {
      logger.warn('Task not found for approval check', { taskId });
      return false;
    }

    // Check if user is an Administrator or Partner in the task's service line
    const isServiceLinePartner = await isPartner(userId, task.ServLineCode);
    
    // Also verify they have task access
    if (isServiceLinePartner) {
      const hasTaskAccess = await prisma.taskTeam.findUnique({
        where: {
          taskId_userId: {
            taskId,
            userId,
          },
        },
      });
      
      return !!hasTaskAccess;
    }

    return false;
  } catch (error) {
    logger.error('Error checking approval permission', { userId, taskId, error });
    return false;
  }
}

/**
 * Check if user can approve engagement letter for a task
 * Same rules as acceptance: SYSTEM_ADMIN OR Administrator/Partner
 */
export async function canApproveEngagementLetter(
  userId: string,
  taskId: number
): Promise<boolean> {
  // Same logic as acceptance approval
  return canApproveAcceptance(userId, taskId);
}



