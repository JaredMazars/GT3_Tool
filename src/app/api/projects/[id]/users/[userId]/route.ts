import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { handleApiError, AppError, ErrorCodes } from '@/lib/utils/errorHandler';
import { UpdateProjectUserSchema } from '@/lib/validation/schemas';
import { parseProjectId, successResponse } from '@/lib/utils/apiUtils';
import { getCurrentUser, checkProjectAccess } from '@/lib/services/auth/auth';
import { emailService } from '@/lib/services/email/emailService';
import { notificationService } from '@/lib/services/notifications/notificationService';
import { createUserRemovedNotification } from '@/lib/services/notifications/templates';
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
    const projectId = parseProjectId(params?.id);
    const targetUserId = params?.userId;

    if (!targetUserId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    // Check project access
    const hasAccess = await checkProjectAccess(user.id, projectId);
    if (!hasAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const projectUser = await prisma.projectUser.findUnique({
      where: {
        projectId_userId: {
          projectId,
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

    if (!projectUser) {
      return NextResponse.json(
        { error: 'User not found on this project' },
        { status: 404 }
      );
    }

    return NextResponse.json(successResponse(projectUser));
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
    const projectId = parseProjectId(params?.id);
    const targetUserId = params?.userId;

    if (!targetUserId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    // Check if user has ADMIN role on project
    const hasAccess = await checkProjectAccess(user.id, projectId, 'ADMIN');
    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Only project admins can update user roles' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validatedData = UpdateProjectUserSchema.parse(body);

    // Check if target user exists on project
    const existingProjectUser = await prisma.projectUser.findUnique({
      where: {
        projectId_userId: {
          projectId,
          userId: targetUserId,
        },
      },
    });

    if (!existingProjectUser) {
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
    if (existingProjectUser.role === 'ADMIN' && validatedData.role !== 'ADMIN') {
      const adminCount = await prisma.projectUser.count({
        where: {
          projectId,
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

    // Update user role
    const projectUser = await prisma.projectUser.update({
      where: {
        projectId_userId: {
          projectId,
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

    return NextResponse.json(successResponse(projectUser));
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
    const projectId = parseProjectId(params?.id);
    const targetUserId = params?.userId;

    if (!targetUserId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    // Check if user has ADMIN role on project
    const hasAccess = await checkProjectAccess(user.id, projectId, 'ADMIN');
    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Only project admins can remove users' },
        { status: 403 }
      );
    }

    // Check if target user exists on project
    const existingProjectUser = await prisma.projectUser.findUnique({
      where: {
        projectId_userId: {
          projectId,
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

    if (!existingProjectUser) {
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
    if (existingProjectUser.role === 'ADMIN') {
      const adminCount = await prisma.projectUser.count({
        where: {
          projectId,
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
      where: { id: projectId },
      select: { name: true, projectType: true },
    });

    // Remove user from project
    await prisma.projectUser.delete({
      where: {
        projectId_userId: {
          projectId,
          userId: targetUserId,
        },
      },
    });

    // Send email notification (non-blocking)
    try {
      if (project && existingProjectUser.User) {
        await emailService.sendUserRemovedEmail(
          projectId,
          project.name,
          project.projectType,
          {
            id: existingProjectUser.User.id,
            name: existingProjectUser.User.name,
            email: existingProjectUser.User.email,
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
      if (project && existingProjectUser.User) {
        const notification = createUserRemovedNotification(
          project.name,
          projectId,
          user.name || user.email
        );

        await notificationService.createNotification(
          existingProjectUser.User.id,
          NotificationType.USER_REMOVED,
          notification.title,
          notification.message,
          projectId,
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

