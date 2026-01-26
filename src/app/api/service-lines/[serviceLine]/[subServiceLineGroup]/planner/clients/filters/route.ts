import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { getUserServiceLines } from '@/lib/services/service-lines/serviceLineService';
import { successResponse } from '@/lib/utils/apiUtils';
import { AppError, ErrorCodes } from '@/lib/utils/errorHandler';
import { cache, CACHE_PREFIXES } from '@/lib/services/cache/CacheService';
import { secureRoute, Feature } from '@/lib/api/secureRoute';

// Type for subGroup in userServiceLines
interface SubGroupInfo {
  code: string;
  description?: string;
}

// Type for cache response
interface ClientPlannerFiltersResponse {
  clients: FilterOption[];
  groups: FilterOption[];
  partners: FilterOption[];
  tasks: FilterOption[];
  managers: FilterOption[];
}

interface FilterOption {
  id: string;
  label: string;
}

/**
 * GET /api/service-lines/[serviceLine]/[subServiceLineGroup]/planner/clients/filters
 * Fetch unique filter option values for client planner filters
 * Returns distinct values for clients, groups, partners, tasks, and managers
 * 
 * Performance optimizations:
 * - Redis caching (30min TTL for relatively static data)
 * - Optimized queries with Promise.all batching
 * - Only fetch active tasks with clients
 */
