/**
 * Task Authorization Service
 * Handles task-level permissions and access control
 * 
 * Consolidated from taskAccess.ts and taskAuthorization.ts
 */

import { prisma } from '@/lib/db/prisma';
import { logger } from '@/lib/utils/logger';
import { TaskId } from '@/types/branded';
import { isSystemAdmin, isPartner } from '@/lib/services/auth/authorization';
import { hasServiceLineRole } from '@/lib/utils/roleHierarchy';

/**
 * Task access type - indicates HOW the user has access
 */
export enum TaskAccessType {
  /** User is a SYSTEM_ADMIN with global access */
  SYSTEM_ADMIN = 'SYSTEM_ADMIN',
  /** User is Partner/Admin in task's service line (can see all tasks) */
  SERVICE_LINE_ADMIN = 'SERVICE_LINE_ADMIN',
  /** User is explicitly assigned as TaskTeam member */
  TASK_MEMBER = 'TASK_MEMBER',
  /** User has no access */
  NO_ACCESS = 'NO_ACCESS',
}

/**
 * Task access result with detailed metadata
 */
export interface TaskAccessResult {
  /** Whether user has access */
  canAccess: boolean;
  /** How the user has access */
  accessType: TaskAccessType;
  /** User's role in task (if applicable) */
  taskRole?: string;
  /** User's role in service line (if applicable) */
  serviceLineRole?: string;
  /** Service line the task belongs to */
  serviceLine?: string;
  /** Whether user is SYSTEM_ADMIN */
  isSystemAdmin: boolean;
}

/**
 * Check if user has access to a task with detailed metadata
 * 
 * Access Rules:
 * 1. SYSTEM_ADMIN → Full access (global)
 * 2. ADMIN/PARTNER in task's service line → Can see all tasks
 * 3. TaskTeam member → Access based on role
 * 
 * @param userId - User ID to check
 * @param taskId - Task ID to check access for
 * @param requiredRole - Optional minimum task role required
 * @returns Detailed access result
 */
