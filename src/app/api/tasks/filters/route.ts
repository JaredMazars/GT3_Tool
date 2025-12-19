import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { successResponse } from '@/lib/utils/apiUtils';
import { cache, CACHE_PREFIXES } from '@/lib/services/cache/CacheService';
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
    let cacheHit = false;

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

    const cacheKey = `${CACHE_PREFIXES.ANALYTICS}task-filters:sl:${serviceLine}:subGroup:${subServiceLineGroup}:client:${clientSearch}:taskName:${taskNameSearch}:partner:${partnerSearch}:manager:${managerSearch}`;
    
    const cached = await cache.get(cacheKey);
    if (cached) {
      cacheHit = true;
      performanceMonitor.trackApiCall('/api/tasks/filters', startTime, true);
      return NextResponse.json(successResponse(cached));
    }

    const FILTER_LIMIT = 30;
    const baseWhere = servLineCodes.length > 0 ? { ServLineCode: { in: servLineCodes } } : {};

    const clientWhere: Record<string, unknown> = { ...baseWhere, GSClientID: { not: null } };
    if (clientSearch) {
      clientWhere.Client = { OR: [{ clientCode: { contains: clientSearch } }, { clientNameFull: { contains: clientSearch } }] };
    }

    const taskNameWhere: Record<string, unknown> = { ...baseWhere, TaskDesc: { not: '' } };
    if (taskNameSearch) {
      taskNameWhere.TaskDesc = { contains: taskNameSearch };
    }

    let partnerEmployeeCodes: string[] = [];
    if (partnerSearch) {
      const matchingPartners = await prisma.employee.findMany({
        where: { Active: 'Yes', OR: [{ EmpCode: { contains: partnerSearch } }, { EmpName: { contains: partnerSearch } }] },
        select: { EmpCode: true },
        take: 100,
      });
      partnerEmployeeCodes = matchingPartners.map(e => e.EmpCode);
    }
    
    let managerEmployeeCodes: string[] = [];
    if (managerSearch) {
      const matchingManagers = await prisma.employee.findMany({
        where: { Active: 'Yes', OR: [{ EmpCode: { contains: managerSearch } }, { EmpName: { contains: managerSearch } }] },
        select: { EmpCode: true },
        take: 100,
      });
      managerEmployeeCodes = matchingManagers.map(e => e.EmpCode);
    }
    
    const partnerWhere: Record<string, unknown> = { ...baseWhere, TaskPartner: { not: '' } };
    if (partnerSearch && partnerEmployeeCodes.length > 0) {
      partnerWhere.TaskPartner = { in: partnerEmployeeCodes };
    } else if (partnerSearch && partnerEmployeeCodes.length === 0) {
      partnerWhere.TaskPartner = { in: ['__NO_MATCH__'] };
    }

    const managerWhere: Record<string, unknown> = { ...baseWhere, TaskManager: { not: '' } };
    if (managerSearch && managerEmployeeCodes.length > 0) {
      managerWhere.TaskManager = { in: managerEmployeeCodes };
    } else if (managerSearch && managerEmployeeCodes.length === 0) {
      managerWhere.TaskManager = { in: ['__NO_MATCH__'] };
    }

    const [clientsData, taskNamesData, partnersData, managersData] = await Promise.all([
      prisma.task.findMany({
        where: clientWhere,
        select: { GSClientID: true, Client: { select: { id: true, clientCode: true, clientNameFull: true } } },
        distinct: ['GSClientID'],
        orderBy: { Client: { clientCode: 'asc' } },
        take: FILTER_LIMIT,
      }),
      prisma.task.groupBy({ by: ['TaskDesc'], where: taskNameWhere, orderBy: { TaskDesc: 'asc' }, take: FILTER_LIMIT }),
      prisma.task.findMany({
        where: partnerWhere,
        select: { TaskPartner: true, TaskPartnerName: true },
        distinct: ['TaskPartner'],
        orderBy: { TaskPartnerName: 'asc' },
        take: FILTER_LIMIT,
      }),
      prisma.task.findMany({
        where: managerWhere,
        select: { TaskManager: true, TaskManagerName: true },
        distinct: ['TaskManager'],
        orderBy: { TaskManagerName: 'asc' },
        take: FILTER_LIMIT,
      }),
    ]);

    const uniquePartnerCodes = [...new Set(partnersData.map(t => t.TaskPartner).filter(Boolean))];
    const uniqueManagerCodes = [...new Set(managersData.map(t => t.TaskManager).filter(Boolean))];
    const allEmployeeCodes = [...new Set([...uniquePartnerCodes, ...uniqueManagerCodes])];
    
    const employees = allEmployeeCodes.length > 0 ? await prisma.employee.findMany({
      where: { EmpCode: { in: allEmployeeCodes }, Active: 'Yes' },
      select: { EmpCode: true, EmpName: true },
    }) : [];
    
    const employeeNameMap = new Map(employees.map(emp => [emp.EmpCode, emp.EmpName]));

    const clients = clientsData
      .filter(task => task.Client !== null)
      .map(task => ({ id: task.Client!.id, code: task.Client!.clientCode || '', name: task.Client!.clientNameFull || task.Client!.clientCode || 'Unknown' }));

    const taskNames = taskNamesData.map(item => item.TaskDesc).filter((name): name is string => !!name);

    const partnersMap = new Map<string, { id: string; name: string }>();
    partnersData.filter(task => task.TaskPartner !== null).forEach(task => {
      const id = task.TaskPartner!;
      if (!partnersMap.has(id)) {
        partnersMap.set(id, { id, name: employeeNameMap.get(id) || task.TaskPartnerName || id });
      }
    });
    const partners = Array.from(partnersMap.values());

    const managersMap = new Map<string, { id: string; name: string }>();
    managersData.filter(task => task.TaskManager !== null).forEach(task => {
      const id = task.TaskManager!;
      if (!managersMap.has(id)) {
        managersMap.set(id, { id, name: employeeNameMap.get(id) || task.TaskManagerName || id });
      }
    });
    const managers = Array.from(managersMap.values());

    const responseData = {
      clients,
      taskNames,
      partners,
      managers,
      serviceLines: [],
      metadata: {
        clients: { hasMore: clients.length >= FILTER_LIMIT, total: clients.length, returned: clients.length },
        taskNames: { hasMore: taskNames.length >= FILTER_LIMIT, total: taskNames.length, returned: taskNames.length },
        partners: { hasMore: partners.length >= FILTER_LIMIT, total: partners.length, returned: partners.length },
        managers: { hasMore: managers.length >= FILTER_LIMIT, total: managers.length, returned: managers.length },
        serviceLines: { hasMore: false, total: 0, returned: 0 },
      },
    };

    await cache.set(cacheKey, responseData, 3600);
    performanceMonitor.trackApiCall('/api/tasks/filters', startTime, cacheHit);

    return NextResponse.json(successResponse(responseData));
  },
});
