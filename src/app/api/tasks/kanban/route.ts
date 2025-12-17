import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db/prisma';
import { successResponse } from '@/lib/utils/apiUtils';
import { handleApiError } from '@/lib/utils/errorHandler';
import { getCurrentUser } from '@/lib/services/auth/auth';
import { getUserServiceLines } from '@/lib/services/service-lines/serviceLineService';
import { TaskStage } from '@/types/task-stages';
import { cache, CACHE_PREFIXES } from '@/lib/services/cache/CacheService';

export async function GET(request: NextRequest) {
  try {
    // Require authentication
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const serviceLine = searchParams.get('serviceLine');
    const subServiceLineGroup = searchParams.get('subServiceLineGroup');
    const myTasksOnly = searchParams.get('myTasksOnly') === 'true';
    const includeArchived = searchParams.get('includeArchived') === 'true';
    const search = searchParams.get('search') || '';
    
    // Parse array filter parameters
    const clientIdsParam = searchParams.get('clientIds');
    const clientIds = clientIdsParam ? clientIdsParam.split(',').map(Number).filter(Boolean) : [];
    const taskNamesParam = searchParams.get('taskNames');
    const taskNames = taskNamesParam ? taskNamesParam.split(',') : [];
    const partnerCodesParam = searchParams.get('partnerCodes');
    const partnerCodes = partnerCodesParam ? partnerCodesParam.split(',') : [];
    const managerCodesParam = searchParams.get('managerCodes');
    const managerCodes = managerCodesParam ? managerCodesParam.split(',') : [];
    const serviceLineCodesParam = searchParams.get('serviceLineCodes');
    const serviceLineCodes = serviceLineCodesParam ? serviceLineCodesParam.split(',') : [];

    // Check service line access
    const userServiceLines = await getUserServiceLines(user.id);
    
    // Build cache key
    const cacheKey = `${CACHE_PREFIXES.TASK}kanban:${serviceLine}:${subServiceLineGroup}:${myTasksOnly}:${clientIds.join(',')}:${taskNames.join(',')}:${partnerCodes.join(',')}:${managerCodes.join(',')}:${serviceLineCodes.join(',')}:${includeArchived}:user:${user.id}`;
    
    // Try cache first
    const cached = await cache.get(cacheKey);
    if (cached) {
      return NextResponse.json(successResponse(cached));
    }

    // OPTIMIZATION: Pre-fetch all ServiceLineExternal mappings ONCE
    let servLineCodes: string[] = [];
    
    if (serviceLine) {
      // Check if user has access to this service line
      const hasAccess = userServiceLines.some((sl: any) => 
        sl.serviceLine === serviceLine || 
        sl.subGroups?.some((sg: any) => sg.code === subServiceLineGroup)
      );
      
      if (!hasAccess) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }

      // Single query to get all relevant ServLineCodes
      const whereClause = subServiceLineGroup
        ? { SubServlineGroupCode: subServiceLineGroup, masterCode: serviceLine }
        : { masterCode: serviceLine };
      
      servLineCodes = await prisma.serviceLineExternal
        .findMany({
          where: whereClause,
          select: { ServLineCode: true },
        })
        .then(results => results.map(r => r.ServLineCode).filter((code): code is string => code !== null));
    } else {
      // OPTIMIZATION: Get all ServLineCodes in a single query using IN clause
      const subGroupCodes = userServiceLines.flatMap((sl: any) => 
        sl.subGroups?.map((sg: any) => sg.code) || []
      );
      
      if (subGroupCodes.length > 0) {
        servLineCodes = await prisma.serviceLineExternal
          .findMany({
            where: { SubServlineGroupCode: { in: subGroupCodes } },
            select: { ServLineCode: true },
          })
          .then(results => results.map(r => r.ServLineCode).filter((code): code is string => code !== null));
      }
    }

    // Build where clause for filtering
    const where: any = {};
    
    // Only filter by Active status if not including archived
    if (!includeArchived) {
      where.Active = 'Yes';
    }

    if (servLineCodes.length > 0) {
      where.ServLineCode = { in: servLineCodes };
    }

    // Service line codes filter (if specified, overrides servLineCodes)
    if (serviceLineCodes.length > 0) {
      where.ServLineCode = { in: serviceLineCodes };
    }

    // Partner filter
    if (partnerCodes.length > 0) {
      where.TaskPartner = { in: partnerCodes };
    }

    // Manager filter
    if (managerCodes.length > 0) {
      where.TaskManager = { in: managerCodes };
    }

    // Client filter
    if (clientIds.length > 0) {
      const clientGSClientIDs = await prisma.client.findMany({
        where: { id: { in: clientIds } },
        select: { GSClientID: true },
      }).then(clients => clients.map(c => c.GSClientID));
      
      if (clientGSClientIDs.length > 0) {
        where.GSClientID = { in: clientGSClientIDs };
      }
    }

    // Task filter (by task name/description)
    if (taskNames.length > 0) {
      where.TaskDesc = { in: taskNames };
    }

    // My tasks filtering
    if (myTasksOnly) {
      where.TaskTeam = {
        some: {
          userId: user.id,
        },
      };
    }

    // Determine if any filters are active
    const hasFilters = !!(
      clientIds.length > 0 ||
      taskNames.length > 0 ||
      partnerCodes.length > 0 ||
      managerCodes.length > 0 ||
      serviceLineCodes.length > 0 ||
      myTasksOnly
    );

    // PERFORMANCE OPTIMIZATION: Use single SQL query with window function to get latest stage per task
    const perfStart = Date.now();
    
    // Handle client filter (need to get GSClientIDs first)
    let clientGSClientIDs: string[] = [];
    if (clientIds.length > 0) {
      clientGSClientIDs = await prisma.client.findMany({
        where: { id: { in: clientIds } },
        select: { GSClientID: true },
      }).then(clients => clients.map(c => c.GSClientID));
    }
    
    // Build WHERE clause parts for SQL
    const servLineFilter = servLineCodes.length > 0 
      ? Prisma.sql`t.ServLineCode IN (${Prisma.join(servLineCodes.map(code => Prisma.sql`${code}`))})` 
      : Prisma.sql`1=1`;
    
    const activeFilter = !includeArchived 
      ? Prisma.sql`AND t.Active = 'Yes'` 
      : Prisma.empty;
    
    const partnerFilter = partnerCodes.length > 0
      ? Prisma.sql`AND t.TaskPartner IN (${Prisma.join(partnerCodes.map(p => Prisma.sql`${p}`))})`
      : Prisma.empty;
    
    const managerFilter = managerCodes.length > 0
      ? Prisma.sql`AND t.TaskManager IN (${Prisma.join(managerCodes.map(m => Prisma.sql`${m}`))})`
      : Prisma.empty;
    
    const clientFilter = clientGSClientIDs.length > 0
      ? Prisma.sql`AND t.GSClientID IN (${Prisma.join(clientGSClientIDs.map(id => Prisma.sql`${id}`))})`
      : Prisma.empty;
    
    const taskFilter = taskNames.length > 0
      ? Prisma.sql`AND t.TaskDesc IN (${Prisma.join(taskNames.map(name => Prisma.sql`${name}`))})`
      : Prisma.empty;
    
    const searchFilter = search
      ? Prisma.sql`AND (t.TaskDesc LIKE ${`%${search}%`} OR t.TaskCode LIKE ${`%${search}%`})`
      : Prisma.empty;
    
    const myTasksFilter = myTasksOnly
      ? Prisma.sql`AND EXISTS (
          SELECT 1 FROM TaskTeam tt 
          WHERE tt.taskId = t.id 
          AND tt.userId = ${user.id}
        )`
      : Prisma.empty;

    // Single optimized query using SQL window function
    const tasksWithLatestStage = await prisma.$queryRaw<Array<{
      id: number;
      latestStage: string | null;
    }>>`
      WITH LatestStages AS (
        SELECT 
          taskId,
          stage as latestStage,
          ROW_NUMBER() OVER (PARTITION BY taskId ORDER BY createdAt DESC) as rn
        FROM TaskStage
      )
      SELECT 
        t.id,
        COALESCE(ls.latestStage, 'DRAFT') as latestStage
      FROM Task t
      LEFT JOIN LatestStages ls ON t.id = ls.taskId AND ls.rn = 1
      WHERE 
        ${servLineFilter}
        ${activeFilter}
        ${partnerFilter}
        ${managerFilter}
        ${clientFilter}
        ${taskFilter}
        ${searchFilter}
        ${myTasksFilter}
    `;

    console.log(`[PERF] Stage detection query completed in ${Date.now() - perfStart}ms for ${tasksWithLatestStage.length} tasks`);

    // Group task IDs by stage
    const taskIdsByStage = new Map<TaskStage, number[]>();
    for (const task of tasksWithLatestStage) {
      const stage = (task.latestStage || 'DRAFT') as TaskStage;
      if (!taskIdsByStage.has(stage)) {
        taskIdsByStage.set(stage, []);
      }
      taskIdsByStage.get(stage)!.push(task.id);
    }
    
    // Handle archived tasks separately if includeArchived is true
    if (includeArchived) {
      const archivedTasks = await prisma.task.findMany({
        where: { ...where, Active: { not: 'Yes' } },
        select: { id: true },
      });
      taskIdsByStage.set(TaskStage.ARCHIVED, archivedTasks.map(t => t.id));
    }

    // Define stages to query
    const stages = [
      TaskStage.DRAFT,
      TaskStage.IN_PROGRESS,
      TaskStage.UNDER_REVIEW,
      TaskStage.COMPLETED,
    ];
    if (includeArchived) {
      stages.push(TaskStage.ARCHIVED);
    }

    // Fetch task data per stage in parallel
    const stageResultsPromises = stages.map(async (stage) => {
      const allTaskIds = taskIdsByStage.get(stage) || [];
      const totalCount = allTaskIds.length;

      // Conditional limiting: 50 per column when no filters, unlimited with filters
      const taskLimit = hasFilters ? undefined : 50;
      const tasksToFetch = taskLimit ? allTaskIds.slice(0, taskLimit) : allTaskIds;

      const tasks = await prisma.task.findMany({
        where: { id: { in: tasksToFetch } },
        select: {
          id: true,
          TaskDesc: true,
          TaskCode: true,
          ServLineCode: true,
          ServLineDesc: true,
          TaskPartnerName: true,
          TaskManagerName: true,
          TaskDateOpen: true,
          TaskDateTerminate: true,
          Active: true,
          createdAt: true,
          updatedAt: true,
          Client: {
            select: {
              id: true,
              GSClientID: true,
              clientCode: true,
              clientNameFull: true,
            },
          },
          TaskTeam: {
            select: {
              userId: true,
              role: true,
              User: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
            },
          },
          TaskStage: {
            orderBy: { createdAt: 'desc' },
            take: 1,
            select: {
              stage: true,
              createdAt: true,
            },
          },
        },
        orderBy: { updatedAt: 'desc' },
      });

      const transformedTasks = tasks.map(task => {
        const currentStage = task.TaskStage.length > 0 
          ? task.TaskStage[0]?.stage ?? TaskStage.DRAFT
          : TaskStage.DRAFT;
        const userRole = task.TaskTeam.find(member => member.userId === user.id)?.role || null;

        return {
          id: task.id,
          name: task.TaskDesc,
          code: task.TaskCode,
          serviceLine: task.ServLineCode,
          serviceLineDesc: task.ServLineDesc,
          stage: currentStage,
          partner: task.TaskPartnerName,
          manager: task.TaskManagerName,
          dateOpen: task.TaskDateOpen,
          dateTerminate: task.TaskDateTerminate,
          client: task.Client ? {
            id: task.Client.id,
            GSClientID: task.Client.GSClientID,
            code: task.Client.clientCode,
            name: task.Client.clientNameFull,
          } : null,
          team: task.TaskTeam.map(member => ({
            userId: member.userId,
            role: member.role,
            name: member.User.name,
            email: member.User.email,
          })),
          userRole,
          createdAt: task.createdAt,
          updatedAt: task.updatedAt,
        };
      });

      return {
        stage,
        name: stage === TaskStage.ARCHIVED ? 'ARCHIVED' : stage.replace(/_/g, ' '),
        taskCount: transformedTasks.length,
        totalCount: totalCount,
        tasks: transformedTasks,
        metrics: {
          count: totalCount,
          loaded: transformedTasks.length,
        },
      };
    });

    const columns = await Promise.all(stageResultsPromises);
    const totalTasksCount = columns.reduce((sum, col) => sum + col.totalCount, 0);
    const loadedTasksCount = columns.reduce((sum, col) => sum + col.taskCount, 0);

    const response = {
      columns,
      totalTasks: totalTasksCount,
      loadedTasks: loadedTasksCount,
    };

    const totalTime = Date.now() - perfStart;
    console.log(`[PERF] Kanban board data prepared in ${totalTime}ms (${columns.length} stages, ${totalTasksCount} total tasks, ${loadedTasksCount} loaded)`);

    // Cache for 5 minutes for better performance
    await cache.set(cacheKey, response, 300);

    return NextResponse.json(successResponse(response));
  } catch (error) {
    return handleApiError(error, 'Get Kanban Board Data');
  }
}
