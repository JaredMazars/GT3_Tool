import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { AppError, ErrorCodes } from '@/lib/utils/errorHandler';
import { UpdateTaskTeamSchema } from '@/lib/validation/schemas';
import { successResponse, parseTaskId } from '@/lib/utils/apiUtils';
import { checkTaskAccess } from '@/lib/services/tasks/taskAuthorization';
import { emailService } from '@/lib/services/email/emailService';
import { notificationService } from '@/lib/services/notifications/notificationService';
import { createUserRemovedNotification, createUserRoleChangedNotification } from '@/lib/services/notifications/templates';
import { NotificationType } from '@/types/notification';
import { logger } from '@/lib/utils/logger';
import { secureRoute, Feature } from '@/lib/api/secureRoute';
import { invalidatePlannerCachesForServiceLine } from '@/lib/services/cache/cacheInvalidation';
import { toTaskId } from '@/types/branded';

export const GET = secureRoute.queryWithParams({
  feature: Feature.ACCESS_TASKS,
  handler: async (request, { user, params }) => {
    const taskId = toTaskId(parseTaskId(params?.id));
    const targetUserId = params?.userId;

    if (!targetUserId) {
      throw new AppError(400, 'User ID is required', ErrorCodes.VALIDATION_ERROR);
    }

    // Check project access
    const hasAccess = await checkTaskAccess(user.id, taskId);
    if (!hasAccess) {
      throw new AppError(403, 'Forbidden', ErrorCodes.FORBIDDEN);
    }

    // Get ALL allocations for this user on this task
    const allocations = await prisma.taskTeam.findMany({
      where: {
        taskId,
        userId: targetUserId,
      },
      select: {
        id: true,
        taskId: true,
        userId: true,
        role: true,
        startDate: true,
        endDate: true,
        allocatedHours: true,
        allocatedPercentage: true,
        actualHours: true,
        createdAt: true,
        User: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
      },
      orderBy: [
        { startDate: 'asc' },
        { createdAt: 'asc' },
        { id: 'asc' },
      ],
      take: 100,
    });

    if (allocations.length === 0) {
      throw new AppError(404, 'User not found on this project', ErrorCodes.NOT_FOUND);
    }

    // Return all allocations
    return NextResponse.json(successResponse({ allocations }));
  },
});

