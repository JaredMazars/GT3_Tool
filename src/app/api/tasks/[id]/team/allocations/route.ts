import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { getCurrentUser } from '@/lib/services/auth/auth';
import { checkTaskAccess } from '@/lib/services/tasks/taskAuthorization';
import { successResponse } from '@/lib/utils/apiUtils';
import { handleApiError, AppError } from '@/lib/utils/errorHandler';
import { toTaskId } from '@/types/branded';

/**
 * GET /api/tasks/[id]/team/allocations
 * Fetch all team members and their allocations for a task
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // 1. Authenticate
    const user = await getCurrentUser();
    if (!user?.id) {
      return handleApiError(new AppError(401, 'Unauthorized'), 'Get team allocations');
    }

    // 2. Parse and validate task ID
    const taskId = toTaskId(params.id);

    // 3. Check task access
    const accessResult = await checkTaskAccess(user.id, taskId, 'VIEWER');
    if (!accessResult.canAccess) {
      return handleApiError(new AppError(403, 'Access denied'), 'Get team allocations');
    }

    // 4. Fetch task with team members in a single optimized query
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      select: {
        id: true,
        TaskDesc: true,
        TaskCode: true,
        Client: {
          select: {
            clientCode: true,
            clientNameFull: true
          }
        },
        TaskTeam: {
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
          },
          orderBy: {
            User: {
              name: 'asc'
            }
          }
        }
      }
    });

    if (!task) {
      return handleApiError(new AppError(404, 'Task not found'), 'Get team allocations');
    }

    // 5. Fetch all other allocations for these team members
    const userIds = task.TaskTeam.map(member => member.userId);    const otherAllocations = await prisma.taskTeam.findMany({
      where: {
        userId: { in: userIds },
        taskId: { not: taskId },
        startDate: { not: null },
        endDate: { not: null }
      },
      select: {
        id: true,
        userId: true,
        taskId: true,
        role: true,
        startDate: true,
        endDate: true,
        allocatedHours: true,
        allocatedPercentage: true,
        actualHours: true,
        Task: {
          select: {
            TaskDesc: true,
            TaskCode: true,
            Client: {
              select: {
                clientCode: true,
                clientNameFull: true
              }
            }
          }
        }
      }
    });
    // 6. Transform to response format
    const teamMembersWithAllocations = task.TaskTeam.map(member => {
      // Current task allocation
      const currentAllocation = member.startDate && member.endDate ? [{
        id: member.id,
        taskId: task.id,
        taskName: task.TaskDesc,
        taskCode: task.TaskCode,
        clientName: task.Client?.clientNameFull || null,
        clientCode: task.Client?.clientCode || null,
        role: member.role,
        startDate: member.startDate,
        endDate: member.endDate,
        allocatedHours: member.allocatedHours ? parseFloat(member.allocatedHours.toString()) : null,
        allocatedPercentage: member.allocatedPercentage,
        actualHours: member.actualHours ? parseFloat(member.actualHours.toString()) : null,
        isCurrentTask: true
      }] : [];

      // Other task allocations for this user
      const otherUserAllocations = otherAllocations
        .filter(alloc => alloc.userId === member.userId)
        .map(alloc => ({
          id: alloc.id,
          taskId: alloc.taskId,
          taskName: alloc.Task.TaskDesc,
          taskCode: alloc.Task.TaskCode,
          clientName: alloc.Task.Client?.clientNameFull || null,
          clientCode: alloc.Task.Client?.clientCode || null,
          role: alloc.role,
          startDate: alloc.startDate!,
          endDate: alloc.endDate!,
          allocatedHours: alloc.allocatedHours ? parseFloat(alloc.allocatedHours.toString()) : null,
          allocatedPercentage: alloc.allocatedPercentage,
          actualHours: alloc.actualHours ? parseFloat(alloc.actualHours.toString()) : null,
          isCurrentTask: false
        }));
      return {
        id: member.id, // TaskTeam.id for the current task - needed for creating/updating allocations
        userId: member.userId,
        role: member.role, // Current task role
        user: {
          id: member.User.id,
          name: member.User.name,
          email: member.User.email || '',
          image: member.User.image
        },
        allocations: [...currentAllocation, ...otherUserAllocations]
      };
    });

    return NextResponse.json(successResponse({ teamMembers: teamMembersWithAllocations }));
  } catch (error) {
    return handleApiError(error, 'Get team allocations');
  }
}


