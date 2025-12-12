import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, isSystemAdmin } from '@/lib/services/auth/auth';
import { prisma } from '@/lib/db/prisma';
import { handleApiError } from '@/lib/utils/errorHandler';
import { validateRoleConsistency, AllocationValidationError } from '@/lib/validation/taskAllocation';
import { toTaskId } from '@/types/branded';

/**
 * POST /api/admin/users/[userId]/tasks
 * Add user to multiple tasks
 * Admin only
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ userId: string }> }
) {
  try {
    const currentUser = await getCurrentUser();
    
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const isAdmin = await isSystemAdmin(currentUser.id);
    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const params = await context.params;
    const body = await request.json();
    const { taskIds, role } = body;

    if (!taskIds || !Array.isArray(taskIds) || taskIds.length === 0) {
      return NextResponse.json({ error: 'Task IDs array is required' }, { status: 400 });
    }

    if (!role) {
      return NextResponse.json({ error: 'Role is required' }, { status: 400 });
    }

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: params.userId },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Add user to all specified tasks
    // For each task, check if user already has allocations and validate role consistency
    const results = await Promise.allSettled(
      taskIds.map(async (taskId: number) => {
        // Check for existing allocations
        const existingAllocations = await prisma.taskTeam.findMany({
          where: {
            taskId,
            userId: params.userId,
          },
        });

        if (existingAllocations.length > 0) {
          // User already on task - validate role consistency
          try {
            await validateRoleConsistency(toTaskId(taskId), params.userId, role);
          } catch (error) {
            if (error instanceof AllocationValidationError) {
              // Role mismatch - update all allocations to new role
              await prisma.taskTeam.updateMany({
                where: {
                  taskId,
                  userId: params.userId,
                },
                data: { role },
              });
              return { taskId, action: 'updated' };
            }
            throw error;
          }
          // Same role, no action needed
          return { taskId, action: 'exists' };
        } else {
          // Create new allocation without dates (ongoing assignment)
          await prisma.taskTeam.create({
            data: {
              taskId,
              userId: params.userId,
              role,
            },
          });
          return { taskId, action: 'created' };
        }
      })
    );

    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;

    return NextResponse.json({
      success: true,
      message: `Added user to ${successful} tasks${failed > 0 ? `, ${failed} failed` : ''}`,
      stats: { successful, failed },
    });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * PUT /api/admin/users/[userId]/tasks
 * Update user role across multiple tasks
 * Admin only
 */
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ userId: string }> }
) {
  try {
    const currentUser = await getCurrentUser();
    
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const isAdmin = await isSystemAdmin(currentUser.id);
    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const params = await context.params;
    const body = await request.json();
    const { taskIds, role } = body;

    if (!taskIds || !Array.isArray(taskIds) || taskIds.length === 0) {
      return NextResponse.json({ error: 'Task IDs array is required' }, { status: 400 });
    }

    if (!role) {
      return NextResponse.json({ error: 'Role is required' }, { status: 400 });
    }

    // Update role for specified tasks
    await prisma.taskTeam.updateMany({
      where: {
        userId: params.userId,
        taskId: { in: taskIds },
      },
      data: {
        role,
      },
    });

    return NextResponse.json({
      success: true,
      message: `Updated role to ${role} for ${taskIds.length} tasks`,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * DELETE /api/admin/users/[userId]/tasks
 * Remove user from multiple tasks
 * Admin only
 */
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ userId: string }> }
) {
  try {
    const currentUser = await getCurrentUser();
    
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const isAdmin = await isSystemAdmin(currentUser.id);
    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const params = await context.params;
    const body = await request.json();
    const { taskIds } = body;

    if (!taskIds || !Array.isArray(taskIds) || taskIds.length === 0) {
      return NextResponse.json({ error: 'Task IDs array is required' }, { status: 400 });
    }

    // Remove user from specified tasks
    await prisma.taskTeam.deleteMany({
      where: {
        userId: params.userId,
        taskId: { in: taskIds },
      },
    });

    return NextResponse.json({
      success: true,
      message: `Removed user from ${taskIds.length} tasks`,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

