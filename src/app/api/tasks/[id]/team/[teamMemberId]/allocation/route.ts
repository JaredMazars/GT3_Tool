import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { checkTaskAccess } from '@/lib/services/tasks/taskAuthorization';
import { successResponse, parseTaskId, parseNumericId } from '@/lib/utils/apiUtils';
import { AppError, ErrorCodes } from '@/lib/utils/errorHandler';
import { toTaskId } from '@/types/branded';
import { calculateBusinessDays } from '@/lib/utils/dateUtils';
import { z } from 'zod';
import { validateAllocation, AllocationValidationError } from '@/lib/validation/taskAllocation';
import { invalidatePlannerCachesForServiceLine } from '@/lib/services/cache/cacheInvalidation';
import { secureRoute, Feature } from '@/lib/api/secureRoute';

const allocationUpdateSchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  allocatedHours: z.number().min(0).nullable().optional(),
  allocatedPercentage: z.number().min(0).max(100).nullable().optional(),
  actualHours: z.number().min(0).nullable().optional(),
  role: z.enum(['ADMINISTRATOR', 'PARTNER', 'MANAGER', 'SUPERVISOR', 'USER', 'VIEWER']).optional()
}).strict();

/**
 * PUT /api/tasks/[id]/team/[teamMemberId]/allocation
 * Update allocation details for a team member
 */
export const PUT = secureRoute.mutationWithParams({
  feature: Feature.MANAGE_TASKS,
  schema: allocationUpdateSchema,
  handler: async (request, { user, params, data: validatedData }) => {
    // 2. Parse and validate IDs
    const taskId = toTaskId(parseTaskId(params.id));
    const teamMemberId = parseNumericId(params.teamMemberId, 'team member ID');

    // 3. Check task access - must be ADMIN to update allocations
    const accessResult = await checkTaskAccess(user.id, taskId, 'ADMIN');
    if (!accessResult.canAccess) {
      throw new AppError(403, 'Only task admins can update allocations', ErrorCodes.FORBIDDEN);
    }

    // 5. Validate date logic (INCLUSIVE end date model)
    if (validatedData.startDate && validatedData.endDate) {
      const start = new Date(validatedData.startDate);
      const end = new Date(validatedData.endDate);
      if (start > end) {
        throw new AppError(400, 'End date cannot be before start date', ErrorCodes.VALIDATION_ERROR);
      }
    }

    // 6. Find the team member record
    const teamMember = await prisma.taskTeam.findUnique({
      where: { id: teamMemberId },
      select: {
        id: true,
        taskId: true,
        userId: true,
        role: true,
        allocatedHours: true,
        allocatedPercentage: true,
        startDate: true,
        endDate: true
      }
    });

    if (!teamMember || teamMember.taskId !== taskId) {
      throw new AppError(404, 'Team member not found', ErrorCodes.NOT_FOUND);
    }

    // 6a. Validate allocation (overlap and role consistency)
    const finalStartDate = validatedData.startDate 
      ? new Date(validatedData.startDate) 
      : teamMember.startDate;
    const finalEndDate = validatedData.endDate 
      ? new Date(validatedData.endDate) 
      : teamMember.endDate;
    const finalRole = validatedData.role || teamMember.role;

    try {
      await validateAllocation(
        taskId,
        teamMember.userId,
        finalStartDate,
        finalEndDate,
        finalRole,
        teamMemberId // Exclude current allocation from overlap check
      );
    } catch (error) {
      if (error instanceof AllocationValidationError) {
        throw new AppError(400, error.message, ErrorCodes.VALIDATION_ERROR, error.details);
      }
      throw error;
    }

    // 7. Auto-calculate percentage if dates are changing but percentage is not provided
    let calculatedData: { allocatedPercentage?: number } = {};
    
    if ((validatedData.startDate || validatedData.endDate) && 
        validatedData.allocatedPercentage === undefined) {
      
      // Determine final dates
      const finalStartDate = validatedData.startDate 
        ? new Date(validatedData.startDate) 
        : teamMember.startDate;
      const finalEndDate = validatedData.endDate 
        ? new Date(validatedData.endDate) 
        : teamMember.endDate;
      
      // Determine allocated hours (use new value if provided, otherwise use existing)
      const allocatedHours = validatedData.allocatedHours !== undefined
        ? validatedData.allocatedHours
        : (teamMember.allocatedHours ? parseFloat(teamMember.allocatedHours.toString()) : null);
      
      // Calculate new percentage if we have all required data
      if (finalStartDate && finalEndDate && allocatedHours) {
        const businessDays = calculateBusinessDays(finalStartDate, finalEndDate);
        const availableHours = businessDays * 8;
        
        const newPercentage = availableHours > 0 
          ? Math.round((allocatedHours / availableHours) * 100) 
          : 0;
        
        calculatedData = { allocatedPercentage: newPercentage };
      }
    }

    // 8. Update allocation
    const updated = await prisma.taskTeam.update({
      where: { id: teamMemberId },
      data: {
        ...(validatedData.startDate && { startDate: new Date(validatedData.startDate) }),
        ...(validatedData.endDate && { endDate: new Date(validatedData.endDate) }),
        ...(validatedData.allocatedHours !== undefined && { allocatedHours: validatedData.allocatedHours }),
        ...(validatedData.allocatedPercentage !== undefined && { allocatedPercentage: validatedData.allocatedPercentage }),
        ...calculatedData, // Include auto-calculated percentage
        ...(validatedData.actualHours !== undefined && { actualHours: validatedData.actualHours }),
        ...(validatedData.role && { role: validatedData.role })
      },
      select: {
        id: true,
        userId: true,
        role: true,
        startDate: true,
        endDate: true,
        allocatedHours: true,
        allocatedPercentage: true,
        actualHours: true,
        User: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true
          }
        }
      }
    });

    // 9. Invalidate planner cache for specific service line (multi-user consistency)
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
      successResponse({ 
        allocation: {
          ...updated,
          allocatedHours: updated.allocatedHours ? parseFloat(updated.allocatedHours.toString()) : null,
          actualHours: updated.actualHours ? parseFloat(updated.actualHours.toString()) : null
        }
      })
    );
  },
});

