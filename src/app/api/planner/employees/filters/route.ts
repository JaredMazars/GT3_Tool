export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { getUserServiceLines } from '@/lib/services/service-lines/serviceLineService';
import { successResponse } from '@/lib/utils/apiUtils';
import { AppError, ErrorCodes } from '@/lib/utils/errorHandler';
import { cache, CACHE_PREFIXES } from '@/lib/services/cache/CacheService';
import { NON_CLIENT_EVENT_CONFIG } from '@/types';
import { secureRoute, Feature } from '@/lib/api/secureRoute';

// Type for cache response
interface GlobalEmployeePlannerFiltersResponse {
  employees: FilterOption[];
  jobGrades: FilterOption[];
  offices: FilterOption[];
  clients: FilterOption[];
  taskCategories: FilterOption[];
  serviceLines: FilterOption[];
  subServiceLineGroups: FilterOption[];
}

interface FilterOption {
  id: string;
  label: string;
}

/**
 * GET /api/planner/employees/filters
 * Global employee planner filters - returns all available filter options across service lines
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
    const cacheKey = `${CACHE_PREFIXES.TASK}global-planner:employees:filters`;
    
    // Try cache first
    const cached = await cache.get<GlobalEmployeePlannerFiltersResponse>(cacheKey);
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

    // Fetch all active employees across all service lines
    const employees = await prisma.employee.findMany({
      where: {
        ServLineCode: { in: externalServLineCodes },
        Active: 'Yes',
        EmpDateLeft: null
      },
      select: {
        id: true,
        EmpCode: true,
        EmpNameFull: true,
        EmpCatCode: true,
        OfficeCode: true,
        ServLineCode: true
      },
      orderBy: { EmpNameFull: 'asc' }
    });

    // Fetch tasks with clients
    const tasksWithClients = await prisma.task.findMany({
      where: {
        ServLineCode: { in: externalServLineCodes },
        Active: 'Yes'
      },
      select: {
        GSClientID: true,
        Client: {
          select: {
            clientCode: true,
            clientNameFull: true
          }
        }
      },
      distinct: ['GSClientID']
    });

    // Extract unique values for filters
    
    // Employees
    const employeesSet = new Map<string, string>();
    employees.forEach(emp => {
      if (emp.EmpCode && emp.EmpNameFull) {
        const label = `${emp.EmpNameFull} (${emp.EmpCode})`;
        employeesSet.set(emp.EmpCode, label);
      }
    });

    // Job grades
    const jobGradesSet = new Set<string>();
    employees.forEach(emp => {
      if (emp.EmpCatCode) {
        jobGradesSet.add(emp.EmpCatCode);
      }
    });

    // Offices
    const officesSet = new Set<string>();
    employees.forEach(emp => {
      if (emp.OfficeCode) {
        officesSet.add(emp.OfficeCode.trim());
      }
    });

    // Clients
    const clientsSet = new Map<string, string>();
    tasksWithClients.forEach(task => {
      if (task.Client?.clientCode) {
        const label = task.Client.clientNameFull 
          ? `${task.Client.clientCode} - ${task.Client.clientNameFull}`
          : task.Client.clientCode;
        clientsSet.set(task.Client.clientCode, label);
      }
    });

    // Task categories
    const taskCategories = [
      { id: 'client', label: 'Client Tasks' },
      { id: 'no_planning', label: 'No Planning (Unallocated)' },
      ...Object.entries(NON_CLIENT_EVENT_CONFIG).map(([key, config]) => ({
        id: key,
        label: config.label
      }))
    ];

    // Service lines (from master table)
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

    const response: GlobalEmployeePlannerFiltersResponse = {
      employees: Array.from(employeesSet.entries())
        .map(([id, label]) => ({ id, label }))
        .sort((a, b) => a.label.localeCompare(b.label)),
      
      jobGrades: Array.from(jobGradesSet)
        .map(grade => ({ id: grade, label: grade }))
        .sort((a, b) => a.label.localeCompare(b.label)),
      
      offices: Array.from(officesSet)
        .map(office => ({ id: office, label: office }))
        .sort((a, b) => a.label.localeCompare(b.label)),
      
      clients: Array.from(clientsSet.entries())
        .map(([id, label]) => ({ id, label }))
        .sort((a, b) => a.label.localeCompare(b.label)),
      
      taskCategories,
      
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
