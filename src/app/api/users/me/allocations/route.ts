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
  isNonClientEvent?: boolean;
  nonClientEventType?: string;
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

    // Query non-client allocations for the current user
    const nonClientAllocations = await prisma.nonClientAllocation.findMany({
      where: {
        Employee: {
          WinLogon: user.id
        }
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
        Employee: {
          select: {
            id: true,
            EmpCode: true,
            EmpName: true,
          }
        }
      },
      orderBy: { startDate: 'asc' },
      take: MAX_ALLOCATIONS
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

    // Add non-client allocations (training, leave, etc.)
    nonClientAllocations.forEach(allocation => {
      const eventName = allocation.eventType.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (l: string) => l.toUpperCase());
      const clientKey = `NON_CLIENT_${allocation.eventType}` as unknown as number | null;
      
      if (!clientMap.has(clientKey)) {
        clientMap.set(clientKey, {
          clientId: null,
          clientName: `Non-Client: ${eventName}`,
          clientCode: 'NON_CLIENT',
          allocations: []
        });
      }
      
      const allocationData: AllocationData = {
        id: allocation.id,
        taskId: 0, // Non-client events don't have tasks
        taskName: eventName,
        taskCode: null,
        clientName: `Non-Client: ${eventName}`,
        clientCode: 'NON_CLIENT',
        role: 'USER',
        startDate: allocation.startDate,
        endDate: allocation.endDate,
        allocatedHours: allocation.allocatedHours ? parseFloat(allocation.allocatedHours.toString()) : null,
        allocatedPercentage: allocation.allocatedPercentage,
        actualHours: null,
        isCurrentTask: true,
        isNonClientEvent: true,
        nonClientEventType: allocation.eventType
      };
      
      clientMap.get(clientKey)!.allocations.push(allocationData);
      
      flatList.push({
        ...allocationData,
        clientId: null,
        serviceLine: null,
        subServiceLineGroup: null
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