export const PUT = secureRoute.mutationWithParams({
  feature: Feature.MANAGE_TASKS,
  schema: UpdateTaskTeamSchema,
  handler: async (request, { user, params, data: validatedData }) => {
    const taskId = toTaskId(parseTaskId(params?.id));
    const targetUserId = params?.userId;

    if (!targetUserId) {
      throw new AppError(400, 'User ID is required', ErrorCodes.VALIDATION_ERROR);
    }

    // Check if user has ADMIN role on project
    const hasAccess = await checkTaskAccess(user.id, taskId, 'ADMIN');
    if (!hasAccess) {
      throw new AppError(403, 'Only project admins can update user roles', ErrorCodes.FORBIDDEN);
    }

    // Check if target user exists on project (get first allocation)
    const existingTaskTeam = await prisma.taskTeam.findFirst({
      where: {
        taskId,
        userId: targetUserId,
      },
      select: {
        id: true,
        role: true,
        taskId: true,
        userId: true,
      },
    });

    if (!existingTaskTeam) {
      throw new AppError(404, 'User not found on this project', ErrorCodes.NOT_FOUND);
    }

    // Prevent user from changing their own role
    if (targetUserId === user.id) {
      throw new AppError(400, 'You cannot change your own role', ErrorCodes.VALIDATION_ERROR);
    }

    // Check if this is the last ADMINISTRATOR/PARTNER on the project
    // Count distinct users with ADMINISTRATOR or PARTNER role
    const currentRole = existingTaskTeam.role as string;
    const isCurrentlyAdmin = currentRole === 'ADMINISTRATOR' || currentRole === 'PARTNER';
    const isNewRoleAdmin = validatedData.role === 'ADMINISTRATOR' || validatedData.role === 'PARTNER';
    
    if (isCurrentlyAdmin && !isNewRoleAdmin) {
      const adminUsers = await prisma.taskTeam.findMany({
        where: {
          taskId,
          role: { in: ['ADMINISTRATOR', 'PARTNER'] },
        },
        select: { userId: true },
        distinct: ['userId'],
        take: 10,
      });

      if (adminUsers.length === 1) {
        throw new AppError(400, 'Cannot remove the last administrator/partner from the project', ErrorCodes.VALIDATION_ERROR);
      }
    }

    // Capture old role for notification
    const oldRole = existingTaskTeam.role;

    // Update user role for ALL allocations of this user on this task
    await prisma.taskTeam.updateMany({
      where: {
        taskId,
        userId: targetUserId,
      },
      data: {
        role: validatedData.role,
      },
    });

    // Get updated allocations to return
    const updatedAllocations = await prisma.taskTeam.findMany({
      where: {
        taskId,
        userId: targetUserId,
      },
      select: {
        id: true,
        taskId: true,
        userId: true,
        role: true,
        startDate: true,
        endDate: true,
        allocatedHours: true,
        allocatedPercentage: true,
        actualHours: true,
        createdAt: true,
        User: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
      },
      orderBy: [
        { startDate: 'asc' },
        { createdAt: 'asc' },
        { id: 'asc' },
      ],
      take: 100,
    });

    const taskTeam = updatedAllocations[0]; // Use first allocation for notification

    // Get task and service line mapping for notification and cache invalidation
    const taskForNotification = await prisma.task.findUnique({
      where: { id: taskId },
      select: { 
        TaskDesc: true,
        ServLineCode: true,
        GSClientID: true,
        Client: {
          select: {
            id: true,
          },
        },
      },
    });

    let serviceLineMapping: { SubServlineGroupCode: string | null; masterCode: string | null } | null = null;
    if (taskForNotification?.ServLineCode) {
      serviceLineMapping = await prisma.serviceLineExternal.findFirst({
        where: { ServLineCode: taskForNotification.ServLineCode },
        select: { 
          SubServlineGroupCode: true,
          masterCode: true,
        },
      });
    }

    // Create in-app notification (non-blocking)
    try {
      if (taskForNotification && serviceLineMapping) {
        const notification = createUserRoleChangedNotification(
          taskForNotification.TaskDesc,
          taskId,
          user.name || user.email,
          oldRole,
          validatedData.role,
          serviceLineMapping.masterCode ?? undefined,
          serviceLineMapping.SubServlineGroupCode ?? undefined,
          taskForNotification.Client?.id
        );

        await notificationService.createNotification(
          targetUserId,
          NotificationType.USER_ROLE_CHANGED,
          notification.title,
          notification.message,
          taskId,
          notification.actionUrl,
          user.id
        );
      }
    } catch (notificationError) {
      logger.error('Failed to create project role changed notification:', notificationError);
    }

    // Invalidate planner cache for specific service line (multi-user consistency)
    if (serviceLineMapping?.masterCode && serviceLineMapping?.SubServlineGroupCode) {
      await invalidatePlannerCachesForServiceLine(
        serviceLineMapping.masterCode,
        serviceLineMapping.SubServlineGroupCode
      );
    }

    return NextResponse.json(successResponse(taskTeam));
  },
});

