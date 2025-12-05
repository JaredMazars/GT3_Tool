import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { handleApiError, AppError, ErrorCodes } from '@/lib/utils/errorHandler';
import { UpdateTaskTeamSchema } from '@/lib/validation/schemas';
import { parseTaskId, successResponse } from '@/lib/utils/apiUtils';
import { getCurrentUser, checkTaskAccess } from '@/lib/services/tasks/taskAuthorization';
import { emailService } from '@/lib/services/email/emailService';
import { notificationService } from '@/lib/services/notifications/notificationService';
import { createUserRemovedNotification, createUserRoleChangedNotification } from '@/lib/services/notifications/templates';
import { NotificationType } from '@/types/notification';
import { logger } from '@/lib/utils/logger';
import { z } from 'zod';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string; userId: string }> }
) {
  try {
    // Require authentication
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const params = await context.params;
    const taskId = parseTaskId(params?.id);
    const targetUserId = params?.userId;

    if (!targetUserId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    // Check project access
    const hasAccess = await checkTaskAccess(user.id, taskId);
    if (!hasAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const taskTeam = await prisma.taskTeam.findUnique({
      where: {
        taskId_userId: {
          taskId,
          userId: targetUserId,
        },
      },
      include: {
        User: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
      },
    });

    if (!taskTeam) {
      return NextResponse.json(
        { error: 'User not found on this project' },
        { status: 404 }
      );
    }

    return NextResponse.json(successResponse(taskTeam));
  } catch (error) {
    return handleApiError(error, 'Get Project User');
  }
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string; userId: string }> }
) {
  try {
    // Require authentication
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const params = await context.params;
    const taskId = parseTaskId(params?.id);
    const targetUserId = params?.userId;

    if (!targetUserId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    // Check if user has ADMIN role on project
    const hasAccess = await checkTaskAccess(user.id, taskId, 'ADMIN');
    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Only project admins can update user roles' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validatedData = UpdateTaskTeamSchema.parse(body);

    // Check if target user exists on project
    const existingTaskTeam = await prisma.taskTeam.findUnique({
      where: {
        taskId_userId: {
          taskId,
          userId: targetUserId,
        },
      },
    });

    if (!existingTaskTeam) {
      return NextResponse.json(
        { error: 'User not found on this project' },
        { status: 404 }
      );
    }

    // Prevent user from changing their own role
    if (targetUserId === user.id) {
      return NextResponse.json(
        { error: 'You cannot change your own role' },
        { status: 400 }
      );
    }

    // Check if this is the last ADMIN on the project
    if (existingTaskTeam.role === 'ADMIN' && validatedData.role !== 'ADMIN') {
      const adminCount = await prisma.taskTeam.count({
        where: {
          taskId,
          role: 'ADMIN',
        },
      });

      if (adminCount === 1) {
        return NextResponse.json(
          { error: 'Cannot remove the last admin from the project' },
          { status: 400 }
        );
      }
    }

    // Capture old role for notification
    const oldRole = existingTaskTeam.role;

    // Update user role
    const taskTeam = await prisma.taskTeam.update({
      where: {
        taskId_userId: {
          taskId,
          userId: targetUserId,
        },
      },
      data: {
        role: validatedData.role,
      },
      include: {
        User: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
      },
    });

    // Create in-app notification (non-blocking)
    try {
      const project = await prisma.project.findUnique({
        where: { id: taskId },
        select: { name: true },
      });

      if (project) {
        const notification = createUserRoleChangedNotification(
          project.name,
          taskId,
          user.name || user.email,
          oldRole,
          validatedData.role
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

    return NextResponse.json(successResponse(taskTeam));
  } catch (error) {
    if (error instanceof z.ZodError) {
      const message = error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join('; ');
      return handleApiError(
        new AppError(400, message, ErrorCodes.VALIDATION_ERROR),
        'Update Project User'
      );
    }
    
    return handleApiError(error, 'Update Project User');
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string; userId: string }> }
) {
  try {
    // Require authentication
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const params = await context.params;
    const taskId = parseTaskId(params?.id);
    const targetUserId = params?.userId;

    if (!targetUserId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    // Check if user has ADMIN role on project
    const hasAccess = await checkTaskAccess(user.id, taskId, 'ADMIN');
    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Only project admins can remove users' },
        { status: 403 }
      );
    }

    // Check if target user exists on project
    const existingTaskTeam = await prisma.taskTeam.findUnique({
      where: {
        taskId_userId: {
          taskId,
          userId: targetUserId,
        },
      },
      include: {
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
      return NextResponse.json(
        { error: 'User not found on this project' },
        { status: 404 }
      );
    }

    // Prevent user from removing themselves
    if (targetUserId === user.id) {
      return NextResponse.json(
        { error: 'You cannot remove yourself from the project' },
        { status: 400 }
      );
    }

    // Check if this is the last ADMIN on the project
    if (existingTaskTeam.role === 'ADMIN') {
      const adminCount = await prisma.taskTeam.count({
        where: {
          taskId,
          role: 'ADMIN',
        },
      });

      if (adminCount === 1) {
        return NextResponse.json(
          { error: 'Cannot remove the last admin from the project' },
          { status: 400 }
        );
      }
    }

    // Get project details for email before deletion
    const project = await prisma.project.findUnique({
      where: { id: taskId },
      select: { name: true, projectType: true },
    });

    // Remove user from project
    await prisma.taskTeam.delete({
      where: {
        taskId_userId: {
          taskId,
          userId: targetUserId,
        },
      },
    });

    // Send email notification (non-blocking)
    try {
      if (project && existingTaskTeam.User) {
        await emailService.sendUserRemovedEmail(
          taskId,
          project.name,
          project.projectType,
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
      if (project && existingTaskTeam.User) {
        const notification = createUserRemovedNotification(
          project.name,
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

    return NextResponse.json(
      successResponse({ message: 'User removed from project successfully' })
    );
  } catch (error) {
    return handleApiError(error, 'Remove Project User');
  }
}