export async function checkTaskAccess(
  userId: string,
  taskId: TaskId,
  requiredRole?: string
): Promise<TaskAccessResult> {
  try {
    // Check system admin access first
    const adminCheck = await isSystemAdmin(userId);
    
    if (adminCheck) {
      return {
        canAccess: true,
        accessType: TaskAccessType.SYSTEM_ADMIN,
        isSystemAdmin: true,
      };
    }

    // Get task info
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      select: { ServLineCode: true },
    });

    if (!task) {
      return {
        canAccess: false,
        accessType: TaskAccessType.NO_ACCESS,
        isSystemAdmin: false,
      };
    }

    // Auto-add partner/manager to team if they're not already members
    // This must run BEFORE access checks to ensure partner/manager are in the team
    try {
      const taskWithPartnerManager = await prisma.task.findUnique({
        where: { id: taskId },
        select: {
          TaskPartner: true,
          TaskManager: true,
        },
      });

      if (taskWithPartnerManager) {
        // Find all employees for partner and manager codes
        const employeeCodesToCheck: string[] = [];
        if (taskWithPartnerManager.TaskPartner) {
          employeeCodesToCheck.push(taskWithPartnerManager.TaskPartner);
        }
        if (taskWithPartnerManager.TaskManager && taskWithPartnerManager.TaskManager !== taskWithPartnerManager.TaskPartner) {
          employeeCodesToCheck.push(taskWithPartnerManager.TaskManager);
        }

        if (employeeCodesToCheck.length > 0) {
          const employees = await prisma.employee.findMany({
            where: {
              EmpCode: { in: employeeCodesToCheck },
              Active: 'Yes',
            },
            select: {
              EmpCode: true,
              WinLogon: true,
            },
          });

          for (const emp of employees) {
            if (!emp.WinLogon) continue;

            // Find user account for this employee (not limited to current user)
            const matchingUser = await prisma.user.findFirst({
              where: {
                OR: [
                  { email: { equals: emp.WinLogon } },
                  { email: { startsWith: emp.WinLogon.split('@')[0] } },
                  { email: { equals: `${emp.WinLogon}@mazarsinafrica.onmicrosoft.com` } },
                ],
              },
              select: { id: true },
            });

            if (matchingUser) {
              // Determine role based on whether this is partner or manager
              const isPartner = emp.EmpCode === taskWithPartnerManager.TaskPartner;
              const role = isPartner ? 'PARTNER' : 'MANAGER';

              // Check if already in team
              const existingMembership = await prisma.taskTeam.findFirst({
                where: { taskId, userId: matchingUser.id },
                select: { id: true },
              });

              if (!existingMembership) {
                try {
                  await prisma.taskTeam.create({
                    data: {
                      taskId,
                      userId: matchingUser.id,
                      role,
                    },
                  });
                  
                  logger.info('Auto-added partner/manager to team in checkTaskAccess', {
                    userId: matchingUser.id,
                    taskId,
                    role,
                    empCode: emp.EmpCode,
                  });
                } catch (createError: any) {
                  if (createError.code !== 'P2002') {
                    logger.error('Failed to auto-create TaskTeam in checkTaskAccess', {
                      userId: matchingUser.id,
                      taskId,
                      role,
                      empCode: emp.EmpCode,
                      error: createError,
                    });
                  }
                }
              }
            }
          }
        }
      }
    } catch (autoAddError) {
      logger.error('Error during partner/manager auto-add in checkTaskAccess', {
        userId,
        taskId,
        error: autoAddError,
      });
      // Continue with normal access check - don't fail the request
    }

    // Map ServLineCode to SubServlineGroupCode
    const serviceLineExternal = await prisma.serviceLineExternal.findFirst({
      where: { ServLineCode: task.ServLineCode },
      select: { 
        SubServlineGroupCode: true,
        masterCode: true,
      },
    });

    if (serviceLineExternal?.SubServlineGroupCode) {
      // Check if user has access to this sub-group with ADMINISTRATOR or PARTNER role
      const serviceLineUser = await prisma.serviceLineUser.findFirst({
        where: {
          userId, 
          subServiceLineGroup: serviceLineExternal.SubServlineGroupCode,
        },
        select: { role: true },
      });

      const isServiceLineAdmin = 
        serviceLineUser?.role === 'ADMINISTRATOR' || 
        serviceLineUser?.role === 'PARTNER';

      if (isServiceLineAdmin) {
        return {
          canAccess: true,
          accessType: TaskAccessType.SERVICE_LINE_ADMIN,
          serviceLineRole: serviceLineUser?.role,
          serviceLine: serviceLineExternal.masterCode || task.ServLineCode,
          isSystemAdmin: false,
        };
      }
    }

    // Check task membership
    const taskTeamMember = await prisma.taskTeam.findFirst({
      where: {
        taskId,
        userId,
      },
      select: { role: true },
    });

    if (!taskTeamMember) {
      return {
        canAccess: false,
        accessType: TaskAccessType.NO_ACCESS,
        serviceLine: task.ServLineCode,
        isSystemAdmin: false,
      };
    }

    // Get user's role in this sub-group if available
    let userServiceLineRole: string | undefined;
    if (serviceLineExternal?.SubServlineGroupCode) {
      const userSubGroupAssignment = await prisma.serviceLineUser.findFirst({
        where: {
          userId, 
          subServiceLineGroup: serviceLineExternal.SubServlineGroupCode,
        },
        select: { role: true },
      });
      userServiceLineRole = userSubGroupAssignment?.role;
    }

    // If a specific role is required, check if user has sufficient permissions
    if (requiredRole && !hasTaskRole(taskTeamMember.role, requiredRole)) {
      return {
        canAccess: false,
        accessType: TaskAccessType.TASK_MEMBER,
        taskRole: taskTeamMember.role,
        serviceLine: serviceLineExternal?.masterCode || task.ServLineCode,
        serviceLineRole: userServiceLineRole,
        isSystemAdmin: false,
      };
    }

    return {
      canAccess: true,
      accessType: TaskAccessType.TASK_MEMBER,
      taskRole: taskTeamMember.role,
      serviceLine: serviceLineExternal?.masterCode || task.ServLineCode,
      serviceLineRole: userServiceLineRole,
      isSystemAdmin: false,
    };
  } catch (error) {
    logger.error('Error checking task access', { userId, taskId, error });
    return {
      canAccess: false,
      accessType: TaskAccessType.NO_ACCESS,
      isSystemAdmin: false,
    };
  }
}

/**
 * Get user's role on a specific task
 */
