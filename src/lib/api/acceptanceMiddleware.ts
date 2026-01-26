/**
 * Authorization middleware for acceptance and continuance module
 * Validates user access to projects and questionnaires
 */

import { prisma } from '@/lib/db/prisma';
import { logger } from '@/lib/utils/logger';
import { ServiceLineRole } from '@/types';
import { hasServiceLineRole } from '@/lib/utils/roleHierarchy';

/**
 * Validate that a user has access to a project
 * Returns true if user has access (either through project membership or SYSTEM_ADMIN role)
 */
export async function validateAcceptanceAccess(
  taskId: number,
  userId: string,
  requiredRole?: ServiceLineRole | string
): Promise<boolean> {
  try {
    // Auto-add partner/manager before checking access
    try {
      const task = await prisma.task.findUnique({
        where: { id: taskId },
        select: {
          TaskPartner: true,
          TaskManager: true,
        },
      });

      if (task) {
        const employeeCodesToCheck: string[] = [];
        if (task.TaskPartner) employeeCodesToCheck.push(task.TaskPartner);
        if (task.TaskManager && task.TaskManager !== task.TaskPartner) {
          employeeCodesToCheck.push(task.TaskManager);
        }

        if (employeeCodesToCheck.length > 0) {
          const employees = await prisma.employee.findMany({
            where: { EmpCode: { in: employeeCodesToCheck }, Active: 'Yes' },
            select: { EmpCode: true, WinLogon: true },
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
              const isPartner = emp.EmpCode === task.TaskPartner;
              const role = isPartner ? 'PARTNER' : 'MANAGER';

              const existingMembership = await prisma.taskTeam.findFirst({
                where: { taskId, userId: matchingUser.id },
                select: { id: true },
              });

              if (!existingMembership) {
                try {
                  await prisma.taskTeam.create({
                    data: { taskId, userId: matchingUser.id, role },
                  });
                  logger.info('Auto-added partner/manager in validateAcceptanceAccess', {
                    userId: matchingUser.id, taskId, role, empCode: emp.EmpCode,
                  });
                } catch (createError: any) {
                  if (createError.code !== 'P2002') {
                    logger.error('Failed to auto-create TaskTeam in validateAcceptanceAccess', {
                      userId: matchingUser.id, taskId, role, error: createError,
                    });
                  }
                }
              }
            }
          }
        }
      }
    } catch (autoAddError) {
      logger.error('Error during auto-add in validateAcceptanceAccess', {
        userId, taskId, error: autoAddError,
      });
    }

    // Check if user has access to task
    const access = await prisma.taskTeam.findFirst({
      where: {
        taskId,
        userId,
      },
      select: {
        role: true,
        Task: {
          select: {
            ServLineCode: true,
          },
        },
      },
    });

    if (!access) {
      // Check if user is SYSTEM_ADMIN
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { role: true },
      });

      if (user?.role !== 'SYSTEM_ADMIN') {
        logger.warn('User access denied', {
          userId,
          taskId,
          reason: 'No task membership and not SYSTEM_ADMIN',
        });
        return false;
      }

      // SYSTEM_ADMIN has access
      return true;
    }

    // Check role if specified using ServiceLineRole hierarchy
    if (requiredRole) {
      if (!hasServiceLineRole(access.role, requiredRole)) {
        logger.warn('User role insufficient', {
          userId,
          taskId,
          userRole: access.role,
          requiredRole,
        });
        return false;
      }
    }

    return true;
  } catch (error) {
    logger.error('Error validating acceptance access', {
      error,
      userId,
      taskId,
    });
    return false;
  }
}

/**
 * Validate that a user can approve acceptance (Partner/Administrator or SYSTEM_ADMIN only)
 */
export async function canApproveAcceptanceValidation(
  taskId: number,
  userId: string
): Promise<boolean> {
  try {
    // Check if user is SYSTEM_ADMIN
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    if (user?.role === 'SYSTEM_ADMIN') {
      return true;
    }

    // Check if user is Partner/Administrator for the task's service line
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      select: { ServLineCode: true },
    });

    if (!task) {
      return false;
    }

    // Get master service line from ServLineCode
    const serviceLineMapping = await prisma.serviceLineExternal.findFirst({
      where: { ServLineCode: task.ServLineCode },
      select: { SubServlineGroupCode: true },
    });

    if (!serviceLineMapping?.SubServlineGroupCode) {
      return false;
    }

    const serviceLineAccess = await prisma.serviceLineUser.findFirst({
      where: {
        userId,
        subServiceLineGroup: serviceLineMapping.SubServlineGroupCode,
      },
      select: { role: true },
    });

    return serviceLineAccess?.role === 'ADMINISTRATOR';
  } catch (error) {
    logger.error('Error checking approval permission', {
      error,
      userId,
      taskId,
    });
    return false;
  }
}

/**
 * Validate document access
 * Checks that the document belongs to a questionnaire response for a task the user can access
 */
export async function validateDocumentAccess(
  documentId: number,
  userId: string
): Promise<{ hasAccess: boolean; taskId?: number }> {
  try {
    const document = await prisma.acceptanceDocument.findUnique({
      where: { id: documentId },
      select: {
        ClientAcceptanceResponse: {
          select: {
            taskId: true,
          },
        },
      },
    });

    if (!document) {
      return { hasAccess: false };
    }

    const taskId = document.ClientAcceptanceResponse.taskId;
    const hasAccess = await validateAcceptanceAccess(taskId, userId);

    return { hasAccess, taskId };
  } catch (error) {
    logger.error('Error validating document access', {
      error,
      userId,
      documentId,
    });
    return { hasAccess: false };
  }
}











