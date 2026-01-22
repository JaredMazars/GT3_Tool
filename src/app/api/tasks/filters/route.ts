export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { successResponse } from '@/lib/utils/apiUtils';
import { getServLineCodesBySubGroup } from '@/lib/utils/serviceLineExternal';
import { performanceMonitor } from '@/lib/utils/performanceMonitor';
import { secureRoute, Feature } from '@/lib/api/secureRoute';
import { z } from 'zod';

// Zod schema for query params validation
const TaskFiltersQuerySchema = z.object({
  serviceLine: z.string().max(50).optional(),
  subServiceLineGroup: z.string().max(50).optional(),
  clientSearch: z.string().max(100).default(''),
  taskNameSearch: z.string().max(100).default(''),
  partnerSearch: z.string().max(100).default(''),
  managerSearch: z.string().max(100).default(''),
});

/**
 * GET /api/tasks/filters
 * Fetch distinct filter option values for task filters
 */
export const GET = secureRoute.query({
  feature: Feature.ACCESS_TASKS,
  handler: async (request, { user }) => {
    const startTime = Date.now();

    const { searchParams } = new URL(request.url);
    
    // Validate query params with Zod
    const queryParams = TaskFiltersQuerySchema.parse({
      serviceLine: searchParams.get('serviceLine') ?? undefined,
      subServiceLineGroup: searchParams.get('subServiceLineGroup') ?? undefined,
      clientSearch: searchParams.get('clientSearch') ?? undefined,
      taskNameSearch: searchParams.get('taskNameSearch') ?? undefined,
      partnerSearch: searchParams.get('partnerSearch') ?? undefined,
      managerSearch: searchParams.get('managerSearch') ?? undefined,
    });
    
    const { serviceLine, subServiceLineGroup, clientSearch, taskNameSearch, partnerSearch, managerSearch } = queryParams;

    let servLineCodes: string[] = [];
    if (subServiceLineGroup) {
      servLineCodes = await getServLineCodesBySubGroup(subServiceLineGroup, serviceLine);
      
      if (servLineCodes.length === 0) {
        return NextResponse.json(successResponse({
          clients: [],
          taskNames: [],
          partners: [],
          managers: [],
          serviceLines: [],
          metadata: {
            clients: { hasMore: false, total: 0, returned: 0 },
            taskNames: { hasMore: false, total: 0, returned: 0 },
            partners: { hasMore: false, total: 0, returned: 0 },
            managers: { hasMore: false, total: 0, returned: 0 },
            serviceLines: { hasMore: false, total: 0, returned: 0 },
          },
        }));
      }
    }

    const clientTooShort = clientSearch.length > 0 && clientSearch.length < 2;
    const taskNameTooShort = taskNameSearch.length > 0 && taskNameSearch.length < 2;
    const partnerTooShort = partnerSearch.length > 0 && partnerSearch.length < 2;
    const managerTooShort = managerSearch.length > 0 && managerSearch.length < 2;

    if (clientTooShort || taskNameTooShort || partnerTooShort || managerTooShort) {
      return NextResponse.json(successResponse({
        clients: clientTooShort ? [] : undefined,
        taskNames: taskNameTooShort ? [] : undefined,
        partners: partnerTooShort ? [] : undefined,
        managers: managerTooShort ? [] : undefined,
        serviceLines: [],
        metadata: {
          clients: clientTooShort ? { hasMore: false, total: 0, returned: 0 } : undefined,
          taskNames: taskNameTooShort ? { hasMore: false, total: 0, returned: 0 } : undefined,
          partners: partnerTooShort ? { hasMore: false, total: 0, returned: 0 } : undefined,
          managers: managerTooShort ? { hasMore: false, total: 0, returned: 0 } : undefined,
          serviceLines: { hasMore: false, total: 0, returned: 0 },
        },
        message: 'Please enter at least 2 characters to search',
      }));
    }

    const FILTER_LIMIT = 30;
    const baseWhere = servLineCodes.length > 0 ? { ServLineCode: { in: servLineCodes } } : {};

    const clientWhere: Record<string, unknown> = { ...baseWhere, GSClientID: { not: null } };
    if (clientSearch) {
      clientWhere.Client = { OR: [{ clientCode: { contains: clientSearch } }, { clientNameFull: { contains: clientSearch } }] };
    }

    const taskNameWhere: Record<string, unknown> = { ...baseWhere, TaskDesc: { not: '' } };
    if (taskNameSearch) {
      taskNameWhere.OR = [
        { TaskDesc: { contains: taskNameSearch } },
        { TaskCode: { contains: taskNameSearch } },
      ];
    }

    // Query employees directly for partners and managers (not through tasks)
    // This ensures all active employees appear in the dropdown, not just those with tasks
    const [clientsData, taskNamesData, partnersData, managersData] = await Promise.all([
      // Clients: Keep current logic (filter by service line through tasks)
      prisma.task.findMany({
        where: clientWhere,
        select: { GSClientID: true, Client: { select: { id: true, clientCode: true, clientNameFull: true } } },
        distinct: ['GSClientID'],
        orderBy: { Client: { clientCode: 'asc' } },
        take: FILTER_LIMIT,
      }),
      // Task Names: Keep current logic (filter by service line)
      prisma.task.findMany({
        where: taskNameWhere,
        select: { TaskDesc: true, TaskCode: true },
        distinct: ['TaskDesc'],
        orderBy: { TaskDesc: 'asc' },
        take: FILTER_LIMIT,
      }),
      // Partners: Query Employee table directly
      partnerSearch ? prisma.employee.findMany({
        where: { 
          Active: 'Yes', 
          OR: [
            { EmpCode: { contains: partnerSearch } }, 
            { EmpName: { contains: partnerSearch } }
          ] 
        },
        select: { EmpCode: true, EmpName: true },
        orderBy: { EmpName: 'asc' },
        take: FILTER_LIMIT,
      }) : Promise.resolve([]),
      // Managers: Query Employee table directly
      managerSearch ? prisma.employee.findMany({
        where: { 
          Active: 'Yes', 
          OR: [
            { EmpCode: { contains: managerSearch } }, 
            { EmpName: { contains: managerSearch } }
          ] 
        },
        select: { EmpCode: true, EmpName: true },
        orderBy: { EmpName: 'asc' },
        take: FILTER_LIMIT,
      }) : Promise.resolve([]),
    ]);

    const clients = clientsData
      .filter(task => task.Client !== null)
      .map(task => ({ id: task.Client!.id, code: task.Client!.clientCode || '', name: task.Client!.clientNameFull || task.Client!.clientCode || 'Unknown' }));

    const taskNames = taskNamesData
      .filter(task => task.TaskDesc)
      .map(task => ({ 
        name: task.TaskDesc!, 
        code: task.TaskCode || '' 
      }));

    // Partners: Use employee data directly
    const partners = partnersData.map(emp => ({ 
      id: emp.EmpCode, 
      name: emp.EmpName 
    }));

    // Managers: Use employee data directly
    const managers = managersData.map(emp => ({ 
      id: emp.EmpCode, 
      name: emp.EmpName 
    }));

    const responseData = {
      clients,
      taskNames,
      partners,
      managers,
      serviceLines: [],
      metadata: {
        clients: { hasMore: clients.length >= FILTER_LIMIT, total: clients.length, returned: clients.length },
        taskNames: { hasMore: taskNames.length >= FILTER_LIMIT, total: taskNames.length, returned: taskNames.length },
        partners: { hasMore: partnersData.length >= FILTER_LIMIT, total: partnersData.length, returned: partners.length },
        managers: { hasMore: managersData.length >= FILTER_LIMIT, total: managersData.length, returned: managers.length },
        serviceLines: { hasMore: false, total: 0, returned: 0 },
      },
    };

    performanceMonitor.trackApiCall('/api/tasks/filters', startTime, false);

    return NextResponse.json(successResponse(responseData));
  },
});
