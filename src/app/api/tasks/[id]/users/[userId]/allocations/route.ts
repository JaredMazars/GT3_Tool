import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { handleApiError, AppError } from '@/lib/utils/errorHandler';
import { CreateTaskAllocationSchema } from '@/lib/validation/schemas';
import { successResponse } from '@/lib/utils/apiUtils';
import { getCurrentUser } from '@/lib/services/auth/auth';
import { checkTaskAccess } from '@/lib/services/tasks/taskAuthorization';
import { toTaskId } from '@/types/branded';
import { z } from 'zod';
import { validateAllocation, AllocationValidationError } from '@/lib/validation/taskAllocation';

/**
 * GET /api/tasks/[id]/users/[userId]/allocations
 * List all allocation periods for a specific user on a task
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string; userId: string }> }
) {
  try {
    // Authenticate
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const params = await context.params;
    const taskId = toTaskId(params?.id);
    const targetUserId = params?.userId;

    if (!targetUserId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    // Check task access
    const hasAccess = await checkTaskAccess(user.id, taskId);
    if (!hasAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get all allocations
    const allocations = await prisma.taskTeam.findMany({
      where: {
        taskId,
        userId: targetUserId,
      },
      select: {
        id: true,
        role: true,
        startDate: true,
        endDate: true,
        allocatedHours: true,
        allocatedPercentage: true,
        actualHours: true,
        createdAt: true,
      },
      orderBy: [
        { startDate: 'asc' },
        { createdAt: 'asc' },
      ],
    });

    return NextResponse.json(successResponse({ allocations }));
  } catch (error) {
    return handleApiError(error, 'Get allocations');
  }
}

/**
 * POST /api/tasks/[id]/users/[userId]/allocations
 * Create an additional allocation period for an existing team member
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string; userId: string }> }
) {
  try {
    // Authenticate
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const params = await context.params;
    const taskId = toTaskId(params?.id);
    const targetUserId = params?.userId;

    if (!targetUserId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    // Check if user has ADMIN role on task
    const hasAccess = await checkTaskAccess(user.id, taskId, 'ADMIN');
    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Only task admins can create allocations' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validatedData = CreateTaskAllocationSchema.parse(body);

    // Ensure userId matches route parameter
    if (validatedData.userId !== targetUserId) {
      return NextResponse.json(
        { error: 'User ID in body must match route parameter' },
        { status: 400 }
      );
    }

    // Check if user exists on task
    const existingAllocation = await prisma.taskTeam.findFirst({
      where: {
        taskId,
        userId: targetUserId,
      },
    });

    if (!existingAllocation) {
      return NextResponse.json(
        { error: 'User must be on the task before creating additional allocations' },
        { status: 404 }
      );
    }

    // Validate the new allocation (overlap and role consistency)
    const startDate = validatedData.startDate ? new Date(validatedData.startDate) : null;
    const endDate = validatedData.endDate ? new Date(validatedData.endDate) : null;
    const role = validatedData.role || existingAllocation.role;

    try {
      await validateAllocation(
        taskId,
        targetUserId,
        startDate,
        endDate,
        role
      );
    } catch (error) {
      if (error instanceof AllocationValidationError) {
        return NextResponse.json(
          {
            error: error.message,
            metadata: error.details,
          },
          { status: 400 }
        );
      }
      throw error;
    }

    // Create the new allocation
    const newAllocation = await prisma.taskTeam.create({
      data: {
        taskId,
        userId: targetUserId,
        role,
        startDate,
        endDate,
        allocatedHours: validatedData.allocatedHours,
        allocatedPercentage: validatedData.allocatedPercentage,
      },
      select: {
        id: true,
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
    });

    return NextResponse.json(
      successResponse({ allocation: newAllocation }),
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      const message = error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join('; ');
      return handleApiError(
        new AppError(400, message),
        'Create allocation'
      );
    }
    return handleApiError(error, 'Create allocation');
  }
}

/**
 * DELETE /api/tasks/[id]/users/[userId]/allocations/[allocationId]
 * Remove a specific allocation period
 * Note: This endpoint would be at a different route with allocationId parameter
 * Kept here for documentation purposes
 */


