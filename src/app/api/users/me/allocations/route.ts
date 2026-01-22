export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { successResponse } from '@/lib/utils/apiUtils';
import { secureRoute } from '@/lib/api/secureRoute';

// Maximum allocations to return to prevent unbounded queries
const MAX_ALLOCATIONS = 500;

// Type definitions for response data
interface AllocationData {
  id: number;
  taskId: number;
  taskName: string | null;
  taskCode: string | null;
  clientName: string;
  clientCode: string;
  role: string | null;
  startDate: Date | null;
  endDate: Date | null;
  allocatedHours: number | null;
  allocatedPercentage: number | null;
  actualHours: number | null;
  isCurrentTask: boolean;
}

interface FlatAllocationData extends AllocationData {
  clientId: number | null;
  serviceLine: string | null;
  subServiceLineGroup: string | null;
}

interface ClientGroup {
  clientId: number | null;
  clientName: string;
  clientCode: string;
  allocations: AllocationData[];
}

/**
 * GET /api/users/me/allocations
 * Fetch all task allocations for the current user, grouped by client
 */
export const GET = secureRoute.query({
  handler: async (request, { user }) => {
    const userAllocations = await prisma.taskTeam.findMany({
      where: {
        userId: user.id,
        startDate: { not: null },
        endDate: { not: null }
      },
      select: {
        id: true, taskId: true, role: true, startDate: true, endDate: true,
        allocatedHours: true, allocatedPercentage: true, actualHours: true,
        Task: {
          select: {
            id: true, TaskDesc: true, TaskCode: true, ServLineCode: true, GSClientID: true,
            Client: { select: { id: true, clientCode: true, clientNameFull: true } }
          }
        }
      },
      orderBy: [{ startDate: 'asc' }, { id: 'asc' }],
      take: MAX_ALLOCATIONS,
    });

    const servLineCodes = [...new Set(userAllocations.map(a => a.Task.ServLineCode).filter(Boolean))];
    const serviceLineMappings = await prisma.serviceLineExternal.findMany({
      where: { ServLineCode: { in: servLineCodes as string[] } },
      select: { ServLineCode: true, SubServlineGroupCode: true, masterCode: true }
    });

    const serviceLineMap = new Map<string, { masterCode: string; subServiceLineGroup: string }>();
    serviceLineMappings.forEach(mapping => {
      if (mapping.ServLineCode && mapping.masterCode) {
        serviceLineMap.set(mapping.ServLineCode, {
          masterCode: mapping.masterCode,
          subServiceLineGroup: mapping.SubServlineGroupCode || ''
        });
      }
    });

    const clientMap = new Map<number | null, ClientGroup>();
    const flatList: FlatAllocationData[] = [];

    userAllocations.forEach(allocation => {
      const task = allocation.Task;
      const client = task.Client;
      const serviceLineInfo = task.ServLineCode ? serviceLineMap.get(task.ServLineCode) : null;
      const clientId = client?.id || null;
      
      if (!clientMap.has(clientId)) {
        clientMap.set(clientId, {
          clientId,
          clientName: client?.clientNameFull || 'Internal Projects',
          clientCode: client?.clientCode || 'INTERNAL',
          allocations: []
        });
      }

      const allocationData: AllocationData = {
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
        isCurrentTask: false
      };

      clientMap.get(clientId)!.allocations.push(allocationData);

      flatList.push({
        ...allocationData,
        clientId,
        serviceLine: serviceLineInfo?.masterCode || null,
        subServiceLineGroup: serviceLineInfo?.subServiceLineGroup || null
      });
    });

    const clients = Array.from(clientMap.values()).sort((a, b) => {
      if (a.clientId === null) return 1;
      if (b.clientId === null) return -1;
      return a.clientName.localeCompare(b.clientName);
    });

    return NextResponse.json(successResponse({ clients, flatList }));
  },
});