export async function getTaskRole(
  userId: string,
  taskId: TaskId
): Promise<string | null> {
  try {
    // System Admins are treated as ADMIN on all tasks
    const isAdmin = await isSystemAdmin(userId);
    if (isAdmin) return 'ADMIN';

    // Get user's role from task team
    const taskTeamMember = await prisma.taskTeam.findFirst({
      where: {
        taskId,
        userId,
      },
      select: { role: true },
    });

    return taskTeamMember?.role || null;
  } catch (error) {
    logger.error('Error getting task role', { userId, taskId, error });
    return null;
  }
}

/**
 * Check if user can modify a task
 * User must be either:
 * 1. System Admin
 * 2. Service Line ADMINISTRATOR/PARTNER/MANAGER
 * 3. Task team member with SUPERVISOR or higher role
 */
export async function canModifyTask(
  userId: string,
  taskId: TaskId
): Promise<boolean> {
  try {
    const access = await checkTaskAccess(userId, taskId);
    
    if (!access.canAccess) {
      return false;
    }
    
    // SYSTEM_ADMIN can modify all tasks
    if (access.isSystemAdmin) {
      return true;
    }
    
    // Service line ADMINISTRATOR/PARTNER/MANAGER can modify tasks
    if (access.serviceLineRole && hasServiceLineRole(access.serviceLineRole, 'MANAGER')) {
      return true;
    }
    
    // Task team members with SUPERVISOR or higher can modify
    if (access.taskRole && hasServiceLineRole(access.taskRole, 'SUPERVISOR')) {
      return true;
    }
    
    return false;
  } catch (error) {
    logger.error('Error checking modify permission', { userId, taskId, error });
    return false;
  }
}

/**
 * Check if user can approve client acceptance for a task
 * Rules: SYSTEM_ADMIN OR Administrator/Partner (ServiceLineUser.role = ADMINISTRATOR or PARTNER)
 */
