import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { AppError, ErrorCodes } from '@/lib/utils/errorHandler';
import { CreateTaskAllocationSchema } from '@/lib/validation/schemas';
import { successResponse, parseTaskId } from '@/lib/utils/apiUtils';
import { checkTaskAccess } from '@/lib/services/tasks/taskAuthorization';
import { validateAllocation, AllocationValidationError } from '@/lib/validation/taskAllocation';
import { secureRoute, Feature } from '@/lib/api/secureRoute';
import { toTaskId } from '@/types/branded';
import { invalidatePlannerCachesForServiceLine } from '@/lib/services/cache/cacheInvalidation';

/**
 * GET /api/tasks/[id]/users/[userId]/allocations
 * List all allocation periods for a specific user on a task
 */
export const GET = secureRoute.queryWithParams({
  feature: Feature.ACCESS_TASKS,
  handler: async (request, { user, params }) => {
    const taskId = toTaskId(parseTaskId(params?.id));
    const targetUserId = params?.userId;

    if (!targetUserId) {
      throw new AppError(400, 'User ID is required', ErrorCodes.VALIDATION_ERROR);
    }

    // Check task access
    const hasAccess = await checkTaskAccess(user.id, taskId);
    if (!hasAccess) {
      throw new AppError(403, 'Forbidden', ErrorCodes.FORBIDDEN);
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
        { id: 'asc' },
      ],
      take: 100,
    });

    return NextResponse.json(successResponse({ allocations }));
  },
});

/**
 * POST /api/tasks/[id]/users/[userId]/allocations
 * Create an additional allocation period for an existing team member
 */
export const POST = secureRoute.mutationWithParams({
  feature: Feature.MANAGE_TASKS,
  schema: CreateTaskAllocationSchema,
  handler: async (request, { user, params, data: validatedData }) => {
    const taskId = toTaskId(parseTaskId(params?.id));
    const targetUserId = params?.userId;

    if (!targetUserId) {
      throw new AppError(400, 'User ID is required', ErrorCodes.VALIDATION_ERROR);
    }

    // Check if user has ADMIN role on task
    const hasAccess = await checkTaskAccess(user.id, taskId, 'ADMIN');
    if (!hasAccess) {
      throw new AppError(403, 'Only task admins can create allocations', ErrorCodes.FORBIDDEN);
    }

    // Ensure userId matches route parameter
    if (validatedData.userId !== targetUserId) {
      throw new AppError(400, 'User ID in body must match route parameter', ErrorCodes.VALIDATION_ERROR);
    }

    // Check if user exists on task
    const existingAllocation = await prisma.taskTeam.findFirst({
      where: {
        taskId,
        userId: targetUserId,
      },
      select: { id: true, role: true },
    });

    if (!existingAllocation) {
      throw new AppError(404, 'User must be on the task before creating additional allocations', ErrorCodes.NOT_FOUND);
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
        throw new AppError(400, error.message, ErrorCodes.VALIDATION_ERROR, error.details);
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

    // Invalidate planner cache for specific service line (multi-user consistency)
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      select: { ServLineCode: true }
    });
    if (task?.ServLineCode) {
      const serviceLineMapping = await prisma.serviceLineExternal.findFirst({
        where: { ServLineCode: task.ServLineCode },
        select: { SubServlineGroupCode: true, masterCode: true }
      });
      if (serviceLineMapping?.masterCode && serviceLineMapping?.SubServlineGroupCode) {
        await invalidatePlannerCachesForServiceLine(
          serviceLineMapping.masterCode,
          serviceLineMapping.SubServlineGroupCode
        );
      }
    }

    return NextResponse.json(
      successResponse({ allocation: newAllocation }),
      { status: 201 }
    );
  },
});

/**
 * DELETE /api/tasks/[id]/users/[userId]/allocations/[allocationId]
 * Remove a specific allocation period
 * Note: This endpoint would be at a different route with allocationId parameter
 * Kept here for documentation purposes
 */














