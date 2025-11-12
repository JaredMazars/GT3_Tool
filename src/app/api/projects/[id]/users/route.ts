import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { handleApiError, AppError, ErrorCodes } from '@/lib/utils/errorHandler';
import { addProjectUserSchema } from '@/lib/utils/validation';
import { parseProjectId, successResponse } from '@/lib/utils/apiUtils';
import { getCurrentUser, checkProjectAccess } from '@/lib/services/auth/auth';
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
    const projectId = parseProjectId(params?.id);

    // Check project access
    const hasAccess = await checkProjectAccess(user.id, projectId);
    if (!hasAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get all users on this project
    const projectUsers = await prisma.projectUser.findMany({
      where: { projectId },
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

    return NextResponse.json(successResponse(projectUsers));
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
    const projectId = parseProjectId(params?.id);

    // Check if user has ADMIN role on project
    const hasAccess = await checkProjectAccess(user.id, projectId, 'ADMIN');
    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Only project admins can add users' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validatedData = addProjectUserSchema.parse(body);

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
    const existingProjectUser = await prisma.projectUser.findUnique({
      where: {
        projectId_userId: {
          projectId,
          userId: validatedData.userId,
        },
      },
    });

    if (existingProjectUser) {
      return NextResponse.json(
        { error: 'User is already on this project' },
        { status: 400 }
      );
    }

    // Add user to project
    const projectUser = await prisma.projectUser.create({
      data: {
        projectId,
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

    return NextResponse.json(successResponse(projectUser), { status: 201 });
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