export const GET = secureRoute.queryWithParams<{ serviceLine: string; subServiceLineGroup: string }>({
  feature: Feature.ACCESS_DASHBOARD,
  handler: async (request, { user, params }) => {
    const { serviceLine, subServiceLineGroup } = params;
    
    if (!subServiceLineGroup) {
      throw new AppError(400, 'Sub-service line group is required', ErrorCodes.VALIDATION_ERROR);
    }

    // Check for SYSTEM_ADMIN first (bypasses all access checks)
    const isAdmin = user.systemRole === 'SYSTEM_ADMIN';
    
    if (!isAdmin) {
      // Check user has access to this sub-service line group
      const userServiceLines = await getUserServiceLines(user.id);
      const hasAccess = userServiceLines.some(sl => 
        sl.subGroups?.some((sg: SubGroupInfo) => sg.code === subServiceLineGroup)
      );
      if (!hasAccess) {
        throw new AppError(403, 'You do not have access to this sub-service line group', ErrorCodes.FORBIDDEN);
      }
    }

    // Build cache key
    const cacheKey = `${CACHE_PREFIXES.TASK}planner:filters:${serviceLine}:${subServiceLineGroup}:user:${user.id}`;
    
    // Try cache first (30min TTL since filter options are relatively static)
    const cached = await cache.get<ClientPlannerFiltersResponse>(cacheKey);
    if (cached) {
      return NextResponse.json(successResponse(cached));
    }

    // 5. Map subServiceLineGroup to external service line codes
    const serviceLineExternalMappings = await prisma.serviceLineExternal.findMany({
      where: {
        SubServlineGroupCode: subServiceLineGroup
      },
      select: {
        ServLineCode: true
      }
    });
    
    const externalServLineCodes = serviceLineExternalMappings
      .map((m: { ServLineCode: string | null }) => m.ServLineCode)
      .filter((code: string | null): code is string => !!code);

    if (externalServLineCodes.length === 0) {
      const emptyResponse = {
        clients: [],
        groups: [],
        partners: [],
        tasks: [],
        managers: []
      };
      await cache.set(cacheKey, emptyResponse, 1800); // 30 min
      return NextResponse.json(successResponse(emptyResponse));
    }

    // Fetch all tasks with clients for this sub-service line group
    const tasksWithClients = await prisma.task.findMany({
      where: {
        ServLineCode: { in: externalServLineCodes },
        GSClientID: { not: null },
        Active: 'Yes'
      },
      select: {
        TaskCode: true,
        TaskDesc: true,
        TaskManager: true,
        TaskPartner: true,
        Client: {
          select: {
            clientCode: true,
            clientNameFull: true,
            groupDesc: true,
            clientPartner: true
          }
        }
      }
    });
    
    // Get unique partner and manager codes
    const partnerCodes = new Set<string>();
    const managerCodes = new Set<string>();
    
    tasksWithClients.forEach((task: typeof tasksWithClients[number]) => {
      if (task.TaskPartner) partnerCodes.add(task.TaskPartner);
      if (task.TaskManager) managerCodes.add(task.TaskManager);
    });
    
    // Look up employee names for partners and managers
    const employeeCodes = [...new Set([...Array.from(partnerCodes), ...Array.from(managerCodes)])];
    const employees = await prisma.employee.findMany({
      where: {
        EmpCode: { in: employeeCodes },
        Active: 'Yes'
      },
      select: {
        EmpCode: true,
        EmpNameFull: true
      }
    });
    
    // Create a map of employee code to name
    const employeeNameMap = new Map<string, string>();
    employees.forEach((emp: typeof employees[number]) => {
      employeeNameMap.set(emp.EmpCode, emp.EmpNameFull);
    });

    // 7. Extract unique values
    const clientsSet = new Map<string, string>();
    const groupsSet = new Set<string>();
    const partnersSet = new Map<string, string>();
    const tasksSet = new Map<string, string>();
    const managersSet = new Map<string, string>();

    tasksWithClients.forEach((task: typeof tasksWithClients[number]) => {
      // Clients (use code as ID, show "Code - Name")
      if (task.Client?.clientCode) {
        const label = task.Client.clientNameFull 
          ? `${task.Client.clientCode} - ${task.Client.clientNameFull}`
          : task.Client.clientCode;
        clientsSet.set(task.Client.clientCode, label);
      }

      // Groups (use description as both ID and label)
      if (task.Client?.groupDesc) {
        groupsSet.add(task.Client.groupDesc);
      }

      // Partners (use partner code as ID, look up name from Employee table)
      if (task.TaskPartner) {
        const partnerCode = task.TaskPartner;
        const partnerName = employeeNameMap.get(partnerCode) || partnerCode;
        if (!partnersSet.has(partnerCode)) {
          partnersSet.set(partnerCode, partnerName);
        }
      }

      // Tasks (use code as ID, show "Code - Description")
      if (task.TaskCode) {
        const label = task.TaskDesc 
          ? `${task.TaskCode} - ${task.TaskDesc}`
          : task.TaskCode;
        tasksSet.set(task.TaskCode, label);
      }

      // Managers (use code as ID, look up name from Employee table)
      if (task.TaskManager) {
        const managerCode = task.TaskManager;
        const managerName = employeeNameMap.get(managerCode) || managerCode;
        if (!managersSet.has(managerCode)) {
          managersSet.set(managerCode, managerName);
        }
      }
    });

    // 8. Convert to sorted arrays
    const response = {
      clients: Array.from(clientsSet.entries())
        .map(([id, label]) => ({ id, label }))
        .sort((a, b) => a.label.localeCompare(b.label)),
      
      groups: Array.from(groupsSet)
        .map(group => ({ id: group, label: group }))
        .sort((a, b) => a.label.localeCompare(b.label)),
      
      partners: Array.from(partnersSet.entries())
        .map(([id, label]) => ({ id, label }))
        .sort((a, b) => a.label.localeCompare(b.label)),
      
      tasks: Array.from(tasksSet.entries())
        .map(([id, label]) => ({ id, label }))
        .sort((a, b) => a.label.localeCompare(b.label)),
      
      managers: Array.from(managersSet.entries())
        .map(([id, label]) => ({ id, label }))
        .sort((a, b) => a.label.localeCompare(b.label))
    };

    // Cache for 30 minutes
    await cache.set(cacheKey, response, 1800);

    return NextResponse.json(successResponse(response));
  },
});








