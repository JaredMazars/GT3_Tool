import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { handleApiError, AppError, ErrorCodes } from '@/lib/utils/errorHandler';
import { AddTaskTeamSchema } from '@/lib/validation/schemas';
import { successResponse } from '@/lib/utils/apiUtils';
import { getCurrentUser } from '@/lib/services/auth/auth';
import { checkTaskAccess } from '@/lib/services/tasks/taskAuthorization';
import { emailService } from '@/lib/services/email/emailService';
import { notificationService } from '@/lib/services/notifications/notificationService';
import { createUserAddedNotification } from '@/lib/services/notifications/templates';
import { NotificationType } from '@/types/notification';
import { logger } from '@/lib/utils/logger';
import { z } from 'zod';
import { toTaskId } from '@/types/branded';

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
    
    const taskId = toTaskId(params?.id);

    // Check project access
    const hasAccess = await checkTaskAccess(user.id, taskId);
    if (!hasAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get all users on this project with Employee data
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

    // Enrich with Employee data where available
    const enrichedTaskTeams = await Promise.all(
      taskTeams.map(async (tt) => {
        // Try to find employee by email or WinLogon (SQL Server doesn't support mode parameter)
        const emailPrefix = tt.User.email.split('@')[0];
        
        const employee = await prisma.employee.findFirst({
          where: {
            OR: [
              { WinLogon: { equals: tt.User.email } },
              { WinLogon: { startsWith: emailPrefix } },
            ],
            Active: 'Yes',
          },
          select: {
            EmpCatDesc: true,
            OfficeCode: true,
          },
        });

        return {
          ...tt,
          User: {
            ...tt.User,
            jobTitle: employee?.EmpCatDesc || null,
            officeLocation: employee?.OfficeCode || null,
          },
        };
      })
    );

    return NextResponse.json(successResponse(enrichedTaskTeams));
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
    
    const taskId = toTaskId(params?.id);

    // Get project details
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      select: { ServLineCode: true },
    });

    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    // Check authorization: user must be a project member OR service line admin
    const currentUserOnProject = await prisma.taskTeam.findUnique({
      where: {
        taskId_userId: { taskId, userId: user.id },
      },
    });

    // Check if user is service line admin
    // First, map ServLineCode to SubServlineGroupCode
    const serviceLineMapping = await prisma.serviceLineExternal.findFirst({
      where: { ServLineCode: task.ServLineCode },
      select: { SubServlineGroupCode: true },
    });

    let isServiceLineAdmin = false;
    if (serviceLineMapping?.SubServlineGroupCode) {
      const serviceLineAccess = await prisma.serviceLineUser.findUnique({
        where: {
          userId_subServiceLineGroup: {
            userId: user.id,
            subServiceLineGroup: serviceLineMapping.SubServlineGroupCode,
          },
        },
      });
      isServiceLineAdmin = serviceLineAccess?.role === 'ADMINISTRATOR' || serviceLineAccess?.role === 'PARTNER';
    }
    
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

    let targetUserId = validatedData.userId;

    // If no userId provided, try to find or create user from employee info
    if (!targetUserId && validatedData.employeeCode) {
      // Try to find existing user by email/winlogon
      if (validatedData.email) {
        const existingUser = await prisma.user.findFirst({
          where: {
            OR: [
              { email: { equals: validatedData.email } },
              { email: { startsWith: validatedData.email.split('@')[0] } },
            ],
          },
        });

        if (existingUser) {
          targetUserId = existingUser.id;
        } else {
          // Create a new user account for this employee
          // Generate a unique ID based on employee code
          const newUserId = `emp_${validatedData.employeeCode}_${Date.now()}`;
          const newUser = await prisma.user.create({
            data: {
              id: newUserId,
              name: validatedData.displayName || validatedData.employeeCode,
              email: validatedData.email || `${validatedData.employeeCode}@pending.local`,
              role: 'USER',
            },
          });
          targetUserId = newUser.id;
        }
      }
    }

    if (!targetUserId) {
      return NextResponse.json(
        { error: 'Unable to identify user. Please provide employee information.' },
        { status: 400 }
      );
    }

    // Check if user exists in system
    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId },
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
          userId: targetUserId,
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
        userId: targetUserId,
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
      const task = await prisma.task.findUnique({
        where: { id: taskId },
        select: { TaskDesc: true },
      });

      if (task && taskTeam.User) {
        await emailService.sendUserAddedEmail(
          taskId,
          task.TaskDesc,
          'N/A',
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

      if (taskForNotification) {
        // Get service line mapping for the notification URL
        const serviceLineMapping = await prisma.serviceLineExternal.findFirst({
          where: { ServLineCode: taskForNotification.ServLineCode },
          select: { 
            SubServlineGroupCode: true,
            masterCode: true,
          },
        });

        const notification = createUserAddedNotification(
          taskForNotification.TaskDesc,
          taskId,
          user.name || user.email,
          taskTeam.role,
          serviceLineMapping?.masterCode ?? undefined,
          serviceLineMapping?.SubServlineGroupCode ?? undefined,
          taskForNotification.Client?.id
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