/**
 * DELETE /api/tasks/[id]/team/[teamMemberId]/allocation
 * Clear allocation details for a team member without removing them from the team
 */
export const DELETE = secureRoute.mutationWithParams({
  feature: Feature.MANAGE_TASKS,
  handler: async (request, { user, params }) => {
    // 2. Parse and validate IDs
    const taskId = toTaskId(parseTaskId(params.id));
    const teamMemberId = parseNumericId(params.teamMemberId, 'team member ID');

    // 3. Check task access - must be ADMIN to clear allocations
    const accessResult = await checkTaskAccess(user.id, taskId, 'ADMIN');
    if (!accessResult.canAccess) {
      throw new AppError(403, 'Only task admins can clear allocations', ErrorCodes.FORBIDDEN);
    }

    // 4. Find the team member record
    const teamMember = await prisma.taskTeam.findUnique({
      where: { id: teamMemberId },
      select: {
        id: true,
        taskId: true,
        userId: true
      }
    });

    if (!teamMember || teamMember.taskId !== taskId) {
      throw new AppError(404, 'Team member not found', ErrorCodes.NOT_FOUND);
    }

    // 5. Clear allocation fields while keeping team member on task
    const updated = await prisma.taskTeam.update({
      where: { id: teamMemberId },
      data: {
        startDate: null,
        endDate: null,
        allocatedHours: null,
        allocatedPercentage: null,
        actualHours: null
      },
      select: {
        id: true,
        userId: true,
        role: true,
        startDate: true,
        endDate: true,
        allocatedHours: true,
        allocatedPercentage: true,
        actualHours: true,
        User: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true
          }
        }
      }
    });

    // 6. Invalidate planner cache for specific service line (multi-user consistency)
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
      successResponse({ 
        message: 'Allocation cleared successfully',
        allocation: updated
      })
    );
  },
});
