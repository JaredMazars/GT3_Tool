import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { getCurrentUser } from '@/lib/services/auth/auth';
import { checkTaskAccess } from '@/lib/services/tasks/taskAuthorization';
import { successResponse } from '@/lib/utils/apiUtils';
import { handleApiError, AppError } from '@/lib/utils/errorHandler';
import { toTaskId } from '@/types/branded';
import { NON_CLIENT_EVENT_LABELS, NonClientEventType } from '@/types';

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
    const userIds = task.TaskTeam.map(member => member.userId);
    
    const otherAllocations = await prisma.taskTeam.findMany({
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

    // 5b. Map users to employees to fetch non-client allocations
    // Get user emails for the team
    const userEmails = task.TaskTeam.map(member => member.User.email?.toLowerCase()).filter(Boolean);
    
    // Find employees matching these users (by email/WinLogon)
    const employees = await prisma.employee.findMany({
      where: {
        OR: [
          { WinLogon: { in: userEmails } },
          // Also try matching email prefix before @
          ...userEmails.map(email => {
            const prefix = email?.split('@')[0];
            return prefix ? { WinLogon: { contains: prefix } } : { id: -1 }; // Use impossible id if no prefix
          })
        ]
      },
      select: {
        id: true,
        WinLogon: true
      }
    });

    // Create mapping: userId -> employeeId
    const userToEmployeeMap = new Map<string, number>();
    task.TaskTeam.forEach(member => {
      const userEmail = member.User.email?.toLowerCase();
      if (userEmail) {
        const matchedEmployee = employees.find(emp => {
          const empLogin = emp.WinLogon?.toLowerCase();
          if (!empLogin) return false;
          // Direct match or prefix match
          return empLogin === userEmail || userEmail.startsWith(empLogin.split('@')[0] || '');
        });
        if (matchedEmployee) {
          userToEmployeeMap.set(member.userId, matchedEmployee.id);
        }
      }
    });

    // Get non-client allocations for matched employees
    const employeeIds = Array.from(userToEmployeeMap.values());
    const nonClientAllocations = await prisma.nonClientAllocation.findMany({
      where: {
        employeeId: { in: employeeIds }
      },
      select: {
        id: true,
        employeeId: true,
        eventType: true,
        startDate: true,
        endDate: true,
        allocatedHours: true,
        allocatedPercentage: true,
        notes: true,
        createdAt: true
      },
      orderBy: {
        startDate: 'asc'
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
        isCurrentTask: true,
        isNonClientEvent: false
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
          isCurrentTask: false,
          isNonClientEvent: false
        }));

      // Non-client event allocations for this user
      const userEmployeeId = userToEmployeeMap.get(member.userId);
      const userNonClientAllocations = nonClientAllocations
        .filter(alloc => userEmployeeId && alloc.employeeId === userEmployeeId)
        .map(alloc => ({
          id: alloc.id,
          taskId: null,
          taskName: NON_CLIENT_EVENT_LABELS[alloc.eventType as NonClientEventType],
          taskCode: undefined,
          clientName: null,
          clientCode: null,
          role: 'VIEWER' as const,
          startDate: alloc.startDate,
          endDate: alloc.endDate,
          allocatedHours: parseFloat(alloc.allocatedHours.toString()),
          allocatedPercentage: alloc.allocatedPercentage,
          actualHours: null,
          isCurrentTask: false,
          isNonClientEvent: true,
          nonClientEventType: alloc.eventType,
          notes: alloc.notes
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
        allocations: [...currentAllocation, ...otherUserAllocations, ...userNonClientAllocations]
      };
    });

    return NextResponse.json(successResponse({ teamMembers: teamMembersWithAllocations }));
  } catch (error) {
    return handleApiError(error, 'Get team allocations');
  }
}


