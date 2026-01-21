import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db/prisma';
import { getUserServiceLines } from '@/lib/services/service-lines/serviceLineService';
import { successResponse } from '@/lib/utils/apiUtils';
import { AppError, ErrorCodes } from '@/lib/utils/errorHandler';
import { startOfDay } from 'date-fns';
import { cache, CACHE_PREFIXES } from '@/lib/services/cache/CacheService';
import { mapUsersToEmployees, mapEmployeesToUsers } from '@/lib/services/employees/employeeService';
import { secureRoute, Feature } from '@/lib/api/secureRoute';
import { ServiceLineRole } from '@/types';
import { enrichEmployeesWithStatus, getEmployeeStatus } from '@/lib/services/employees/employeeStatusService';
import { extractEmpCodeFromUserId } from '@/lib/utils/employeeCodeExtractor';

// Query params validation schema
const GlobalEmployeePlannerQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  includeUnallocated: z.enum(['true', 'false']).optional().transform(v => v === 'true'),
  'employees[]': z.array(z.string()).optional().default([]),
  'jobGrades[]': z.array(z.string()).optional().default([]),
  'offices[]': z.array(z.string()).optional().default([]),
  'clients[]': z.array(z.string()).optional().default([]),
  'taskCategories[]': z.array(z.string()).optional().default([]),
  'serviceLines[]': z.array(z.string()).optional().default([]),
  'subServiceLineGroups[]': z.array(z.string()).optional().default([]),
});

// Type for cache response
interface GlobalEmployeePlannerResponse {
  allocations: AllocationRow[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
  };
}

interface AllocationRow {
  allocationId: number;
  userId: string;
  employeeId: number | null;
  userName: string;
  userEmail: string;
  jobGradeCode: string | null;
  serviceLineRole: string;
  officeLocation: string | null;
  serviceLine: string | null;
  subServiceLineGroup: string | null;
  clientId: number | null;
  clientName: string;
  clientCode: string;
  taskId: number;
  taskName: string | null;
  taskCode: string | null;
  startDate: Date;
  endDate: Date;
  role: string;
  allocatedHours: number | null;
  allocatedPercentage: number | null;
  actualHours: number | null;
  isNonClientEvent: boolean;
  nonClientEventType: string | null;
  notes: string | null;
  employeeStatus?: {
    isActive: boolean;
    hasUserAccount: boolean;
  };
}

// Type for employee from database
interface ServiceLineEmployee {
  id: number;
  GSEmployeeID: string | null;
  EmpCode: string;
  EmpName: string | null;
  EmpNameFull: string;
  OfficeCode: string | null;
  ServLineCode: string | null;
  EmpCatCode: string | null;
  WinLogon: string | null;
}

