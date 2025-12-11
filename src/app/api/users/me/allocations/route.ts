import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { getCurrentUser } from '@/lib/services/auth/auth';
import { successResponse } from '@/lib/utils/apiUtils';
import { handleApiError, AppError } from '@/lib/utils/errorHandler';
import { startOfDay } from 'date-fns';

/**
 * GET /api/users/me/allocations
 * Fetch all task allocations for the current user, grouped by client
 */
export async function GET(request: NextRequest) {
  try {
    // 1. Authenticate
    const user = await getCurrentUser();
    if (!user?.id) {
      return handleApiError(new AppError(401, 'Unauthorized'), 'Get user allocations');
    }

    // 2. Fetch all TaskTeam records for current user with allocations
    const userAllocations = await prisma.taskTeam.findMany({
      where: {
        userId: user.id,
        startDate: { not: null },
        endDate: { not: null }
      },
      select: {
        id: true,
        taskId: true,
        role: true,
        startDate: true,
        endDate: true,
        allocatedHours: true,
        allocatedPercentage: true,
        actualHours: true,
        Task: {
          select: {
            id: true,
            TaskDesc: true,
            TaskCode: true,
            ServLineCode: true,
            GSClientID: true,
            Client: {
              select: {
                id: true,
                clientCode: true,
                clientNameFull: true
              }
            }
          }
        }
      },
      orderBy: {
        startDate: 'asc'
      }
    });

    // 3. Get service line mappings for all tasks
    const servLineCodes = [...new Set(userAllocations.map(a => a.Task.ServLineCode).filter(Boolean))];
    const serviceLineMappings = await prisma.serviceLineExternal.findMany({
      where: {
        ServLineCode: { in: servLineCodes as string[] }
      },
      select: {
        ServLineCode: true,
        SubServlineGroupCode: true,
        masterCode: true
      }
    });

    // 4. Create service line lookup map
    const serviceLineMap = new Map<string, { masterCode: string; subServiceLineGroup: string }>();
    serviceLineMappings.forEach(mapping => {
      if (mapping.ServLineCode && mapping.masterCode) {
        serviceLineMap.set(mapping.ServLineCode, {
          masterCode: mapping.masterCode,
          subServiceLineGroup: mapping.SubServlineGroupCode || ''
        });
      }
    });

    // 5. Group allocations by client
    const clientMap = new Map<number | null, {
      clientId: number | null;
      clientName: string;
      clientCode: string;
      allocations: any[];
    }>();

    // 6. Build flat list for table view
    const flatList: any[] = [];

    userAllocations.forEach(allocation => {
      const task = allocation.Task;
      const client = task.Client;
      
      // Get service line info
      const serviceLineInfo = task.ServLineCode ? serviceLineMap.get(task.ServLineCode) : null;
      
      // Use client ID as key (null for internal tasks)
      const clientId = client?.id || null;
      
      if (!clientMap.has(clientId)) {
        clientMap.set(clientId, {
          clientId,
          clientName: client?.clientNameFull || 'Internal Projects',
          clientCode: client?.clientCode || 'INTERNAL',
          allocations: []
        });
      }

      const allocationData = {
        id: allocation.id,
        taskId: task.id,
        taskName: task.TaskDesc,
        taskCode: task.TaskCode,
        clientName: client?.clientNameFull || 'Internal Projects',
        clientCode: client?.clientCode || 'INTERNAL',
        role: allocation.role,
        startDate: allocation.startDate,
        endDate: allocation.endDate,
        allocatedHours: allocation.allocatedHours ? parseFloat(allocation.allocatedHours.toString()) : null,
        allocatedPercentage: allocation.allocatedPercentage,
        actualHours: allocation.actualHours ? parseFloat(allocation.actualHours.toString()) : null,
        isCurrentTask: false // All tasks are "other" tasks from user perspective
      };

      // Add allocation to client's list (for timeline view)
      clientMap.get(clientId)!.allocations.push(allocationData);

      // Add to flat list (for table view) with navigation info
      flatList.push({
        ...allocationData,
        clientId,
        serviceLine: serviceLineInfo?.masterCode || null,
        subServiceLineGroup: serviceLineInfo?.subServiceLineGroup || null
      });
    });

    // 7. Convert map to array and sort by client name
    const clients = Array.from(clientMap.values()).sort((a, b) => {
      // Put "Internal Projects" last
      if (a.clientId === null) return 1;
      if (b.clientId === null) return -1;
      return a.clientName.localeCompare(b.clientName);
    });

    return NextResponse.json(successResponse({ clients, flatList }));
  } catch (error) {
    return handleApiError(error, 'Get user allocations');
  }
}
