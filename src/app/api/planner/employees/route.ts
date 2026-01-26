export const dynamic = 'force-dynamic';

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
import { logger } from '@/lib/utils/logger';

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
  isCurrentTask?: boolean; // Whether this allocation belongs to the filtered service lines (true) or other service lines (false = read-only)
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
    const startTime = Date.now();
    const perfLog: Record<string, number> = {};
    
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
    const t1 = Date.now();
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
    perfLog.serviceLineMapping = Date.now() - t1;

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

    // Pre-filter employees by job grade/office at database level (for both list and timeline views)
    // This allows TaskTeam query to use filtered user IDs, reducing data transfer
    let allServiceLineEmployees: ServiceLineEmployee[] = [];
    let preFilteredUserIds: string[] | undefined;
    let employeeToUserMapping: Map<number, { id: string; email: string; name: string | null }> | null = null;
    
    // Build employee filter conditions
    const t2 = Date.now();
    const hasServiceLineFilters = serviceLineFilters.length > 0 || subServiceLineGroupFilters.length > 0;
    const employeeWhere: any = {
      Active: 'Yes',
      EmpDateLeft: null
    };
    
    if (hasServiceLineFilters) {
      employeeWhere.ServLineCode = { in: externalServLineCodes };
    }
    
    // Apply job grade filter at database level
    if (jobGrades.length > 0) {
      employeeWhere.EmpCatCode = { in: jobGrades };
    }
    
    // Apply office filter at database level
    if (offices.length > 0) {
      employeeWhere.OfficeCode = { in: offices };
    }
    
    // For timeline view OR when filters are applied, fetch filtered employees
    if (includeUnallocated || jobGrades.length > 0 || offices.length > 0) {
      const employeesQuery = await prisma.employee.findMany({
        where: employeeWhere,
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
      
      // Apply employee filter if specified (by EmpCode)
      if (employees.length > 0) {
        allServiceLineEmployees = allServiceLineEmployees.filter(emp => 
          employees.includes(emp.EmpCode)
        );
      }
      
      perfLog.employeeQuery = Date.now() - t2;
      
      // If filters applied and not timeline view, get user IDs to constrain TaskTeam query
      if (!includeUnallocated && (jobGrades.length > 0 || offices.length > 0)) {
        const t3 = Date.now();
        employeeToUserMapping = await mapEmployeesToUsers(allServiceLineEmployees);
        preFilteredUserIds = Array.from(employeeToUserMapping.values()).map(u => u.id);
        perfLog.employeeToUserMapping = Date.now() - t3;
        
        // Apply to TaskTeam where clause
        if (preFilteredUserIds.length > 0) {
          taskTeamWhere.userId = { in: preFilteredUserIds };
        } else {
          // No matching employees - return empty results early
          taskTeamWhere.userId = { in: ['__NO_MATCH__'] };
        }
      }
    }

    // Fetch allocations
    let taskTeamWhereFinal = taskTeamWhere;
    let employeeUserIdMap = new Map<number, string>();
    
    if (includeUnallocated && allServiceLineEmployees.length > 0) {
      // Reuse existing mapping if available, otherwise create new one
      if (!employeeToUserMapping) {
        employeeToUserMapping = await mapEmployeesToUsers(allServiceLineEmployees);
      }
      
      allServiceLineEmployees.forEach(emp => {
        const user = employeeToUserMapping!.get(emp.id);
        if (user) {
          employeeUserIdMap.set(emp.id, user.id);
        }
      });
      
      const userIdsToFetch = Array.from(employeeUserIdMap.values());
      if (userIdsToFetch.length > 0) {
        taskTeamWhereFinal = {
          ...taskTeamWhere,
          userId: { in: userIdsToFetch }
        };
      }
    }
    
    // Apply pagination at database level for list view (not timeline view)
    // Timeline view needs all allocations for employees, then paginates employees
    const skip = !includeUnallocated ? (page - 1) * limit : undefined;
    const take = !includeUnallocated ? limit : undefined;
    
    const t4 = Date.now();
    const [taskTeamAllocations, totalCount] = await Promise.all([
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
        ...(skip !== undefined && { skip }),
        ...(take !== undefined && { take }),
        orderBy: [{ User: { name: 'asc' } }, { startDate: 'asc' }]
      }),
      prisma.taskTeam.count({ where: taskTeamWhereFinal })
    ]);
    perfLog.taskTeamQuery = Date.now() - t4;

    // Get user IDs and fetch Employee data
    // Optimize: If we already have employee-to-user mapping, build reverse map instead of querying again
    const t5 = Date.now();
    let employeeMap: Map<string, any>;
    
    if (includeUnallocated && employeeToUserMapping && allServiceLineEmployees.length > 0) {
      // Build reverse map from data we already have
      employeeMap = new Map();
      allServiceLineEmployees.forEach(emp => {
        const user = employeeToUserMapping!.get(emp.id);
        if (user) {
          // Map by user ID (lowercase) and email prefix for lookup
          employeeMap.set(user.id.toLowerCase(), emp);
          const emailPrefix = user.email.split('@')[0]?.toLowerCase();
          if (emailPrefix) {
            employeeMap.set(emailPrefix, emp);
          }
        }
      });
      
      // For any user IDs from allocations that we don't have yet, query those
      const unmappedUserIds = taskTeamAllocations
        .map(a => a.userId)
        .filter(userId => !employeeMap.has(userId.toLowerCase()));
      
      if (unmappedUserIds.length > 0) {
        const additionalEmployees = await mapUsersToEmployees(unmappedUserIds);
        // Merge with existing map
        additionalEmployees.forEach((emp, userId) => {
          employeeMap.set(userId, emp);
        });
      }
    } else {
      // Standard path: query all user IDs
      let userIdsForEmployeeMap = [...new Set(taskTeamAllocations.map(member => member.userId))];
      employeeMap = await mapUsersToEmployees(userIdsForEmployeeMap);
    }
    perfLog.userToEmployeeMapping = Date.now() - t5;

    // Fetch ServiceLineRole for ALL users (both allocated and unallocated)
    // For global view, we need to map by subServiceLineGroup since users may have different roles in different service lines
    let userServiceLineRoleMap = new Map<string, Map<string, string>>(); // userId -> subServiceLineGroup -> role
    const allUserIds = [...new Set([
      ...taskTeamAllocations.map(a => a.userId),
      ...(includeUnallocated ? Array.from(employeeUserIdMap.values()) : [])
    ])];
    
    if (allUserIds.length > 0) {
      // Fetch all service line roles for these users
      const serviceLineRoles = await prisma.serviceLineUser.findMany({
        where: {
          userId: { in: allUserIds }
        },
        select: {
          userId: true,
          subServiceLineGroup: true,
          role: true
        }
      });
      
      // Build nested map: userId -> subServiceLineGroup -> role
      serviceLineRoles.forEach(sr => {
        if (!userServiceLineRoleMap.has(sr.userId)) {
          userServiceLineRoleMap.set(sr.userId, new Map());
        }
        userServiceLineRoleMap.get(sr.userId)!.set(sr.subServiceLineGroup, sr.role);
      });
    }

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

    // Filtering now happens at database level via pre-filtered user IDs
    // No in-memory filtering needed - taskTeamAllocations already filtered
    const filteredAllocations = taskTeamAllocations;

    // Fetch cross-service-line allocations for the same users (from OTHER service lines)
    // These will be shown in grey and non-editable to provide full visibility of employee workload
    const currentServiceLineUserIds = [...new Set(taskTeamAllocations.map(a => a.userId))];
    const crossServiceLineAllocations = currentServiceLineUserIds.length > 0 
      ? await prisma.taskTeam.findMany({
          where: {
            userId: { in: currentServiceLineUserIds },
            startDate: { not: null },
            endDate: { not: null },
            Task: {
              ServLineCode: { notIn: externalServLineCodes } // From OTHER service lines
            }
          },
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
              select: {
                id: true,
                name: true,
                email: true,
                image: true
              }
            },
            Task: {
              select: {
                id: true,
                TaskDesc: true,
                TaskCode: true,
                GSClientID: true,
                ServLineCode: true, // Include to identify which service line
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
          orderBy: [
            { User: { name: 'asc' } },
            { startDate: 'asc' }
          ],
          take: 500 // Limit to prevent unbounded queries
        })
      : [];

    // Fetch non-client allocations (leave, training, etc.)
    const t5b = Date.now();
    let employeeIds: number[] = [];
    
    if (allServiceLineEmployees.length > 0) {
      // Use the filtered employee list if available (timeline view or filtered list view)
      employeeIds = allServiceLineEmployees.map(emp => emp.id);
    } else {
      // For list view without filters, get employee IDs from the task allocations
      const userIds = [...new Set(taskTeamAllocations.map(a => a.userId))];
      if (userIds.length > 0) {
        const userEmployeeMap = await mapUsersToEmployees(userIds);
        employeeIds = Array.from(userEmployeeMap.values())
          .map(emp => emp.id)
          .filter(Boolean) as number[];
      }
    }
    
    const nonClientAllocations = employeeIds.length > 0 
      ? await prisma.nonClientAllocation.findMany({
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
            Employee: {
              select: {
                id: true,
                EmpCode: true,
                EmpName: true,
                EmpNameFull: true,
                WinLogon: true,
                EmpCatCode: true,
                OfficeCode: true,
                ServLineCode: true
              }
            }
          },
          orderBy: [
            { Employee: { EmpNameFull: 'asc' } },
            { startDate: 'asc' }
          ]
        })
      : [];
    perfLog.nonClientAllocationsQuery = Date.now() - t5b;

    // Fetch employee status
    const t6 = Date.now();
    const allEmployeeCodes = Array.from(employeeMap.values())
      .map(emp => emp.EmpCode)
      .filter(Boolean) as string[];
    const employeeStatusMap = await enrichEmployeesWithStatus(allEmployeeCodes);
    perfLog.employeeStatusEnrichment = Date.now() - t6;

    // Transform to flat structure
    const allocationRows = await Promise.all(filteredAllocations.map(async (allocation) => {
      const employee = employeeMap.get(allocation.userId.toLowerCase()) || 
                      employeeMap.get(allocation.userId.split('@')[0]?.toLowerCase() || '');

      const isClientTask = !!allocation.Task.Client?.clientCode;
      const servLineGroup = allocation.Task.ServLineCode ? servLineCodeToGroup.get(allocation.Task.ServLineCode) : null;
      
      // Get service line role for this user in this specific sub-service line group
      const serviceLineRole = servLineGroup?.code 
        ? (userServiceLineRoleMap.get(allocation.userId)?.get(servLineGroup.code) || 'USER')
        : 'USER';
      
      // Try to get employee status from batch lookup
      let empStatus = employee?.EmpCode ? employeeStatusMap.get(employee.EmpCode) : undefined;
      
      // No fallback - if not in batch map, leave undefined to avoid N+1 queries

      return {
        allocationId: allocation.id,
        userId: allocation.userId,
        employeeId: employee?.id || null,
        userName: allocation.User?.name || employee?.EmpNameFull || allocation.userId,
        userEmail: allocation.User?.email || allocation.userId,
        jobGradeCode: employee?.EmpCatCode || null,
        serviceLineRole: serviceLineRole,
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
        isCurrentTask: true, // Current service line allocations are editable
        employeeStatus: empStatus
      };
    }));
    
    // Transform cross-service-line allocations and add with isCurrentTask: false
    const crossServiceLineRows = await Promise.all(crossServiceLineAllocations.map(async (allocation) => {
      const employee = employeeMap.get(allocation.userId.toLowerCase()) || 
                      employeeMap.get(allocation.userId.split('@')[0]?.toLowerCase() || '');

      const isClientTask = !!allocation.Task.Client?.clientCode;
      const servLineGroup = allocation.Task.ServLineCode ? servLineCodeToGroup.get(allocation.Task.ServLineCode) : null;
      
      // Get service line role for this user in this specific sub-service line group
      const serviceLineRole = servLineGroup?.code 
        ? (userServiceLineRoleMap.get(allocation.userId)?.get(servLineGroup.code) || 'USER')
        : 'USER';
      
      // Try to get employee status from batch lookup
      let empStatus = employee?.EmpCode ? employeeStatusMap.get(employee.EmpCode) : undefined;
      
      // No fallback - if not in batch map, leave undefined to avoid N+1 queries

      return {
        allocationId: allocation.id,
        userId: allocation.userId,
        employeeId: employee?.id || null,
        userName: allocation.User?.name || employee?.EmpNameFull || allocation.userId,
        userEmail: allocation.User?.email || allocation.userId,
        jobGradeCode: employee?.EmpCatCode || null,
        serviceLineRole: serviceLineRole,
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
        isCurrentTask: false, // Cross-service-line allocations are read-only
        employeeStatus: empStatus
      };
    }));
    
    // Transform non-client allocations and add them
    const t8 = Date.now();
    const nonClientEmployeeRecords = nonClientAllocations.map(a => a.Employee);
    const nonClientEmployeeToUserMap = nonClientEmployeeRecords.length > 0 
      ? await mapEmployeesToUsers(nonClientEmployeeRecords)
      : new Map();
    
    const nonClientRows = await Promise.all(nonClientAllocations.map(async (allocation) => {
      const employee = allocation.Employee;
      const user = nonClientEmployeeToUserMap.get(employee.id);
      
      if (!user) {
        // Skip if no user mapping found (employee has no User account)
        return null;
      }

      const servLineGroup = employee.ServLineCode ? servLineCodeToGroup.get(employee.ServLineCode) : null;
      const serviceLineRole = servLineGroup?.code 
        ? (userServiceLineRoleMap.get(user.id)?.get(servLineGroup.code) || 'USER')
        : 'USER';
      
      let empStatus = employee.EmpCode ? employeeStatusMap.get(employee.EmpCode) : undefined;

      return {
        allocationId: allocation.id,
        userId: user.id,
        employeeId: employee.id,
        userName: user.name || employee.EmpNameFull,
        userEmail: user.email,
        jobGradeCode: employee.EmpCatCode || null,
        serviceLineRole: serviceLineRole,
        officeLocation: employee.OfficeCode?.trim() || null,
        serviceLine: employee.ServLineCode || null,
        subServiceLineGroup: servLineGroup?.code || null,
        clientId: null,
        clientName: `Non-Client: ${allocation.eventType.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (l: string) => l.toUpperCase())}`,
        clientCode: 'NON_CLIENT',
        taskId: 0,
        taskName: allocation.eventType.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (l: string) => l.toUpperCase()),
        taskCode: null,
        startDate: startOfDay(allocation.startDate),
        endDate: startOfDay(allocation.endDate),
        role: 'USER',
        allocatedHours: allocation.allocatedHours ? parseFloat(allocation.allocatedHours.toString()) : null,
        allocatedPercentage: allocation.allocatedPercentage,
        actualHours: null,
        isNonClientEvent: true,
        nonClientEventType: allocation.eventType,
        notes: allocation.notes,
        isCurrentTask: true,
        employeeStatus: empStatus
      };
    }));
    perfLog.nonClientTransformation = Date.now() - t8;
    
    // Filter out nulls and merge all allocations
    const validNonClientRows = nonClientRows.filter(row => row !== null) as AllocationRow[];
    const mergedAllocationRows = [...allocationRows, ...crossServiceLineRows, ...validNonClientRows];
    
    // Add employees with no allocations for timeline view
    let finalAllocationRows = mergedAllocationRows;
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
        
        // No fallback - if not in batch map, leave undefined to avoid N+1 queries
        
        const servLineGroup = emp.ServLineCode ? servLineCodeToGroup.get(emp.ServLineCode) : null;
        
        // Get service line role for this user in their service line
        const serviceLineRole = (userId && servLineGroup?.code)
          ? (userServiceLineRoleMap.get(userId)?.get(servLineGroup.code) || 'USER')
          : 'USER';
        
        return {
          allocationId: 0,
          userId: userId || emp.WinLogon || `emp_${emp.id}`,
          employeeId: emp.id,
          userName: emp.EmpNameFull || emp.EmpName || `Employee ${emp.id}`,
          userEmail: userEmail,
          jobGradeCode: emp.EmpCatCode || null,
          serviceLineRole: serviceLineRole,
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
          isCurrentTask: true, // Placeholder for unallocated employees in filtered service lines
          employeeStatus: empStatus
        };
      }));
      
      finalAllocationRows = [...mergedAllocationRows, ...unallocatedRows];
    }
    
    // Apply pagination to the final results
    // List view: Already paginated at database level (skip/take on TaskTeam query)
    // Timeline view: Paginate in-memory (based on employees, includes unallocated)
    let paginatedResults: typeof finalAllocationRows;
    let totalFilteredCount: number;
    
    if (includeUnallocated) {
      // Timeline view: Paginate employees (in-memory)
      totalFilteredCount = allServiceLineEmployees.length;
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      paginatedResults = finalAllocationRows.slice(startIndex, endIndex);
    } else {
      // List view: Already paginated at DB level, use as-is
      totalFilteredCount = totalCount; // From Prisma count query
      paginatedResults = finalAllocationRows;
    }

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

    // Log performance breakdown
    perfLog.total = Date.now() - startTime;
    logger.info('Global planner employees query breakdown', {
      includeUnallocated,
      page,
      limit,
      resultCount: paginatedResults.length,
      crossServiceCount: crossServiceLineAllocations.length,
      ...perfLog
    });

    return NextResponse.json(successResponse(response));
  },
});
