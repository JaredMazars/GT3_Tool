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
import { enrichEmployeesWithStatus } from '@/lib/services/employees/employeeStatusService';
import { getCachedServiceLineMapping } from '@/lib/services/service-lines/serviceLineCache';
import { logger } from '@/lib/utils/logger';

// Type for subGroup in userServiceLines
interface SubGroupInfo {
  code: string;
  description?: string;
}

// Query params validation schema
const EmployeePlannerQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  includeUnallocated: z.enum(['true', 'false']).optional().transform(v => v === 'true'),
  'employees[]': z.array(z.string()).optional().default([]),
  'jobGrades[]': z.array(z.string()).optional().default([]),
  'offices[]': z.array(z.string()).optional().default([]),
  'clients[]': z.array(z.string()).optional().default([]),
  'taskCategories[]': z.array(z.string()).optional().default([]),
});

// Type for cache response
interface EmployeePlannerResponse {
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
  isCurrentTask?: boolean; // Whether this allocation belongs to the current service line
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
 * GET /api/service-lines/[serviceLine]/[subServiceLineGroup]/planner/employees
 * Fetch employee allocations for service line with server-side filtering and pagination
 * Returns Employee → Task Allocations (flat structure)
 * 
 * Performance optimizations:
 * - Redis caching (5min TTL)
 * - Pagination (25 limit default)
 * - Server-side filtering by employee, job grade, office, client, task category
 * - Optimized queries with Promise.all batching
 */
export const GET = secureRoute.queryWithParams<{ serviceLine: string; subServiceLineGroup: string }>({
  feature: Feature.ACCESS_DASHBOARD,
  handler: async (request, { user, params }) => {
    const startTime = Date.now();
    const perfLog: Record<string, number> = {};
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

    // Parse and validate query params
    const searchParams = request.nextUrl.searchParams;
    const queryParams = EmployeePlannerQuerySchema.parse({
      page: searchParams.get('page') || 1,
      limit: searchParams.get('limit') || 50,
      includeUnallocated: searchParams.get('includeUnallocated') || 'false',
      'employees[]': searchParams.getAll('employees[]'),
      'jobGrades[]': searchParams.getAll('jobGrades[]'),
      'offices[]': searchParams.getAll('offices[]'),
      'clients[]': searchParams.getAll('clients[]'),
      'taskCategories[]': searchParams.getAll('taskCategories[]'),
    });
    
    const { page, limit, includeUnallocated } = queryParams;
    const employees = queryParams['employees[]'];
    const jobGrades = queryParams['jobGrades[]'];
    const offices = queryParams['offices[]'];
    const clientCodes = queryParams['clients[]'];
    const taskCategories = queryParams['taskCategories[]'];

    // Build comprehensive cache key with array filters
    const cacheKey = `${CACHE_PREFIXES.TASK}planner:employees:${serviceLine}:${subServiceLineGroup}:employees:${employees.join(',') || 'all'}:jobGrades:${jobGrades.join(',') || 'all'}:offices:${offices.join(',') || 'all'}:clients:${clientCodes.join(',') || 'all'}:categories:${taskCategories.join(',') || 'all'}:unalloc:${includeUnallocated}:${page}:${limit}`;
    
    // Try cache first
    const cached = await cache.get<EmployeePlannerResponse>(cacheKey);
    if (cached) {
      return NextResponse.json(successResponse(cached));
    }

    // 6. Map subServiceLineGroup to external service line codes (cached)
    const t1 = Date.now();
    const externalServLineCodes = await getCachedServiceLineMapping(subServiceLineGroup);
    perfLog.serviceLineMapping = Date.now() - t1;

    if (externalServLineCodes.length === 0) {
      const emptyResponse = { 
        allocations: [], 
        pagination: { page, limit, total: 0, totalPages: 0, hasMore: false } 
      };
      await cache.set(cacheKey, emptyResponse, 300);
      return NextResponse.json(successResponse(emptyResponse));
    }

    // Build WHERE clause for TaskTeam query with filters
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

    // Employee filter (now using EmpCode from filter options)
    if (employees.length > 0) {
      // employees array now contains EmpCode values (e.g., ["WALB001", "JOHD002"])
      // 1. Look up Employee records by EmpCode
      const employeeRecords = await prisma.employee.findMany({
        where: { 
          EmpCode: { in: employees },
          Active: 'Yes'
        },
        select: {
          id: true,
          EmpCode: true,
          WinLogon: true
        }
      });
      
      // 2. Map employees to users using existing helper function
      const employeeUserMap = await mapEmployeesToUsers(employeeRecords);
      
      // 3. Extract User.id values (Azure AD GUIDs)
      const actualUserIds = Array.from(employeeUserMap.values()).map(user => user.id);
      
      // 4. Filter TaskTeam by actual User.id values
      if (actualUserIds.length > 0) {
        taskTeamWhere.userId = { in: actualUserIds };
      } else {
        // No matching users found - return empty results
        taskTeamWhere.userId = { in: ['__NO_MATCH__'] };
      }
    }

    // Client filter - only show allocations for specific clients
    if (clientCodes.length > 0) {
      taskTeamWhere.Task = {
        ...taskTeamWhere.Task,
        Client: {
          clientCode: { in: clientCodes }
        }
      };
    }

    // Task category filter
    if (taskCategories.length > 0) {
      const hasClientFilter = taskCategories.includes('client');
      const hasNoPlanningFilter = taskCategories.includes('no_planning');
      
      // Filter by task categories (client tasks vs internal event types)
      // Note: 'no_planning' means show users with NO allocations - handle this separately
      if (!hasNoPlanningFilter) {
        if (hasClientFilter) {
          // Show client tasks
          taskTeamWhere.Task = {
            ...taskTeamWhere.Task,
            GSClientID: { not: null }
          };
        } else {
          // Show specific internal event types (filter by NonClientEvent table)
          // For now, we'll handle this by filtering client tasks
          taskTeamWhere.Task = {
            ...taskTeamWhere.Task,
            GSClientID: null // Internal tasks
          };
        }
      }
    }

    // Pre-filter employees by job grade/office at database level (for both list and timeline views)
    // This allows TaskTeam query to use filtered user IDs, reducing data transfer
    let allServiceLineEmployees: ServiceLineEmployee[] = [];
    let preFilteredUserIds: string[] | undefined;
    
    // Build employee filter conditions
    const employeeWhere: any = {
      ServLineCode: { in: externalServLineCodes },
      Active: 'Yes',
      EmpDateLeft: null
    };
    
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
      const t2 = Date.now();
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
        orderBy: {
          EmpNameFull: 'asc'
        }
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
        const employeeToUserMap = await mapEmployeesToUsers(allServiceLineEmployees);
        preFilteredUserIds = Array.from(employeeToUserMap.values()).map(u => u.id);
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

    // Fetch TaskTeam allocations with pagination
    // If includeUnallocated, we need to map employees to user IDs first
    // Otherwise, paginate the allocations themselves
    let taskTeamWhereFinal = taskTeamWhere;
    let employeeUserIdMap = new Map<number, string>(); // Map employee ID to user ID
    let employeeToUserMapping: Map<number, NonNullable<Awaited<ReturnType<typeof mapEmployeesToUsers>> extends Map<number, infer U> ? U : never>> | null = null;
    
    if (includeUnallocated && allServiceLineEmployees.length > 0) {
      // Map employees to users to get user IDs (save for reuse later)
      employeeToUserMapping = await mapEmployeesToUsers(allServiceLineEmployees);
      
      // Build map of employee ID -> user ID
      allServiceLineEmployees.forEach(emp => {
        const user = employeeToUserMapping!.get(emp.id);  // Use employee ID, not WinLogon
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
        ...(skip !== undefined && { skip }),
        ...(take !== undefined && { take }),
        orderBy: [
          { User: { name: 'asc' } },
          { startDate: 'asc' }
        ]
      }),
      prisma.taskTeam.count({ where: taskTeamWhereFinal })
    ]);
    perfLog.taskTeamQuery = Date.now() - t4;

    // 9a. Fetch cross-service-line allocations for the same users (from OTHER service lines)
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

    // 9b. Fetch non-client allocations (leave, training, etc.)
    // Determine which employees to fetch non-client allocations for
    const t4b = Date.now();
    let employeeIds: number[] = [];
    
    if (allServiceLineEmployees.length > 0) {
      // Use the filtered employee list if available (timeline view or filtered list view)
      employeeIds = allServiceLineEmployees.map(emp => emp.id);
    } else {
      // For list view without filters, get employee IDs from the task allocations
      // This prevents unbounded queries while still showing non-client events for allocated employees
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
                OfficeCode: true
              }
            }
          },
          orderBy: [
            { Employee: { EmpNameFull: 'asc' } },
            { startDate: 'asc' }
          ]
        })
      : [];
    perfLog.nonClientAllocationsQuery = Date.now() - t4b;

    // 10. Get user IDs and fetch Employee data for job grade and office filters
    // Optimize: If we already have employee-to-user mapping, build reverse map instead of querying again
    const t5 = Date.now();
    let employeeMap: Map<string, any>;
    
    if (includeUnallocated && employeeToUserMapping && allServiceLineEmployees.length > 0) {
      // Build reverse map from user ID -> employee using data we already have
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

    // 10a. Fetch ServiceLineRole for ALL users (both allocated and unallocated)
    let userServiceLineRoleMap = new Map<string, string>();
    const allUserIds = [...new Set([
      ...taskTeamAllocations.map(a => a.userId),
      ...(includeUnallocated ? Array.from(employeeUserIdMap.values()) : [])
    ])];
    
    if (allUserIds.length > 0) {
      const serviceLineRoles = await prisma.serviceLineUser.findMany({
        where: {
          userId: { in: allUserIds },
          subServiceLineGroup: subServiceLineGroup
        },
        select: {
          userId: true,
          role: true
        }
      });
      
      userServiceLineRoleMap = new Map(
        serviceLineRoles.map(sr => [sr.userId, sr.role])
      );
    }

    // 11. Filtering now happens at database level via pre-filtered user IDs
    // No in-memory filtering needed - taskTeamAllocations already filtered
    const filteredAllocations = taskTeamAllocations;

    // Fetch employee status for all employees
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
      
      const serviceLineRole = userServiceLineRoleMap.get(allocation.userId) || 'USER';
      
      // Try to get employee status from batch lookup
      let empStatus = employee?.EmpCode ? employeeStatusMap.get(employee.EmpCode) : undefined;
      
      // No fallback - if not in batch map, leave undefined to avoid N+1 queries
      // The batch lookup on line 514 should have captured all employee codes

      return {
        allocationId: allocation.id,
        userId: allocation.userId,
        employeeId: employee?.id || null,
        userName: allocation.User?.name || employee?.EmpNameFull || allocation.userId,
        userEmail: allocation.User?.email || allocation.userId,
        jobGradeCode: employee?.EmpCatCode || null,
        serviceLineRole: serviceLineRole,
        officeLocation: employee?.OfficeCode?.trim() || null,
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
        nonClientEventType: null, // TODO: Handle NonClientEvent lookups if needed
        notes: null,
        isCurrentTask: true, // Current service line allocations are editable
        employeeStatus: empStatus
      };
    }));
    
    // 12a. Transform cross-service-line allocations and add with isCurrentTask: false
    const crossServiceLineRows = await Promise.all(crossServiceLineAllocations.map(async (allocation) => {
      const employee = employeeMap.get(allocation.userId.toLowerCase()) || 
                      employeeMap.get(allocation.userId.split('@')[0]?.toLowerCase() || '');

      const isClientTask = !!allocation.Task.Client?.clientCode;
      
      const serviceLineRole = userServiceLineRoleMap.get(allocation.userId) || 'USER';
      
      // Try to get employee status from batch lookup
      let empStatus = employee?.EmpCode ? employeeStatusMap.get(employee.EmpCode) : undefined;
      
      // No fallback - if not in batch map, leave undefined to avoid N+1 queries
      // The batch lookup on line 514 should have captured all employee codes

      return {
        allocationId: allocation.id,
        userId: allocation.userId,
        employeeId: employee?.id || null,
        userName: allocation.User?.name || employee?.EmpNameFull || allocation.userId,
        userEmail: allocation.User?.email || allocation.userId,
        jobGradeCode: employee?.EmpCatCode || null,
        serviceLineRole: serviceLineRole,
        officeLocation: employee?.OfficeCode?.trim() || null,
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
    
    // 12b. Transform non-client allocations and add them
    const t6c = Date.now();
    // Map non-client allocations to user IDs using employees we already have
    const nonClientEmployeeRecords = nonClientAllocations.map(a => a.Employee);
    const nonClientEmployeeToUserMap = nonClientEmployeeRecords.length > 0 
      ? await mapEmployeesToUsers(nonClientEmployeeRecords)
      : new Map();
    
    const nonClientRows = await Promise.all(nonClientAllocations.map(async (allocation) => {
      const employee = allocation.Employee;
      // Map employee to user
      const user = nonClientEmployeeToUserMap.get(employee.id);
      
      if (!user) {
        // Skip if no user mapping found (employee has no User account)
        return null;
      }

      const serviceLineRole = userServiceLineRoleMap.get(user.id) || 'USER';
      
      // Try to get employee status from batch lookup
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
        clientId: null,
        clientName: `Non-Client: ${allocation.eventType.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (l: string) => l.toUpperCase())}`,
        clientCode: 'NON_CLIENT',
        taskId: 0, // No task for non-client events
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
        isCurrentTask: true, // Non-client events are editable
        employeeStatus: empStatus
      };
    }));
    perfLog.nonClientTransformation = Date.now() - t6c;
    
    // Filter out nulls and merge all allocations
    const validNonClientRows = nonClientRows.filter(row => row !== null) as AllocationRow[];
    const mergedAllocationRows = [...allocationRows, ...crossServiceLineRows, ...validNonClientRows];
    
    // 13. For timeline view with includeUnallocated, add employees with no allocations
    let finalAllocationRows = mergedAllocationRows;
    if (includeUnallocated && allServiceLineEmployees.length > 0) {
      // Find employees with no allocations - check by employeeId which is more reliable
      const employeeIdsWithAllocations = new Set(
        allocationRows
          .filter(row => row.employeeId)
          .map(row => row.employeeId!)
      );
      
      const employeesWithoutAllocations = allServiceLineEmployees.filter(emp => {
        // Only include if this employee ID doesn't already have allocations
        return !employeeIdsWithAllocations.has(emp.id);
      });
      
      // Filters were already applied to allServiceLineEmployees, so no need to filter again
      let filteredUnallocatedEmployees = employeesWithoutAllocations;
      
      // Add placeholder rows for unallocated employees (needed for timeline to show employees)
      // These will have no allocation data but will display the employee in the timeline
      const unallocatedRows = await Promise.all(filteredUnallocatedEmployees.map(async (emp) => {
        const userId = employeeUserIdMap.get(emp.id);
        const userEmail = userId || `${emp.WinLogon}@forvismazars.us`;
        let empStatus = emp.EmpCode ? employeeStatusMap.get(emp.EmpCode) : undefined;
        
        // No fallback - if not in batch map, leave undefined to avoid N+1 queries
        
        return {
          allocationId: 0, // No allocation
          userId: userId || emp.WinLogon || `emp_${emp.id}`,
          employeeId: emp.id,
          userName: emp.EmpNameFull || emp.EmpName || `Employee ${emp.id}`,
          userEmail: userEmail,
          jobGradeCode: emp.EmpCatCode || null,
          serviceLineRole: userId ? (userServiceLineRoleMap.get(userId) || 'USER') : 'USER',
          officeLocation: emp.OfficeCode?.trim() || null,
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
          isCurrentTask: true, // Placeholder for unallocated employees in current service line
          employeeStatus: empStatus
        };
      }));
      
      finalAllocationRows = [...mergedAllocationRows, ...unallocatedRows];
    }
    
    // 14. Apply pagination to the final results
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

    // 15. Build pagination metadata
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

    // Cache for 5 minutes
    await cache.set(cacheKey, response, 300);

    // Log performance breakdown
    perfLog.total = Date.now() - startTime;
    logger.info('Planner employees query breakdown', {
      serviceLine,
      subServiceLineGroup,
      includeUnallocated,
      page,
      limit,
      resultCount: paginatedResults.length,
      ...perfLog
    });

    return NextResponse.json(successResponse(response));
  },
});
