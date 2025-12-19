import { NextResponse } from 'next/server';
import { isSystemAdmin } from '@/lib/services/auth/auth';
import { prisma } from '@/lib/db/prisma';
import { secureRoute } from '@/lib/api/secureRoute';
import { validateRoleConsistency, AllocationValidationError } from '@/lib/validation/taskAllocation';
import { toTaskId } from '@/types/branded';
import { z } from 'zod';

const AddToTasksSchema = z.object({
  taskIds: z.array(z.number()).min(1, 'At least one task ID is required'),
  role: z.string().min(1, 'Role is required'),
});

const UpdateRoleSchema = z.object({
  taskIds: z.array(z.number()).min(1, 'At least one task ID is required'),
  role: z.string().min(1, 'Role is required'),
});

const RemoveFromTasksSchema = z.object({
  taskIds: z.array(z.number()).min(1, 'At least one task ID is required'),
});

/**
 * POST /api/admin/users/[userId]/tasks
 * Add user to multiple tasks
 * Admin only
 */
export const POST = secureRoute.mutationWithParams<typeof AddToTasksSchema, { userId: string }>({
  schema: AddToTasksSchema,
  handler: async (request, { user, data, params }) => {
    const isAdmin = await isSystemAdmin(user.id);
    if (!isAdmin) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    // Check if target user exists
    const targetUser = await prisma.user.findUnique({
      where: { id: params.userId },
    });

    if (!targetUser) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    // Add user to all specified tasks
    const results = await Promise.allSettled(
      data.taskIds.map(async (taskId: number) => {
        const existingAllocations = await prisma.taskTeam.findMany({
          where: {
            taskId,
            userId: params.userId,
          },
        });

        if (existingAllocations.length > 0) {
          try {
            await validateRoleConsistency(toTaskId(taskId), params.userId, data.role);
          } catch (error) {
            if (error instanceof AllocationValidationError) {
              await prisma.taskTeam.updateMany({
                where: {
                  taskId,
                  userId: params.userId,
                },
                data: { role: data.role },
              });
              return { taskId, action: 'updated' };
            }
            throw error;
          }
          return { taskId, action: 'exists' };
        } else {
          await prisma.taskTeam.create({
            data: {
              taskId,
              userId: params.userId,
              role: data.role,
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
  },
});

/**
 * PUT /api/admin/users/[userId]/tasks
 * Update user role across multiple tasks
 * Admin only
 */
export const PUT = secureRoute.mutationWithParams<typeof UpdateRoleSchema, { userId: string }>({
  schema: UpdateRoleSchema,
  handler: async (request, { user, data, params }) => {
    const isAdmin = await isSystemAdmin(user.id);
    if (!isAdmin) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    await prisma.taskTeam.updateMany({
      where: {
        userId: params.userId,
        taskId: { in: data.taskIds },
      },
      data: {
        role: data.role,
      },
    });

    return NextResponse.json({
      success: true,
      message: `Updated role to ${data.role} for ${data.taskIds.length} tasks`,
    });
  },
});

/**
 * DELETE /api/admin/users/[userId]/tasks
 * Remove user from multiple tasks
 * Admin only
 */
export const DELETE = secureRoute.mutationWithParams<typeof RemoveFromTasksSchema, { userId: string }>({
  schema: RemoveFromTasksSchema,
  handler: async (request, { user, data, params }) => {
    const isAdmin = await isSystemAdmin(user.id);
    if (!isAdmin) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    await prisma.taskTeam.deleteMany({
      where: {
        userId: params.userId,
        taskId: { in: data.taskIds },
      },
    });

    return NextResponse.json({
      success: true,
      message: `Removed user from ${data.taskIds.length} tasks`,
    });
  },
});