/**
 * GET /api/planner/employees
 * Global employee planner - fetch allocations across all service lines
 * Requires Country Management access
 * 
 * Performance optimizations:
 * - Redis caching (5min TTL)
 * - Pagination (50 limit default)
 * - Server-side filtering by employee, job grade, office, client, task category, service line
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

    // Parse and validate query params
    const searchParams = request.nextUrl.searchParams;
    const queryParams = GlobalEmployeePlannerQuerySchema.parse({
      page: searchParams.get('page') || 1,
      limit: searchParams.get('limit') || 50,
      includeUnallocated: searchParams.get('includeUnallocated') || 'false',
      'employees[]': searchParams.getAll('employees[]'),
      'jobGrades[]': searchParams.getAll('jobGrades[]'),
      'offices[]': searchParams.getAll('offices[]'),
      'clients[]': searchParams.getAll('clients[]'),
      'taskCategories[]': searchParams.getAll('taskCategories[]'),
      'serviceLines[]': searchParams.getAll('serviceLines[]'),
      'subServiceLineGroups[]': searchParams.getAll('subServiceLineGroups[]'),
    });
    
    const { page, limit, includeUnallocated } = queryParams;
    const employees = queryParams['employees[]'];
    const jobGrades = queryParams['jobGrades[]'];
    const offices = queryParams['offices[]'];
    const clientCodes = queryParams['clients[]'];
    const taskCategories = queryParams['taskCategories[]'];
    const serviceLineFilters = queryParams['serviceLines[]'];
    const subServiceLineGroupFilters = queryParams['subServiceLineGroups[]'];

    // Build comprehensive cache key
    const cacheKey = `${CACHE_PREFIXES.TASK}global-planner:employees:sl:${serviceLineFilters.join(',') || 'all'}:sslg:${subServiceLineGroupFilters.join(',') || 'all'}:employees:${employees.join(',') || 'all'}:jobGrades:${jobGrades.join(',') || 'all'}:offices:${offices.join(',') || 'all'}:clients:${clientCodes.join(',') || 'all'}:categories:${taskCategories.join(',') || 'all'}:unalloc:${includeUnallocated}:${page}:${limit}`;
    
    // Try cache first
    const cached = await cache.get<GlobalEmployeePlannerResponse>(cacheKey);
    if (cached) {
      return NextResponse.json(successResponse(cached));
    }

    // Get external service line codes based on filters
    let externalServLineCodes: string[] = [];
    
    // OPTIMIZATION: Consolidate all service line mapping queries into a single query
    // Build conditional where clause based on filters
    const mappingWhere: any = {};
    
    if (subServiceLineGroupFilters.length > 0) {
      mappingWhere.SubServlineGroupCode = { in: subServiceLineGroupFilters };
    } else if (serviceLineFilters.length > 0) {
      mappingWhere.masterCode = { in: serviceLineFilters };
    }
    // else: no filter = fetch all (empty where clause)

    // Single query instead of 3 separate conditional queries
    const mappings = await prisma.serviceLineExternal.findMany({
      where: mappingWhere,
      select: { ServLineCode: true }
    });
    
    externalServLineCodes = [...new Set(
      mappings.map(m => m.ServLineCode).filter((code): code is string => !!code)
    )];

    if (externalServLineCodes.length === 0) {
      const emptyResponse = { 
        allocations: [], 
        pagination: { page, limit, total: 0, totalPages: 0, hasMore: false } 
      };
      await cache.set(cacheKey, emptyResponse, 300);
      return NextResponse.json(successResponse(emptyResponse));
    }

    // Build WHERE clause for TaskTeam query
    interface TaskTeamWhereInput {
      startDate: { not: null };
      endDate: { not: null };
      Task: {
        ServLineCode: { in: string[] };
        Client?: { clientCode: { in: string[] } };
        GSClientID?: { not: null } | null;
      };
      userId?: { in: string[] };
    }
    
    const taskTeamWhere: TaskTeamWhereInput = {
      startDate: { not: null },
      endDate: { not: null },
      Task: {
        ServLineCode: { in: externalServLineCodes }
      }
    };

    // Employee filter
    if (employees.length > 0) {
      const employeeRecords = await prisma.employee.findMany({
        where: { 
          EmpCode: { in: employees },
          Active: 'Yes'
        },
        select: { id: true, EmpCode: true, WinLogon: true }
      });
      
      const employeeUserMap = await mapEmployeesToUsers(employeeRecords);
      const actualUserIds = Array.from(employeeUserMap.values()).map(user => user.id);
      
      if (actualUserIds.length > 0) {
        taskTeamWhere.userId = { in: actualUserIds };
      } else {
        taskTeamWhere.userId = { in: ['__NO_MATCH__'] };
      }
    }

    // Client filter
    if (clientCodes.length > 0) {
      taskTeamWhere.Task = {
        ...taskTeamWhere.Task,
        Client: { clientCode: { in: clientCodes } }
      };
    }

    // Task category filter
    if (taskCategories.length > 0) {
      const hasClientFilter = taskCategories.includes('client');
      const hasNoPlanningFilter = taskCategories.includes('no_planning');
      
      if (!hasNoPlanningFilter) {
        if (hasClientFilter) {
          taskTeamWhere.Task = { ...taskTeamWhere.Task, GSClientID: { not: null } };
        } else {
          taskTeamWhere.Task = { ...taskTeamWhere.Task, GSClientID: null };
        }
      }
    }

    // For timeline view, get ALL employees from filtered service lines
    let allServiceLineEmployees: ServiceLineEmployee[] = [];
    if (includeUnallocated) {
      // For global view without filters, get ALL active employees
      // Only filter by ServLineCode if specific service line filters are applied
      const hasServiceLineFilters = serviceLineFilters.length > 0 || subServiceLineGroupFilters.length > 0;
      
      const employeesQuery = await prisma.employee.findMany({
        where: {
          ...(hasServiceLineFilters ? { ServLineCode: { in: externalServLineCodes } } : {}),
          Active: 'Yes',
          EmpDateLeft: null
        },
        select: {
          id: true,
          GSEmployeeID: true,
          EmpCode: true,
          EmpName: true,
          EmpNameFull: true,
          OfficeCode: true,
          ServLineCode: true,
          EmpCatCode: true,
          WinLogon: true
        },
        orderBy: { EmpNameFull: 'asc' }
      });
      
      allServiceLineEmployees = employeesQuery;
      
      // Apply employee filter
      if (employees.length > 0) {
        allServiceLineEmployees = allServiceLineEmployees.filter(emp => 
          employees.includes(emp.EmpCode)
        );
      }
      
      // Apply job grade and office filters
      if (jobGrades.length > 0 || offices.length > 0) {
        allServiceLineEmployees = allServiceLineEmployees.filter(emp => {
          if (jobGrades.length > 0) {
            const empJobGrade = emp.EmpCatCode;
            if (!empJobGrade || !jobGrades.includes(empJobGrade)) return false;
          }
          if (offices.length > 0) {
            const empOffice = emp.OfficeCode?.trim();
            if (!empOffice || !offices.includes(empOffice)) return false;
          }
          return true;
        });
      }
    }

    // Fetch allocations
    let taskTeamWhereFinal = taskTeamWhere;
    const employeeUserIdMap = new Map<number, string>();
    
    if (includeUnallocated && allServiceLineEmployees.length > 0) {
      const employeeUserMap = await mapEmployeesToUsers(allServiceLineEmployees);
      
      allServiceLineEmployees.forEach(emp => {
        const user = employeeUserMap.get(emp.id);
        if (user) {
          employeeUserIdMap.set(emp.id, user.id);
        }
      });
      
      const userIdsToFetch = Array.from(employeeUserIdMap.values());
      if (userIdsToFetch.length > 0) {
        taskTeamWhereFinal = { ...taskTeamWhere, userId: { in: userIdsToFetch } };
      }
    }
    
    const [taskTeamAllocations, _totalCount] = await Promise.all([
      prisma.taskTeam.findMany({
        where: taskTeamWhereFinal,
        select: {
          id: true,
          taskId: true,
          userId: true,
          role: true,
          startDate: true,
          endDate: true,
          allocatedHours: true,
          allocatedPercentage: true,
          actualHours: true,
          User: {
            select: { id: true, name: true, email: true, image: true }
          },
          Task: {
            select: {
              id: true,
              TaskDesc: true,
              TaskCode: true,
              GSClientID: true,
              ServLineCode: true,
              Client: {
                select: { id: true, clientCode: true, clientNameFull: true }
              }
            }
          }
        },
        orderBy: [{ User: { name: 'asc' } }, { startDate: 'asc' }]
      }),
      prisma.taskTeam.count({ where: taskTeamWhereFinal })
    ]);

    // Get user IDs and fetch Employee data
    let userIdsForEmployeeMap = [...new Set(taskTeamAllocations.map(member => member.userId))];
    
    if (includeUnallocated) {
      userIdsForEmployeeMap = [...new Set([...userIdsForEmployeeMap, ...Array.from(employeeUserIdMap.values())])];
    }
    
    const employeeMap = await mapUsersToEmployees(userIdsForEmployeeMap);

    // Get service line external mappings for display
    const servLineCodeToGroup = new Map<string, { code: string; desc: string }>();
    const allExternalMappings = await prisma.serviceLineExternal.findMany({
      where: { ServLineCode: { in: externalServLineCodes } },
      select: { ServLineCode: true, SubServlineGroupCode: true, SubServlineGroupDesc: true }
    });
    allExternalMappings.forEach(m => {
      if (m.ServLineCode) {
        servLineCodeToGroup.set(m.ServLineCode, {
          code: m.SubServlineGroupCode || '',
          desc: m.SubServlineGroupDesc || ''
        });
      }
    });

    // Apply job grade and office filters for list view
    let filteredAllocations = taskTeamAllocations;
    
    if (!includeUnallocated && (jobGrades.length > 0 || offices.length > 0)) {
      filteredAllocations = taskTeamAllocations.filter(allocation => {
        const employee = employeeMap.get(allocation.userId.toLowerCase()) || 
                        employeeMap.get(allocation.userId.split('@')[0]?.toLowerCase() || '');
        
        if (jobGrades.length > 0) {
          const empJobGrade = employee?.EmpCatCode;
          if (!empJobGrade || !jobGrades.includes(empJobGrade)) return false;
        }
        
        if (offices.length > 0) {
          const empOffice = employee?.OfficeCode?.trim();
          if (!empOffice || !offices.includes(empOffice)) return false;
        }
        
        return true;
      });
    }

    // Fetch employee status
    const allEmployeeCodes = Array.from(employeeMap.values())
      .map(emp => emp.EmpCode)
      .filter(Boolean) as string[];
    const employeeStatusMap = await enrichEmployeesWithStatus(allEmployeeCodes);

    // Transform to flat structure
    const allocationRows = await Promise.all(filteredAllocations.map(async (allocation) => {
      const employee = employeeMap.get(allocation.userId.toLowerCase()) || 
                      employeeMap.get(allocation.userId.split('@')[0]?.toLowerCase() || '');

      const isClientTask = !!allocation.Task.Client?.clientCode;
      const servLineGroup = allocation.Task.ServLineCode ? servLineCodeToGroup.get(allocation.Task.ServLineCode) : null;
      
      let empStatus = employee?.EmpCode ? employeeStatusMap.get(employee.EmpCode) : undefined;
      
      if (!empStatus) {
        const extractedEmpCode = extractEmpCodeFromUserId(allocation.userId);
        if (extractedEmpCode) {
          empStatus = (await getEmployeeStatus(extractedEmpCode)) ?? undefined;
        }
      }

      return {
        allocationId: allocation.id,
        userId: allocation.userId,
        employeeId: employee?.id || null,
        userName: allocation.User?.name || employee?.EmpNameFull || allocation.userId,
        userEmail: allocation.User?.email || allocation.userId,
        jobGradeCode: employee?.EmpCatCode || null,
        serviceLineRole: 'USER',
        officeLocation: employee?.OfficeCode?.trim() || null,
        serviceLine: employee?.ServLineCode || allocation.Task.ServLineCode || null,
        subServiceLineGroup: servLineGroup?.code || null,
        clientId: allocation.Task.Client?.id || null,
        clientName: isClientTask ? (allocation.Task.Client?.clientNameFull || allocation.Task.Client?.clientCode || 'Unknown') : 'Internal',
        clientCode: isClientTask ? (allocation.Task.Client?.clientCode || 'N/A') : 'INTERNAL',
        taskId: allocation.Task.id,
        taskName: allocation.Task.TaskDesc,
        taskCode: allocation.Task.TaskCode || null,
        startDate: startOfDay(allocation.startDate!),
        endDate: startOfDay(allocation.endDate!),
        role: allocation.role,
        allocatedHours: allocation.allocatedHours ? parseFloat(allocation.allocatedHours.toString()) : null,
        allocatedPercentage: allocation.allocatedPercentage,
        actualHours: allocation.actualHours ? parseFloat(allocation.actualHours.toString()) : null,
        isNonClientEvent: !isClientTask,
        nonClientEventType: null,
        notes: null,
        employeeStatus: empStatus
      };
    }));
    
    // Add employees with no allocations for timeline view
    let finalAllocationRows = allocationRows;
    if (includeUnallocated && allServiceLineEmployees.length > 0) {
      const employeeIdsWithAllocations = new Set(
        allocationRows.filter(row => row.employeeId).map(row => row.employeeId!)
      );
      
      const employeesWithoutAllocations = allServiceLineEmployees.filter(emp => 
        !employeeIdsWithAllocations.has(emp.id)
      );
      
      const unallocatedRows = await Promise.all(employeesWithoutAllocations.map(async (emp) => {
        const userId = employeeUserIdMap.get(emp.id);
        const userEmail = userId || `${emp.WinLogon}@forvismazars.us`;
        let empStatus = emp.EmpCode ? employeeStatusMap.get(emp.EmpCode) : undefined;
        
        if (!empStatus && emp.EmpCode) {
          empStatus = (await getEmployeeStatus(emp.EmpCode)) ?? undefined;
        }
        
        const servLineGroup = emp.ServLineCode ? servLineCodeToGroup.get(emp.ServLineCode) : null;
        
        return {
          allocationId: 0,
          userId: userId || emp.WinLogon || `emp_${emp.id}`,
          employeeId: emp.id,
          userName: emp.EmpNameFull || emp.EmpName || `Employee ${emp.id}`,
          userEmail: userEmail,
          jobGradeCode: emp.EmpCatCode || null,
          serviceLineRole: 'USER',
          officeLocation: emp.OfficeCode?.trim() || null,
          serviceLine: emp.ServLineCode || null,
          subServiceLineGroup: servLineGroup?.code || null,
          clientId: null,
          clientName: '',
          clientCode: '',
          taskId: 0,
          taskName: '',
          taskCode: null,
          startDate: startOfDay(new Date()),
          endDate: startOfDay(new Date()),
          role: ServiceLineRole.VIEWER,
          allocatedHours: null,
          allocatedPercentage: null,
          actualHours: null,
          isNonClientEvent: false,
          nonClientEventType: null,
          notes: null,
          employeeStatus: empStatus
        };
      }));
      
      finalAllocationRows = [...allocationRows, ...unallocatedRows];
    }
    
    // Apply pagination
    const totalFilteredCount = includeUnallocated 
      ? allServiceLineEmployees.length
      : filteredAllocations.length;
    
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedResults = finalAllocationRows.slice(startIndex, endIndex);

    const response = {
      allocations: paginatedResults,
      pagination: {
        page,
        limit,
        total: totalFilteredCount,
        totalPages: Math.ceil(totalFilteredCount / limit),
        hasMore: totalFilteredCount > (page * limit)
      }
    };

    await cache.set(cacheKey, response, 300);

    return NextResponse.json(successResponse(response));
  },
});
