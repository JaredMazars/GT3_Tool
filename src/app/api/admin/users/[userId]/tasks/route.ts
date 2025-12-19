import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { secureRoute, Feature } from '@/lib/api/secureRoute';
import { validateRoleConsistency, AllocationValidationError } from '@/lib/validation/taskAllocation';
import { toTaskId } from '@/types/branded';
import { z } from 'zod';
import { AppError, ErrorCodes } from '@/lib/utils/errorHandler';
import { successResponse } from '@/lib/utils/apiUtils';

const AddToTasksSchema = z.object({
  taskIds: z.array(z.number().int().positive()).min(1, 'At least one task ID is required').max(100, 'Maximum 100 tasks per request'),
  role: z.enum(['ADMINISTRATOR', 'PARTNER', 'MANAGER', 'SUPERVISOR', 'USER', 'VIEWER']),
}).strict();

const UpdateRoleSchema = z.object({
  taskIds: z.array(z.number().int().positive()).min(1, 'At least one task ID is required').max(100, 'Maximum 100 tasks per request'),
  role: z.enum(['ADMINISTRATOR', 'PARTNER', 'MANAGER', 'SUPERVISOR', 'USER', 'VIEWER']),
}).strict();

const RemoveFromTasksSchema = z.object({
  taskIds: z.array(z.number().int().positive()).min(1, 'At least one task ID is required').max(100, 'Maximum 100 tasks per request'),
}).strict();

/**
 * POST /api/admin/users/[userId]/tasks
 * Add user to multiple tasks
 * Admin only
 */
export const POST = secureRoute.mutationWithParams<typeof AddToTasksSchema, { userId: string }>({
  feature: Feature.MANAGE_USERS,
  schema: AddToTasksSchema,
  handler: async (request, { data, params }) => {
    if (!params.userId) {
      throw new AppError(400, 'User ID is required', ErrorCodes.VALIDATION_ERROR);
    }

    // Check if target user exists
    const targetUser = await prisma.user.findUnique({
      where: { id: params.userId },
      select: { id: true },
    });

    if (!targetUser) {
      throw new AppError(404, 'User not found', ErrorCodes.NOT_FOUND);
    }

    // Add user to all specified tasks
    const results = await Promise.allSettled(
      data.taskIds.map(async (taskId: number) => {
        const existingAllocations = await prisma.taskTeam.findMany({
          where: {
            taskId,
            userId: params.userId,
          },
          select: { id: true, role: true },
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
            select: { id: true },
          });
          return { taskId, action: 'created' };
        }
      })
    );

    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;

    return NextResponse.json(successResponse({
      message: `Added user to ${successful} tasks${failed > 0 ? `, ${failed} failed` : ''}`,
      stats: { successful, failed },
    }));
  },
});

/**
 * PUT /api/admin/users/[userId]/tasks
 * Update user role across multiple tasks
 * Admin only
 */
export const PUT = secureRoute.mutationWithParams<typeof UpdateRoleSchema, { userId: string }>({
  feature: Feature.MANAGE_USERS,
  schema: UpdateRoleSchema,
  handler: async (request, { data, params }) => {
    if (!params.userId) {
      throw new AppError(400, 'User ID is required', ErrorCodes.VALIDATION_ERROR);
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

    return NextResponse.json(successResponse({
      message: `Updated role to ${data.role} for ${data.taskIds.length} tasks`,
    }));
  },
});

/**
 * DELETE /api/admin/users/[userId]/tasks
 * Remove user from multiple tasks
 * Admin only
 */
export const DELETE = secureRoute.mutationWithParams<typeof RemoveFromTasksSchema, { userId: string }>({
  feature: Feature.MANAGE_USERS,
  schema: RemoveFromTasksSchema,
  handler: async (request, { data, params }) => {
    if (!params.userId) {
      throw new AppError(400, 'User ID is required', ErrorCodes.VALIDATION_ERROR);
    }

    await prisma.taskTeam.deleteMany({
      where: {
        userId: params.userId,
        taskId: { in: data.taskIds },
      },
    });

    return NextResponse.json(successResponse({
      message: `Removed user from ${data.taskIds.length} tasks`,
    }));
  },
});
