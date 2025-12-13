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
 * GET /api/service-lines/[serviceLine]/[subServiceLineGroup]/planner/clients
 * Fetch all tasks for service line (including those without allocations)
 * Returns Task → Employee Allocations with pagination support
 * 
 * Performance optimizations:
 * - Redis caching (5min TTL)
 * - Pagination (50 limit default)
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

    // 4. Get search params for filtering and pagination (array-based filters)
    const searchParams = request.nextUrl.searchParams;
    const clientCodes = searchParams.getAll('clientCodes[]');
    const groupDescs = searchParams.getAll('groupDescs[]');
    const partnerCodes = searchParams.getAll('partnerCodes[]');
    const taskCodes = searchParams.getAll('taskCodes[]');
    const managerCodes = searchParams.getAll('managerCodes[]');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');

    // 5. Build comprehensive cache key with array filters
    const cacheKey = `${CACHE_PREFIXES.TASK}planner:clients:${params.serviceLine}:${subServiceLineGroup}:clients:${clientCodes.join(',') || 'all'}:groups:${groupDescs.join(',') || 'all'}:partners:${partnerCodes.join(',') || 'all'}:tasks:${taskCodes.join(',') || 'all'}:managers:${managerCodes.join(',') || 'all'}:${page}:${limit}:user:${user.id}`;
    
    // TEMPORARY: Clear stale cache during debugging
    const clearCache = searchParams.get('clearCache');
    if (clearCache === 'true') {
      await cache.delete(cacheKey);
    }
    
    // Try cache first
    const cached = await cache.get(cacheKey);
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/b3aab070-f6ba-47bb-8f83-44bc48c48d0b',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'planner/clients/route.ts:65',message:'Cache check',data:{cacheHit:!!cached,cacheKey:cacheKey.substring(0,100)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'G'})}).catch(()=>{});
    // #endregion
    if (cached) {
      console.log(`[PERF] Client planner cache hit in ${Date.now() - perfStart}ms`);
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/b3aab070-f6ba-47bb-8f83-44bc48c48d0b',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'planner/clients/route.ts:70',message:'Returning cached data',data:{cachedTasksCount:cached?.tasks?.length || 0,firstTaskHasAllocations:cached?.tasks?.[0]?.allocations?.length > 0,firstTaskAllocCount:cached?.tasks?.[0]?.allocations?.length || 0},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'G'})}).catch(()=>{});
      // #endregion
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

    // 7. Determine if filters are active
    const hasFilters = !!(clientCodes.length > 0 || groupDescs.length > 0 || partnerCodes.length > 0 || taskCodes.length > 0 || managerCodes.length > 0);

    // 8. Build task where conditions with ARRAY-BASED FILTERS AT DATABASE LEVEL
    const taskWhereConditions: any = {
      ServLineCode: { in: externalServLineCodes },
      GSClientID: { not: null }, // Only client tasks
      Active: 'Yes', // Only active tasks (exclude archived)
    };

    // Add client filters using IN operator for OR logic within each filter type
    const clientFilters: any = {};
    
    if (clientCodes.length > 0) {
      clientFilters.clientCode = { in: clientCodes };
    }
    
    if (groupDescs.length > 0) {
      clientFilters.groupDesc = { in: groupDescs };
    }
    
    if (partnerCodes.length > 0) {
      clientFilters.clientPartner = { in: partnerCodes };
    }

    // Apply client filters if any exist
    if (Object.keys(clientFilters).length > 0) {
      taskWhereConditions.Client = clientFilters;
    }

    // Add task-level filters
    if (taskCodes.length > 0) {
      taskWhereConditions.TaskCode = { in: taskCodes };
    }
    
    if (managerCodes.length > 0) {
      taskWhereConditions.TaskManager = { in: managerCodes };
    }

    // 9. Apply pagination (always paginate, even with filters)
    const offset = (page - 1) * limit;

    // 10. Fetch ALL tasks matching service line and filters (including those without allocations)
    const queryStart = Date.now();
    const [tasks, totalCount] = await Promise.all([
      prisma.task.findMany({
        where: taskWhereConditions,
        select: {
          id: true,
          TaskDesc: true,
          TaskCode: true,
          TaskManager: true,
          TaskManagerName: true,
          TaskPartner: true,
          TaskPartnerName: true,
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
      // Get total count for pagination (all tasks matching filters)
      prisma.task.count({ 
        where: taskWhereConditions
      })
    ]);

    console.log(`[PERF] Task query completed in ${Date.now() - queryStart}ms (${tasks.length} tasks fetched, ${totalCount} total)`);

    // 12. Tasks are already filtered by database, no need for in-memory filtering
    const filteredTasks = tasks;

    // 13. Fetch TaskTeam data for filtered tasks
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
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/b3aab070-f6ba-47bb-8f83-44bc48c48d0b',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'planner/clients/route.ts:198',message:'Before TaskTeam query',data:{taskIdsCount:taskIds.length,firstThreeTaskIds:taskIds.slice(0,3),taskIdsType:typeof taskIds[0]},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'F'})}).catch(()=>{});
    // #endregion
    
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
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/b3aab070-f6ba-47bb-8f83-44bc48c48d0b',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'planner/clients/route.ts:224',message:'After TaskTeam query',data:{taskTeamMembersCount:taskTeamMembers.length,firstThreeMembersTaskIds:taskTeamMembers.slice(0,3).map(m => m.taskId)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'F'})}).catch(()=>{});
    // #endregion

    console.log(`[PERF] TaskTeam fetch completed in ${Date.now() - dataFetchStart}ms (${taskTeamMembers.length} allocations)`);

    // 14. Get user IDs and fetch Employee data using shared service
    const userIds = [...new Set(taskTeamMembers.map(member => member.userId))];
    const employeeFetchStart = Date.now();
    
    const employeeMap = await mapUsersToEmployees(userIds);

    console.log(`[PERF] Employee fetch completed in ${Date.now() - employeeFetchStart}ms (${employeeMap.size} employees)`);

    // 16. Group TaskTeam by taskId for easy lookup
    const taskTeamMap = new Map<number, typeof taskTeamMembers>();
    taskTeamMembers.forEach(member => {
      if (!taskTeamMap.has(member.taskId)) {
        taskTeamMap.set(member.taskId, []);
      }
      taskTeamMap.get(member.taskId)!.push(member);
    });

    // 17. Build flat task rows with employee allocations
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
            const employee = employeeMap.get(member.userId.toLowerCase()) || 
                            employeeMap.get(member.userId.split('@')[0].toLowerCase());

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
          taskManager: task.TaskManager,
          taskManagerName: task.TaskManagerName,
          taskPartner: task.TaskPartner,
          taskPartnerName: task.TaskPartnerName,
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

    // 18. Build pagination metadata
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