export async function canApproveAcceptance(
  userId: string,
  taskId: TaskId
): Promise<boolean> {
  try {
    // Delegate to authorization service which handles sub-groups
    const { canApproveAcceptance: canApproveFromAuth } = await import('@/lib/services/auth/authorization');
    return await canApproveFromAuth(userId, taskId);
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
  taskId: TaskId
): Promise<boolean> {
  // Same logic as acceptance approval
  return canApproveAcceptance(userId, taskId);
}

/**
 * Simple boolean check for task access
 * @param userId - User ID
 * @param taskId - Task ID
 * @param requiredRole - Optional minimum role required
 * @returns true if user can access task
 */
export async function hasTaskAccess(
  userId: string,
  taskId: TaskId,
  requiredRole?: string
): Promise<boolean> {
  const result = await checkTaskAccess(userId, taskId, requiredRole);
  return result.canAccess;
}

/**
 * Require task access, throw error if user doesn't have access
 * @param userId - User ID
 * @param taskId - Task ID
 * @param requiredRole - Optional minimum role required
 * @throws Error if user doesn't have access
 */
export async function requireTaskAccess(
  userId: string,
  taskId: TaskId,
  requiredRole?: string
): Promise<void> {
  const result = await checkTaskAccess(userId, taskId, requiredRole);
  
  if (!result.canAccess) {
    const message = requiredRole
      ? `Access denied: ${requiredRole} role required`
      : 'Access denied: Not a task member';
    throw new Error(message);
  }
}

/**
 * Get user's effective role in task
 * 
 * Returns the highest applicable role:
 * - SYSTEM_ADMIN → 'SYSTEM_ADMIN'
 * - Service Line Administrator → 'ADMINISTRATOR'
 * - Task Member → Task role
 * 
 * @param userId - User ID
 * @param taskId - Task ID
 * @returns Effective role or null if no access
 */
export async function getEffectiveTaskRole(
  userId: string,
  taskId: TaskId
): Promise<string | null> {
  const access = await checkTaskAccess(userId, taskId);
  
  if (!access.canAccess) {
    return null;
  }
  
  switch (access.accessType) {
    case TaskAccessType.SYSTEM_ADMIN:
      return 'SYSTEM_ADMIN';
    case TaskAccessType.SERVICE_LINE_ADMIN:
      return 'ADMINISTRATOR';
    case TaskAccessType.TASK_MEMBER:
      return access.taskRole || null;
    default:
      return null;
  }
}

/**
 * Format access type for display
 * @param accessType - Access type
 * @returns Formatted string
 */
export function formatAccessType(accessType: TaskAccessType): string {
  switch (accessType) {
    case TaskAccessType.SYSTEM_ADMIN:
      return 'System Administrator';
    case TaskAccessType.SERVICE_LINE_ADMIN:
      return 'Service Line Administrator';
    case TaskAccessType.TASK_MEMBER:
      return 'Task Member';
    case TaskAccessType.NO_ACCESS:
      return 'No Access';
    default:
      return 'Unknown';
  }
}

/**
 * Get detailed access summary for UI display
 * @param result - Task access result
 * @returns Human-readable access summary
 */
export function getAccessSummary(result: TaskAccessResult): string {
  if (!result.canAccess) {
    return 'You do not have access to this task.';
  }
  
  switch (result.accessType) {
    case TaskAccessType.SYSTEM_ADMIN:
      return 'You have full access as a System Administrator.';
    case TaskAccessType.SERVICE_LINE_ADMIN:
      return `You have access as a ${result.serviceLineRole} in the ${result.serviceLine} service line.`;
    case TaskAccessType.TASK_MEMBER:
      return `You are a task member with ${result.taskRole} role.`;
    default:
      return 'You have access to this task.';
  }
}

/**
 * Check if a user has a specific role or higher using ServiceLineRole hierarchy
 * Hierarchy: ADMINISTRATOR > PARTNER > MANAGER > SUPERVISOR > USER > VIEWER
 */
function hasTaskRole(userRole: string, requiredRole: string): boolean {
  return hasServiceLineRole(userRole, requiredRole);
}

/**
 * Check if user can manage task (assign users, delete, etc.)
 * 
 * Management access requires:
 * - SYSTEM_ADMIN, OR
 * - Service Line ADMINISTRATOR/PARTNER/MANAGER, OR
 * - Task MANAGER or higher role
 */
export async function canManageTask(
  userId: string,
  taskId: TaskId
): Promise<boolean> {
  try {
    const access = await checkTaskAccess(userId, taskId);
    
    if (!access.canAccess) {
      return false;
    }
    
    // SYSTEM_ADMIN can manage all tasks
    if (access.isSystemAdmin) {
      return true;
    }
    
    // Service line ADMINISTRATOR/PARTNER/MANAGER can manage tasks
    if (access.serviceLineRole && hasServiceLineRole(access.serviceLineRole, 'MANAGER')) {
      return true;
    }
    
    // Task team members with MANAGER or higher can manage
    if (access.taskRole && hasServiceLineRole(access.taskRole, 'MANAGER')) {
      return true;
    }
    
    return false;
  } catch (error) {
    logger.error('Error checking manage permission', { userId, taskId, error });
    return false;
  }
}

/**
 * Check if user can assign team members to a task
 * User must be either:
 * 1. System Admin
 * 2. Service Line ADMIN/PARTNER/MANAGER
 * 3. Task team member with ADMIN role
 */
export async function canAssignTeam(
  userId: string,
  taskId: TaskId
): Promise<boolean> {
  // Same rules as manage for now
  return canManageTask(userId, taskId);
}

/**
 * Check if user can delete a task
 * User must be either:
 * 1. System Admin
 * 2. Service Line ADMIN/PARTNER/MANAGER
 * 3. Task ADMIN role
 */
export async function canDeleteTask(
  userId: string,
  taskId: TaskId
): Promise<boolean> {
  // Same rules as manage
  return canManageTask(userId, taskId);
}

/**
 * Get all tasks a user has access to
 */
export async function getUserTaskIds(userId: string): Promise<number[]> {
  try {
    // System Admins have access to all tasks
    const isAdmin = await isSystemAdmin(userId);
    if (isAdmin) {
      const allTasks = await prisma.task.findMany({
        select: { id: true },
      });
      return allTasks.map(t => t.id);
    }

    // Get tasks where user is a team member
    const taskTeam = await prisma.taskTeam.findMany({
      where: { userId },
      select: { taskId: true },
    });

    return taskTeam.map(tt => tt.taskId);
  } catch (error) {
    logger.error('Error getting user tasks', { userId, error });
    return [];
  }
}



