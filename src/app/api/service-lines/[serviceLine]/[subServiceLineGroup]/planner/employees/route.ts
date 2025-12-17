import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { getCurrentUser } from '@/lib/services/auth/auth';
import { getUserServiceLines } from '@/lib/services/service-lines/serviceLineService';
import { successResponse } from '@/lib/utils/apiUtils';
import { handleApiError, AppError } from '@/lib/utils/errorHandler';
import { startOfDay } from 'date-fns';
import { cache, CACHE_PREFIXES } from '@/lib/services/cache/CacheService';
import { mapUsersToEmployees } from '@/lib/services/employees/employeeService';

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
export async function GET(
  request: NextRequest,
  { params }: { params: { serviceLine: string; subServiceLineGroup: string } }
) {
  const perfStart = Date.now();
  
  try {
    // 1. Authenticate
    const user = await getCurrentUser();
    if (!user?.id) {
      return handleApiError(new AppError(401, 'Unauthorized'), 'Get employee planner data');
    }

    // 2. Extract and validate params
    const subServiceLineGroup = params.subServiceLineGroup;
    if (!subServiceLineGroup) {
      return handleApiError(new AppError(400, 'Sub-service line group is required'), 'Get employee planner data');
    }

    // 3. Check user has access to this sub-service line group
    const userServiceLines = await getUserServiceLines(user.id);
    const hasAccess = userServiceLines.some(sl => 
      sl.subGroups?.some((sg: any) => sg.code === subServiceLineGroup)
    );
    if (!hasAccess) {
      return handleApiError(
        new AppError(403, 'You do not have access to this sub-service line group'),
        'Get employee planner data'
      );
    }

    // 4. Get search params for filtering and pagination (array-based filters)
    const searchParams = request.nextUrl.searchParams;
    const employees = searchParams.getAll('employees[]'); // User IDs or emails
    const jobGrades = searchParams.getAll('jobGrades[]'); // Job titles
    const offices = searchParams.getAll('offices[]'); // Office locations
    const clientCodes = searchParams.getAll('clients[]'); // Client codes
    const taskCategories = searchParams.getAll('taskCategories[]'); // 'client', 'no_planning', or NonClientEventType values
    const includeUnallocated = searchParams.get('includeUnallocated') === 'true'; // For timeline view
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');

    // 5. Build comprehensive cache key with array filters
    const cacheKey = `${CACHE_PREFIXES.TASK}planner:employees:${params.serviceLine}:${subServiceLineGroup}:employees:${employees.join(',') || 'all'}:jobGrades:${jobGrades.join(',') || 'all'}:offices:${offices.join(',') || 'all'}:clients:${clientCodes.join(',') || 'all'}:categories:${taskCategories.join(',') || 'all'}:unalloc:${includeUnallocated}:${page}:${limit}`;
    
    // Try cache first
    const cached = await cache.get(cacheKey) as any;
    if (cached) {
      return NextResponse.json(successResponse(cached));
    }

    // 6. Map subServiceLineGroup to external service line codes
    const serviceLineExternalMappings = await prisma.serviceLineExternal.findMany({
      where: {
        SubServlineGroupCode: subServiceLineGroup
      },
      select: {
        ServLineCode: true,
        SubServlineGroupCode: true,
        SubServlineGroupDesc: true
      }
    });
    
    const externalServLineCodes = serviceLineExternalMappings
      .map(m => m.ServLineCode)
      .filter((code): code is string => !!code);

    if (externalServLineCodes.length === 0) {
      const emptyResponse = { 
        allocations: [], 
        pagination: { page, limit, total: 0, totalPages: 0, hasMore: false } 
      };
      await cache.set(cacheKey, emptyResponse, 300);
      return NextResponse.json(successResponse(emptyResponse));
    }

    // 7. Build WHERE clause for TaskTeam query with filters
    const taskTeamWhere: any = {
      startDate: { not: null },
      endDate: { not: null },
      Task: {
        ServLineCode: { in: externalServLineCodes }
      }
    };

    // Employee filter (convert WinLogon to user email format)
    if (employees.length > 0) {
      // Convert WinLogon values to email format for userId matching
      const userIds = employees.map(emp => {
        // If it already looks like an email, use as-is
        if (emp.includes('@')) {
          return emp.toLowerCase();
        }
        // Otherwise, convert WinLogon to email format
        return `${emp}@forvismazars.us`.toLowerCase();
      });
      taskTeamWhere.userId = { in: userIds };
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

    // 8. For timeline view, get ALL service line employees first (from Employee table, not ServiceLineUser)
    let allServiceLineEmployees: any[] = [];
    if (includeUnallocated) {
      // Get all employees whose ServLineCode matches the external codes (same as /users endpoint)
      const employeesQuery = await prisma.employee.findMany({
        where: {
          ServLineCode: { in: externalServLineCodes },
          Active: 'Yes',
          EmpDateLeft: null  // Only employees who haven't left
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
        orderBy: {
          EmpNameFull: 'asc'
        }
      });
      
      allServiceLineEmployees = employeesQuery;
      
      // Apply employee filter if specified (by WinLogon/email)
      if (employees.length > 0) {
        allServiceLineEmployees = allServiceLineEmployees.filter(emp => 
          employees.includes(emp.WinLogon?.toLowerCase() || '') ||
          employees.includes(`${emp.WinLogon}@forvismazars.us`.toLowerCase())
        );
      }
      
      // Apply job grade and office filters to all employees BEFORE counting
      if (jobGrades.length > 0 || offices.length > 0) {
        allServiceLineEmployees = allServiceLineEmployees.filter(emp => {
          // Job grade filter
          if (jobGrades.length > 0) {
            const empJobGrade = emp.EmpCatCode;
            if (!empJobGrade || !jobGrades.includes(empJobGrade)) {
              return false;
            }
          }
          
          // Office filter
          if (offices.length > 0) {
            const empOffice = emp.OfficeCode?.trim();
            if (!empOffice || !offices.includes(empOffice)) {
              return false;
            }
          }
          
          return true;
        });
      }
    }

    // 9. Fetch TaskTeam allocations with pagination
    const queryStart = Date.now();
    
    // If includeUnallocated, we need to map employees to user IDs first
    // Otherwise, paginate the allocations themselves
    let taskTeamWhereFinal = taskTeamWhere;
    let employeeUserIdMap = new Map<number, string>(); // Map employee ID to user ID
    
    if (includeUnallocated && allServiceLineEmployees.length > 0) {
      // Map employees to users to get user IDs
      const { mapEmployeesToUsers } = await import('@/lib/services/employees/employeeService');
      const employeeUserMap = await mapEmployeesToUsers(allServiceLineEmployees);
      
      // Build map of employee ID -> user ID
      allServiceLineEmployees.forEach(emp => {
        const user = employeeUserMap.get(emp.WinLogon?.toLowerCase() || '');
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
        orderBy: [
          { User: { name: 'asc' } },
          { startDate: 'asc' }
        ]
        // Don't apply pagination yet - we need to filter first, then paginate
      }),
      prisma.taskTeam.count({ where: taskTeamWhereFinal })
    ]);

    // 10. Get user IDs and fetch Employee data for job grade and office filters
    let userIdsForEmployeeMap = [...new Set(taskTeamAllocations.map(member => member.userId))];
    
    // For timeline view with unallocated, also include all service line employee user IDs
    if (includeUnallocated) {
      userIdsForEmployeeMap = [...new Set([...userIdsForEmployeeMap, ...Array.from(employeeUserIdMap.values())])];
    }
    
    const employeeMap = await mapUsersToEmployees(userIdsForEmployeeMap);

    // 11. Apply job grade and office filters (post-query filtering for list view only)
    // For timeline view, filters were already applied to allServiceLineEmployees
    let filteredAllocations = taskTeamAllocations;
    
    if (!includeUnallocated && (jobGrades.length > 0 || offices.length > 0)) {
      filteredAllocations = taskTeamAllocations.filter(allocation => {
        const employee = employeeMap.get(allocation.userId.toLowerCase()) || 
                        employeeMap.get(allocation.userId.split('@')[0]?.toLowerCase() || '');
        
        // Job grade filter
        if (jobGrades.length > 0) {
          const empJobGrade = employee?.EmpCatCode;
          if (!empJobGrade || !jobGrades.includes(empJobGrade)) {
            return false;
          }
        }
        
        // Office filter
        if (offices.length > 0) {
          const empOffice = employee?.OfficeCode?.trim();
          if (!empOffice || !offices.includes(empOffice)) {
            return false;
          }
        }
        
        return true;
      });
    }

    // 12. Transform to flat structure
    const transformStart = Date.now();
    const allocationRows = filteredAllocations.map(allocation => {
      const employee = employeeMap.get(allocation.userId.toLowerCase()) || 
                      employeeMap.get(allocation.userId.split('@')[0]?.toLowerCase() || '');

      const isClientTask = !!allocation.Task.Client?.clientCode;

      return {
        allocationId: allocation.id,
        userId: allocation.userId,
        employeeId: employee?.id || null,
        userName: allocation.User?.name || employee?.EmpNameFull || allocation.userId,
        userEmail: allocation.User?.email || allocation.userId,
        jobGradeCode: employee?.EmpCatCode || null,
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
        notes: null
      };
    });
    
    // 13. For timeline view with includeUnallocated, add employees with no allocations
    let finalAllocationRows = allocationRows;
    if (includeUnallocated && allServiceLineEmployees.length > 0) {
      // Find employees with no allocations (check both userId and employeeId)
      const userIdsWithAllocations = new Set(allocationRows.map(row => row.userId));
      const employeeIdsWithAllocations = new Set(allocationRows.filter(row => row.employeeId).map(row => row.employeeId!));
      
      const employeesWithoutAllocations = allServiceLineEmployees.filter(emp => {
        const userId = employeeUserIdMap.get(emp.id);
        // Include employee if:
        // 1. They have a userId and it's not in allocations, OR
        // 2. They don't have a userId (no account yet) and employee ID not in allocations
        if (userId) {
          return !userIdsWithAllocations.has(userId);
        } else {
          return !employeeIdsWithAllocations.has(emp.id);
        }
      });
      
      // Filters were already applied to allServiceLineEmployees, so no need to filter again
      let filteredUnallocatedEmployees = employeesWithoutAllocations;
      
      // Add placeholder rows for unallocated employees (needed for timeline to show employees)
      // These will have no allocation data but will display the employee in the timeline
      const unallocatedRows = filteredUnallocatedEmployees.map(emp => {
        const userId = employeeUserIdMap.get(emp.id);
        const userEmail = userId || `${emp.WinLogon}@forvismazars.us`;
        
        return {
          allocationId: 0, // No allocation
          userId: userId || emp.WinLogon || `emp_${emp.id}`,
          employeeId: emp.id,
          userName: emp.EmpNameFull || emp.EmpName || `Employee ${emp.id}`,
          userEmail: userEmail,
          jobGradeCode: emp.EmpCatCode || null,
          officeLocation: emp.OfficeCode?.trim() || null,
          clientId: null,
          clientName: '',
          clientCode: '',
          taskId: 0,
          taskName: '',
          taskCode: null,
          startDate: startOfDay(new Date()),
          endDate: startOfDay(new Date()),
          role: 'VIEWER' as any,
          allocatedHours: null,
          allocatedPercentage: null,
          actualHours: null,
          isNonClientEvent: false,
          nonClientEventType: null,
          notes: null
        };
      });
      
      finalAllocationRows = [...allocationRows, ...unallocatedRows];
    }
    
    // 14. Apply pagination to the final results
    // For timeline view, we now have the complete filtered list, so paginate it
    // For list view, we've already filtered, so paginate the filtered results
    const totalFilteredCount = includeUnallocated 
      ? allServiceLineEmployees.length  // Total filtered employees for timeline
      : filteredAllocations.length;      // Total filtered allocations for list
    
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedResults = finalAllocationRows.slice(startIndex, endIndex);

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

    return NextResponse.json(successResponse(response));
  } catch (error) {
    return handleApiError(error, 'Get employee planner data');
  }
}