export const DELETE = secureRoute.mutationWithParams({
  feature: Feature.MANAGE_TASKS,
  handler: async (request, { user, params }) => {
    const taskId = toTaskId(parseTaskId(params?.id));
    const targetUserId = params?.userId;

    if (!targetUserId) {
      throw new AppError(400, 'User ID is required', ErrorCodes.VALIDATION_ERROR);
    }

    // Check if user has ADMIN role on project
    const hasAccess = await checkTaskAccess(user.id, taskId, 'ADMIN');
    if (!hasAccess) {
      throw new AppError(403, 'Only project admins can remove users', ErrorCodes.FORBIDDEN);
    }

    // Check if target user exists on project
    const existingTaskTeam = await prisma.taskTeam.findFirst({
      where: {
        taskId,
        userId: targetUserId,
      },
      select: {
        id: true,
        role: true,
        userId: true,
        User: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!existingTaskTeam) {
      throw new AppError(404, 'User not found on this project', ErrorCodes.NOT_FOUND);
    }

    // Prevent user from removing themselves
    if (targetUserId === user.id) {
      throw new AppError(400, 'You cannot remove yourself from the project', ErrorCodes.VALIDATION_ERROR);
    }

    // Check if user is the task's partner or manager
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      select: {
        TaskPartner: true,
        TaskManager: true,
        TaskDesc: true,
        ServLineCode: true,
      },
    });

    if (task) {
      // Find employee record for the target user
      const targetUserEmployee = await prisma.employee.findFirst({
        where: {
          OR: [
            { WinLogon: { equals: existingTaskTeam.User.email } },
            { WinLogon: { startsWith: existingTaskTeam.User.email.split('@')[0] } },
          ],
          Active: 'Yes',
        },
        select: { EmpCode: true },
      });

      if (targetUserEmployee) {
        const isPartner = targetUserEmployee.EmpCode === task.TaskPartner;
        const isManager = targetUserEmployee.EmpCode === task.TaskManager;

        if (isPartner || isManager) {
          const roleLabel = isPartner ? 'partner' : 'manager';
          throw new AppError(
            400,
            `Cannot remove this user as they are the task ${roleLabel}. This user will be automatically re-added when the task is accessed. To remove them, update the task ${roleLabel} assignment first.`,
            ErrorCodes.VALIDATION_ERROR
          );
        }
      }
    }

    // Check if this is the last ADMINISTRATOR/PARTNER on the project
    // Count distinct users with ADMINISTRATOR or PARTNER role
    const currentRole = existingTaskTeam.role as string;
    const isAdmin = currentRole === 'ADMINISTRATOR' || currentRole === 'PARTNER';
    
    if (isAdmin) {
      const adminUsers = await prisma.taskTeam.findMany({
        where: {
          taskId,
          role: { in: ['ADMINISTRATOR', 'PARTNER'] },
        },
        select: { userId: true },
        distinct: ['userId'],
        take: 10,
      });

      if (adminUsers.length === 1) {
        throw new AppError(400, 'Cannot remove the last administrator/partner from the project', ErrorCodes.VALIDATION_ERROR);
      }
    }

    // Remove ALL allocations for this user from project
    await prisma.taskTeam.deleteMany({
      where: {
        taskId,
        userId: targetUserId,
      },
    });

    // Send email notification (non-blocking)
    try {
      if (task && existingTaskTeam.User) {
        await emailService.sendUserRemovedEmail(
          taskId,
          task.TaskDesc,
          'N/A',
          {
            id: existingTaskTeam.User.id,
            name: existingTaskTeam.User.name,
            email: existingTaskTeam.User.email,
          },
          {
            id: user.id,
            name: user.name,
            email: user.email,
          }
        );
      }
    } catch (emailError) {
      // Log email error but don't fail the request
      logger.error('Failed to send user removed email:', emailError);
    }

    // Create in-app notification (non-blocking)
    try {
      if (task && existingTaskTeam.User) {
        const notification = createUserRemovedNotification(
          task.TaskDesc,
          taskId,
          user.name || user.email
        );

        await notificationService.createNotification(
          existingTaskTeam.User.id,
          NotificationType.USER_REMOVED,
          notification.title,
          notification.message,
          taskId,
          notification.actionUrl,
          user.id
        );
      }
    } catch (notificationError) {
      // Log notification error but don't fail the request
      logger.error('Failed to create in-app notification:', notificationError);
    }

    // Invalidate planner cache for specific service line (multi-user consistency)
    if (task?.ServLineCode) {
      const serviceLineMapping = await prisma.serviceLineExternal.findFirst({
        where: { ServLineCode: task.ServLineCode },
        select: { SubServlineGroupCode: true, masterCode: true },
      });
      if (serviceLineMapping?.masterCode && serviceLineMapping?.SubServlineGroupCode) {
        await invalidatePlannerCachesForServiceLine(
          serviceLineMapping.masterCode,
          serviceLineMapping.SubServlineGroupCode
        );
      }
    }

    logger.info('User removed from project', { taskId, targetUserId, removedBy: user.id });

    return NextResponse.json(
      successResponse({ message: 'User removed from project successfully' })
    );
  },
});

