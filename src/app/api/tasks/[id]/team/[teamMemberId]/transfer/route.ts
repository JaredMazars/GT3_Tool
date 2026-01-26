import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { checkTaskAccess } from '@/lib/services/tasks/taskAuthorization';
import { successResponse, parseTaskId, parseNumericId } from '@/lib/utils/apiUtils';
import { AppError, ErrorCodes } from '@/lib/utils/errorHandler';
import { toTaskId } from '@/types/branded';
import { z } from 'zod';
import { secureRoute, Feature } from '@/lib/api/secureRoute';
import { invalidatePlannerCachesForServiceLine } from '@/lib/services/cache/cacheInvalidation';

const transferSchema = z.object({
  targetUserId: z.string().min(1, 'Target user ID is required').max(255),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
}).strict();

/**
 * POST /api/tasks/[id]/team/[teamMemberId]/transfer
 * Transfer allocation from one team member to another
 */
export const POST = secureRoute.mutationWithParams({
  feature: Feature.MANAGE_TASKS,
  schema: transferSchema,
  handler: async (request, { user, params, data: validatedData }) => {
    // 2. Parse and validate IDs
    const taskId = toTaskId(parseTaskId(params.id));
    const sourceTeamMemberId = parseNumericId(params.teamMemberId, 'team member ID');

    // 3. Check task access - must be ADMIN to transfer allocations
    const accessResult = await checkTaskAccess(user.id, taskId, 'ADMIN');
    if (!accessResult.canAccess) {
      throw new AppError(403, 'Only task admins can transfer allocations', ErrorCodes.FORBIDDEN);
    }

    // 5. Validate date logic if provided
    if (validatedData.startDate && validatedData.endDate) {
      const start = new Date(validatedData.startDate);
      const end = new Date(validatedData.endDate);
      if (start > end) {
        throw new AppError(400, 'End date cannot be before start date', ErrorCodes.VALIDATION_ERROR);
      }
    }

    // 6. Execute transfer in transaction
    const result = await prisma.$transaction(async (tx) => {
      // Find source team member record
      const sourceTeamMember = await tx.taskTeam.findUnique({
        where: { id: sourceTeamMemberId },
        select: {
          id: true,
          taskId: true,
          userId: true,
          startDate: true,
          endDate: true,
          allocatedHours: true,
          allocatedPercentage: true,
          actualHours: true,
          role: true
        }
      });

      if (!sourceTeamMember || sourceTeamMember.taskId !== taskId) {
        throw new AppError(404, 'Source team member not found');
      }

      // Prevent transfer to same user
      if (sourceTeamMember.userId === validatedData.targetUserId) {
        throw new AppError(400, 'Cannot transfer allocation to the same user');
      }

      // Check if source has allocation to transfer
      if (!sourceTeamMember.startDate || !sourceTeamMember.endDate) {
        throw new AppError(400, 'Source team member has no allocation to transfer');
      }

      // Find target team member record
      const targetTeamMember = await tx.taskTeam.findFirst({
        where: {
          taskId: taskId,
          userId: validatedData.targetUserId
        },
        select: {
          id: true,
          userId: true,
          role: true,
          startDate: true,
          endDate: true,
          allocatedHours: true,
          allocatedPercentage: true,
          actualHours: true
        }
      });

      if (!targetTeamMember) {
        throw new AppError(404, 'Target user is not a member of this task');
      }

      // Use provided dates or copy from source
      const newStartDate = validatedData.startDate 
        ? new Date(validatedData.startDate) 
        : sourceTeamMember.startDate;
      const newEndDate = validatedData.endDate 
        ? new Date(validatedData.endDate) 
        : sourceTeamMember.endDate;

      // Clear allocation on source (keep team membership and role)
      const clearedSource = await tx.taskTeam.update({
        where: { id: sourceTeamMemberId },
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

      // Set allocation on target (copy allocation data from source)
      const updatedTarget = await tx.taskTeam.update({
        where: { id: targetTeamMember.id },
        data: {
          startDate: newStartDate,
          endDate: newEndDate,
          allocatedHours: sourceTeamMember.allocatedHours,
          allocatedPercentage: sourceTeamMember.allocatedPercentage,
          // Don't copy actualHours - that's work done by the source user
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

      return { source: clearedSource, target: updatedTarget };
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
      successResponse({
        message: 'Allocation transferred successfully',
        source: {
          ...result.source,
          allocatedHours: result.source.allocatedHours ? parseFloat(result.source.allocatedHours.toString()) : null,
          actualHours: result.source.actualHours ? parseFloat(result.source.actualHours.toString()) : null
        },
        target: {
          ...result.target,
          allocatedHours: result.target.allocatedHours ? parseFloat(result.target.allocatedHours.toString()) : null,
          actualHours: result.target.actualHours ? parseFloat(result.target.actualHours.toString()) : null
        }
      })
    );
  },
});
