import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { getCurrentUser } from '@/lib/services/auth/auth';
import { getUserServiceLines } from '@/lib/services/service-lines/serviceLineService';
import { successResponse } from '@/lib/utils/apiUtils';
import { handleApiError, AppError } from '@/lib/utils/errorHandler';
import { startOfDay } from 'date-fns';
import { cache, CACHE_PREFIXES } from '@/lib/services/cache/CacheService';

/**
 * GET /api/service-lines/[serviceLine]/[subServiceLineGroup]/planner/clients
 * Fetch tasks with employee allocations as flat array
 * Returns Task → Employee Allocations with pagination support
 * 
 * Performance optimizations:
 * - Redis caching (5min TTL)
 * - Conditional pagination (50 limit without filters, unlimited with filters)
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
      return handleApiError(new AppError(401, 'Unauthorized'), 'Get client planner data');
    }

    // 2. Extract and validate params
    const subServiceLineGroup = params.subServiceLineGroup;
    if (!subServiceLineGroup) {
      return handleApiError(new AppError(400, 'Sub-service line group is required'), 'Get client planner data');
    }

    // 3. Check user has access to this sub-service line group
    const userServiceLines = await getUserServiceLines(user.id);
    const hasAccess = userServiceLines.some(sl => 
      sl.subGroups?.some((sg: any) => sg.code === subServiceLineGroup)
    );
    if (!hasAccess) {
      return handleApiError(
        new AppError(403, 'You do not have access to this sub-service line group'),
        'Get client planner data'
      );
    }

    // 4. Get search params for filtering and pagination
    const searchParams = request.nextUrl.searchParams;
    const clientSearch = searchParams.get('clientSearch') || '';
    const groupFilter = searchParams.get('groupFilter') || '';
    const partnerFilter = searchParams.get('partnerFilter') || '';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');

    // 5. Build comprehensive cache key
    const cacheKey = `${CACHE_PREFIXES.TASK}planner:clients:${params.serviceLine}:${subServiceLineGroup}:${clientSearch}:${groupFilter}:${partnerFilter}:${page}:${limit}:user:${user.id}`;
    
    // Try cache first
    const cached = await cache.get(cacheKey);
    if (cached) {
      console.log(`[PERF] Client planner cache hit in ${Date.now() - perfStart}ms`);
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
        tasks: [], 
        pagination: { page, limit, total: 0, totalPages: 0, hasMore: false } 
      };
      await cache.set(cacheKey, emptyResponse, 300);
      return NextResponse.json(successResponse(emptyResponse));
    }

    // 7. Determine if filters are active (affects pagination behavior)
    const hasFilters = !!(clientSearch || groupFilter || partnerFilter);

    // 8. Build task where conditions with CLIENT FILTERS AT DATABASE LEVEL
    const taskWhereConditions: any = {
      ServLineCode: { in: externalServLineCodes },
      GSClientID: { not: null }, // Only client tasks
      Active: 'Yes', // Only active tasks (exclude archived)
      // Push client filters to database query for better performance
      Client: {}
    };

    // Add client filters to database query (not in-memory filtering)
    // SQL Server handles case-insensitive by default based on collation
    if (clientSearch) {
      taskWhereConditions.Client.OR = [
        { clientNameFull: { contains: clientSearch } },
        { clientCode: { contains: clientSearch } }
      ];
    }
    
    if (groupFilter) {
      taskWhereConditions.Client.groupDesc = { contains: groupFilter };
    }
    
    if (partnerFilter) {
      taskWhereConditions.Client.clientPartner = { contains: partnerFilter };
    }

    // Remove empty Client filter if no filters applied
    if (Object.keys(taskWhereConditions.Client).length === 0) {
      delete taskWhereConditions.Client;
    }

    // 9. Apply pagination (always paginate, even with filters)
    const offset = (page - 1) * limit;

    // 10. Fetch tasks with pagination - Use Promise.all for parallel queries
    const queryStart = Date.now();
    const [tasks, totalCount] = await Promise.all([
      prisma.task.findMany({
        where: taskWhereConditions,
        select: {
          id: true,
          TaskDesc: true,
          TaskCode: true,
          GSClientID: true,
          Client: {
            select: {
              id: true,
              GSClientID: true,
              clientCode: true,
              clientNameFull: true,
              groupDesc: true,
              clientPartner: true
            }
          }
        },
        orderBy: [
          { Client: { clientNameFull: 'asc' } },
          { TaskDesc: 'asc' }
        ],
        take: limit,
        skip: offset
      }),
      // Get total count for pagination
      prisma.task.count({ where: taskWhereConditions })
    ]);

    console.log(`[PERF] Task query completed in ${Date.now() - queryStart}ms (${tasks.length} tasks fetched, ${totalCount} total)`);

    // 11. Tasks are already filtered by database, no need for in-memory filtering
    const filteredTasks = tasks;

    // 12. Fetch TaskTeam data for filtered tasks
    const taskIds = filteredTasks.map(t => t.id);
    
    if (taskIds.length === 0) {
      const emptyResponse = { 
        tasks: [], 
        pagination: { 
          page, 
          limit, 
          total: hasFilters ? 0 : totalCount, 
          totalPages: 0, 
          hasMore: false 
        } 
      };
      await cache.set(cacheKey, emptyResponse, 300);
      return NextResponse.json(successResponse(emptyResponse));
    }

    const dataFetchStart = Date.now();
    const taskTeamMembers = await prisma.taskTeam.findMany({
      where: {
        taskId: { in: taskIds },
        startDate: { not: null },
        endDate: { not: null }
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
        }
      }
    });

    console.log(`[PERF] TaskTeam fetch completed in ${Date.now() - dataFetchStart}ms (${taskTeamMembers.length} allocations)`);

    // 13. Get user IDs and fetch Employee data
    const userIds = [...new Set(taskTeamMembers.map(member => member.userId))];
    
    const employeeFetchStart = Date.now();
    const employees = userIds.length > 0 ? await prisma.employee.findMany({
      where: {
        OR: [
          { WinLogon: { in: userIds } },
          // Also try email prefixes
          ...userIds.map(userId => ({
            WinLogon: { startsWith: `${userId}@` }
          }))
        ]
      },
      select: {
        id: true,
        GSEmployeeID: true,
        EmpCode: true,
        EmpNameFull: true,
        EmpCatCode: true,
        OfficeCode: true,
        WinLogon: true
      }
    }) : [];

    console.log(`[PERF] Employee fetch completed in ${Date.now() - employeeFetchStart}ms (${employees.length} employees)`);

    // 14. Build employee lookup map
    const employeeMap = new Map<string, typeof employees[0]>();
    employees.forEach(emp => {
      if (emp.WinLogon) {
        const lowerLogon = emp.WinLogon.toLowerCase();
        const prefix = lowerLogon.split('@')[0];
        employeeMap.set(lowerLogon, emp);
        if (prefix) {
          employeeMap.set(prefix, emp);
        }
      }
    });

    // 15. Group TaskTeam by taskId for easy lookup
    const taskTeamMap = new Map<number, typeof taskTeamMembers>();
    taskTeamMembers.forEach(member => {
      if (!taskTeamMap.has(member.taskId)) {
        taskTeamMap.set(member.taskId, []);
      }
      taskTeamMap.get(member.taskId)!.push(member);
    });

    // 16. Build flat task rows with employee allocations
    const transformStart = Date.now();
    const taskRows = filteredTasks
      .map(task => {
        if (!task.Client || !task.Client.GSClientID) return null;

        // Get team members for this task
        const teamMembers = taskTeamMap.get(task.id) || [];

        // Build employee allocations for this task
        const allocations = teamMembers
          .filter(member => member.startDate && member.endDate)
          .map(member => {
            const employee = employeeMap.get(member.userId) || 
                            employeeMap.get(member.userId.split('@')[0]);

            return {
              id: member.id,
              taskId: task.id,
              userId: member.userId,
              employeeId: employee?.id || null,
              employeeName: member.User?.name || employee?.EmpNameFull || member.userId,
              employeeCode: employee?.EmpCode || null,
              jobGradeCode: employee?.EmpCatCode || null,
              officeLocation: employee?.OfficeCode?.trim() || null,
              role: member.role,
              startDate: startOfDay(member.startDate!),
              endDate: startOfDay(member.endDate!),
              allocatedHours: member.allocatedHours ? parseFloat(member.allocatedHours.toString()) : null,
              allocatedPercentage: member.allocatedPercentage,
              actualHours: member.actualHours ? parseFloat(member.actualHours.toString()) : null
            };
          });

        // Include all tasks, even those without allocations (users need to see them to plan)
        return {
          taskId: task.id,
          taskCode: task.TaskCode,
          taskName: task.TaskDesc,
          clientId: task.Client.id,
          clientCode: task.Client.clientCode,
          clientName: task.Client.clientNameFull || task.Client.clientCode,
          groupDesc: task.Client.groupDesc,
          clientPartner: task.Client.clientPartner,
          allocations
        };
      })
      .filter((row): row is NonNullable<typeof row> => row !== null)
      .sort((a, b) => {
        // Sort by client name, then task name
        const clientCompare = a.clientName.localeCompare(b.clientName);
        if (clientCompare !== 0) return clientCompare;
        return a.taskName.localeCompare(b.taskName);
      });

    console.log(`[PERF] Data transformation completed in ${Date.now() - transformStart}ms`);

    // 17. Build pagination metadata
    const finalTotal = totalCount;
    const response = {
      tasks: taskRows,
      pagination: {
        page,
        limit,
        total: finalTotal,
        totalPages: Math.ceil(finalTotal / limit),
        hasMore: finalTotal > (page * limit)
      }
    };

    // Cache for 5 minutes
    await cache.set(cacheKey, response, 300);

    const totalTime = Date.now() - perfStart;
    console.log(`[PERF] Client planner data prepared in ${totalTime}ms (${taskRows.length} tasks, page ${page}/${response.pagination.totalPages})`);

    return NextResponse.json(successResponse(response));
  } catch (error) {
    return handleApiError(error, 'Get client planner data');
  }
}


