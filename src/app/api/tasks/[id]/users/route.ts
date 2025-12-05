import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { handleApiError, AppError, ErrorCodes } from '@/lib/utils/errorHandler';
import { AddTaskTeamSchema } from '@/lib/validation/schemas';
import { parseTaskId, successResponse } from '@/lib/utils/apiUtils';
import { getCurrentUser, checkTaskAccess } from '@/lib/services/tasks/taskAuthorization';
import { emailService } from '@/lib/services/email/emailService';
import { notificationService } from '@/lib/services/notifications/notificationService';
import { createUserAddedNotification } from '@/lib/services/notifications/templates';
import { NotificationType } from '@/types/notification';
import { logger } from '@/lib/utils/logger';
import { z } from 'zod';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    // Require authentication
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const params = await context.params;
    
    // Handle "new" route
    if (params?.id === 'new') {
      return NextResponse.json(
        { error: 'Invalid route - project must be created first' },
        { status: 404 }
      );
    }
    
    const taskId = parseTaskId(params?.id);

    // Check project access
    const hasAccess = await checkTaskAccess(user.id, taskId);
    if (!hasAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get all users on this project
    const taskTeams = await prisma.taskTeam.findMany({
      where: { taskId },
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
      orderBy: { createdAt: 'asc' },
    });

    return NextResponse.json(successResponse(taskTeams));
  } catch (error) {
    return handleApiError(error, 'Get Project Users');
  }
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    // Require authentication
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const params = await context.params;
    
    // Handle "new" route
    if (params?.id === 'new') {
      return NextResponse.json(
        { error: 'Invalid route - project must be created first' },
        { status: 404 }
      );
    }
    
    const taskId = parseTaskId(params?.id);

    // Get project details
    const project = await prisma.project.findUnique({
      where: { id: taskId },
      select: { serviceLine: true },
    });

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Check authorization: user must be a project member OR service line admin
    const currentUserOnProject = await prisma.taskTeam.findUnique({
      where: {
        taskId_userId: { taskId, userId: user.id },
      },
    });

    // Check if user is service line admin
    const serviceLineAccess = await prisma.serviceLineUser.findUnique({
      where: {
        userId_serviceLine: {
          userId: user.id,
          serviceLine: project.serviceLine,
        },
      },
    });

    const isServiceLineAdmin = serviceLineAccess?.role === 'ADMINISTRATOR' || serviceLineAccess?.role === 'PARTNER';
    
    // Get user from earlier check for role
    const currentUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { role: true },
    });
    const isSystemAdmin = currentUser?.role === 'SYSTEM_ADMIN';

    // Allow if user is: System Admin OR project member OR service line admin
    if (!currentUserOnProject && !isServiceLineAdmin && !isSystemAdmin) {
      return NextResponse.json(
        { error: 'You must be a project member or service line admin to add users' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validatedData = AddTaskTeamSchema.parse(body);

    // Check if user exists in system
    const targetUser = await prisma.user.findUnique({
      where: { id: validatedData.userId },
    });

    if (!targetUser) {
      return NextResponse.json(
        { error: 'User not found in system' },
        { status: 404 }
      );
    }

    // Check if user is already on project
    const existingTaskTeam = await prisma.taskTeam.findUnique({
      where: {
        taskId_userId: {
          taskId,
          userId: validatedData.userId,
        },
      },
    });

    if (existingTaskTeam) {
      return NextResponse.json(
        { error: 'User is already on this project' },
        { status: 400 }
      );
    }

    // Add user to project
    const taskTeam = await prisma.taskTeam.create({
      data: {
        taskId,
        userId: validatedData.userId,
        role: validatedData.role || 'VIEWER',
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

    // Send email notification (non-blocking)
    try {
      // Get project details for email
      const project = await prisma.project.findUnique({
        where: { id: taskId },
        select: { name: true, projectType: true },
      });

      if (project && taskTeam.User) {
        await emailService.sendUserAddedEmail(
          taskId,
          project.name,
          project.projectType,
          {
            id: taskTeam.User.id,
            name: taskTeam.User.name,
            email: taskTeam.User.email,
          },
          {
            id: user.id,
            name: user.name,
            email: user.email,
          },
          taskTeam.role
        );
      }
    } catch (emailError) {
      // Log email error but don't fail the request
      logger.error('Failed to send user added email:', emailError);
    }

    // Create in-app notification (non-blocking)
    try {
      const project = await prisma.project.findUnique({
        where: { id: taskId },
        select: { name: true },
      });

      if (project) {
        const notification = createUserAddedNotification(
          project.name,
          taskId,
          user.name || user.email,
          taskTeam.role
        );

        await notificationService.createNotification(
          taskTeam.userId,
          NotificationType.USER_ADDED,
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

    return NextResponse.json(successResponse(taskTeam), { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      const message = error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join('; ');
      return handleApiError(
        new AppError(400, message, ErrorCodes.VALIDATION_ERROR),
        'Add Project User'
      );
    }
    
    return handleApiError(error, 'Add Project User');
  }
}

