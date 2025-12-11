import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { getCurrentUser } from '@/lib/services/auth/auth';
import { checkTaskAccess } from '@/lib/services/tasks/taskAuthorization';
import { successResponse } from '@/lib/utils/apiUtils';
import { handleApiError } from '@/lib/utils/errorHandler';
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
      return handleApiError(new Error('Unauthorized'), 'Get team allocations', 401);
    }

    // 2. Parse and validate task ID
    const taskId = toTaskId(params.id);

    // 3. Check task access
    const accessResult = await checkTaskAccess(user.id, taskId, 'VIEWER');
    if (!accessResult.canAccess) {
      return handleApiError(new Error('Access denied'), 'Get team allocations', 403);
    }

    // 4. Fetch task to get task name
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      select: {
        id: true,
        TaskDesc: true
      }
    });

    if (!task) {
      return handleApiError(new Error('Task not found'), 'Get team allocations', 404);
    }

    // 5. Fetch team members with allocations
    const teamMembers = await prisma.taskTeam.findMany({
      where: { taskId },
      select: {
        id: true,
        userId: true,
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
            image: true
          }
        }
      },
      orderBy: {
        User: {
          name: 'asc'
        }
      }
    });

    // 6. Transform to response format
    const teamMembersWithAllocations = teamMembers.map(member => ({
      userId: member.userId,
      user: {
        id: member.User.id,
        name: member.User.name,
        email: member.User.email || '',
        image: member.User.image
      },
      allocations: member.startDate && member.endDate ? [{
        id: member.id,
        taskId: task.id,
        taskName: task.TaskDesc,
        role: member.role,
        startDate: member.startDate,
        endDate: member.endDate,
        allocatedHours: member.allocatedHours ? parseFloat(member.allocatedHours.toString()) : null,
        allocatedPercentage: member.allocatedPercentage,
        actualHours: member.actualHours ? parseFloat(member.actualHours.toString()) : null
      }] : []
    }));

    return NextResponse.json(successResponse({ teamMembers: teamMembersWithAllocations }));
  } catch (error) {
    return handleApiError(error, 'Get team allocations');
  }
}


