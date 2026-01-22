export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { getUserServiceLines } from '@/lib/services/service-lines/serviceLineService';
import { successResponse } from '@/lib/utils/apiUtils';
import { AppError, ErrorCodes } from '@/lib/utils/errorHandler';
import { cache, CACHE_PREFIXES } from '@/lib/services/cache/CacheService';
import { secureRoute, Feature } from '@/lib/api/secureRoute';

// Type for cache response
interface GlobalClientPlannerFiltersResponse {
  clients: FilterOption[];
  groups: FilterOption[];
  partners: FilterOption[];
  tasks: FilterOption[];
  managers: FilterOption[];
  serviceLines: FilterOption[];
  subServiceLineGroups: FilterOption[];
}

interface FilterOption {
  id: string;
  label: string;
}

/**
 * GET /api/planner/clients/filters
 * Global client planner filters - returns all available filter options across service lines
 * Requires Country Management access
 * 
 * Performance optimizations:
 * - Redis caching (30min TTL for relatively static data)
 */
export const GET = secureRoute.query({
  feature: Feature.ACCESS_DASHBOARD,
  handler: async (request, { user }) => {
    // Check for SYSTEM_ADMIN first (bypasses all access checks)
    const isAdmin = user.systemRole === 'SYSTEM_ADMIN';
    
    if (!isAdmin) {
      // Check user has Country Management access
      const userServiceLines = await getUserServiceLines(user.id);
      const hasCountryMgmtAccess = userServiceLines.some(
        sl => sl.serviceLine === 'COUNTRY_MANAGEMENT'
      );
      
      if (!hasCountryMgmtAccess) {
        throw new AppError(403, 'Staff Planner requires Country Management access', ErrorCodes.FORBIDDEN);
      }
    }

    // Build cache key
    const cacheKey = `${CACHE_PREFIXES.TASK}global-planner:clients:filters`;
    
    // Try cache first
    const cached = await cache.get<GlobalClientPlannerFiltersResponse>(cacheKey);
    if (cached) {
      return NextResponse.json(successResponse(cached));
    }

    // Fetch all service lines and sub-service line groups
    const [serviceLineMaster, serviceLineExternal] = await Promise.all([
      prisma.serviceLineMaster.findMany({
        where: { active: true },
        select: { code: true, name: true },
        orderBy: { name: 'asc' }
      }),
      prisma.serviceLineExternal.findMany({
        select: {
          ServLineCode: true,
          SubServlineGroupCode: true,
          SubServlineGroupDesc: true,
          masterCode: true
        },
        distinct: ['SubServlineGroupCode']
      })
    ]);

    // Get all external service line codes
    const externalServLineCodes = [...new Set(
      serviceLineExternal
        .map(m => m.ServLineCode)
        .filter((code): code is string => !!code)
    )];

    // Fetch all tasks with clients
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
    
    tasksWithClients.forEach(task => {
      if (task.TaskPartner) partnerCodes.add(task.TaskPartner);
      if (task.TaskManager) managerCodes.add(task.TaskManager);
    });
    
    // Look up employee names
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
    
    const employeeNameMap = new Map<string, string>();
    employees.forEach(emp => {
      employeeNameMap.set(emp.EmpCode, emp.EmpNameFull);
    });

    // Extract unique values
    const clientsSet = new Map<string, string>();
    const groupsSet = new Set<string>();
    const partnersSet = new Map<string, string>();
    const tasksSet = new Map<string, string>();
    const managersSet = new Map<string, string>();

    tasksWithClients.forEach(task => {
      if (task.Client?.clientCode) {
        const label = task.Client.clientNameFull 
          ? `${task.Client.clientCode} - ${task.Client.clientNameFull}`
          : task.Client.clientCode;
        clientsSet.set(task.Client.clientCode, label);
      }

      if (task.Client?.groupDesc) {
        groupsSet.add(task.Client.groupDesc);
      }

      if (task.TaskPartner) {
        const partnerCode = task.TaskPartner;
        const partnerName = employeeNameMap.get(partnerCode) || partnerCode;
        if (!partnersSet.has(partnerCode)) {
          partnersSet.set(partnerCode, partnerName);
        }
      }

      if (task.TaskCode) {
        const label = task.TaskDesc 
          ? `${task.TaskCode} - ${task.TaskDesc}`
          : task.TaskCode;
        tasksSet.set(task.TaskCode, label);
      }

      if (task.TaskManager) {
        const managerCode = task.TaskManager;
        const managerName = employeeNameMap.get(managerCode) || managerCode;
        if (!managersSet.has(managerCode)) {
          managersSet.set(managerCode, managerName);
        }
      }
    });

    // Service lines
    const serviceLines = serviceLineMaster.map(sl => ({
      id: sl.code,
      label: sl.name
    }));

    // Sub-service line groups
    const subServiceLineGroupsSet = new Map<string, string>();
    serviceLineExternal.forEach(ext => {
      if (ext.SubServlineGroupCode) {
        subServiceLineGroupsSet.set(
          ext.SubServlineGroupCode,
          ext.SubServlineGroupDesc || ext.SubServlineGroupCode
        );
      }
    });

    const response: GlobalClientPlannerFiltersResponse = {
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
        .sort((a, b) => a.label.localeCompare(b.label)),
      
      serviceLines,
      
      subServiceLineGroups: Array.from(subServiceLineGroupsSet.entries())
        .map(([id, label]) => ({ id, label }))
        .sort((a, b) => a.label.localeCompare(b.label))
    };

    // Cache for 30 minutes
    await cache.set(cacheKey, response, 1800);

    return NextResponse.json(successResponse(response));
  },
});
