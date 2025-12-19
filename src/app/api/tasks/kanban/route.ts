import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db/prisma';
import { successResponse } from '@/lib/utils/apiUtils';
import { getUserServiceLines } from '@/lib/services/service-lines/serviceLineService';
import { getUserServiceLineRole } from '@/lib/services/service-lines/getUserServiceLineRole';
import { isSystemAdmin } from '@/lib/services/auth/authorization';
import { TaskStage } from '@/types/task-stages';
import { cache, CACHE_PREFIXES } from '@/lib/services/cache/CacheService';
import { logger } from '@/lib/utils/logger';
import { secureRoute } from '@/lib/api/secureRoute';

/**
 * GET /api/tasks/kanban
 * Get tasks organized by kanban stage
 */
export const GET = secureRoute.query({
  handler: async (request, { user }) => {
    const { searchParams } = new URL(request.url);
    const serviceLine = searchParams.get('serviceLine');
    const subServiceLineGroup = searchParams.get('subServiceLineGroup');
    const myTasksOnly = searchParams.get('myTasksOnly') === 'true';
    const includeArchived = searchParams.get('includeArchived') === 'true';
    const search = searchParams.get('search') || '';
    
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

    const userServiceLines = await getUserServiceLines(user.id);
    
    let userServiceLineRole: string | null = null;
    const userIsSystemAdmin = await isSystemAdmin(user.id);
    if (userIsSystemAdmin) {
      userServiceLineRole = 'ADMINISTRATOR';
    } else if (subServiceLineGroup) {
      userServiceLineRole = await getUserServiceLineRole(user.id, subServiceLineGroup);
    }
    
    const cacheKey = `${CACHE_PREFIXES.TASK}kanban:${serviceLine}:${subServiceLineGroup}:${myTasksOnly}:${clientIds.join(',')}:${taskNames.join(',')}:${partnerCodes.join(',')}:${managerCodes.join(',')}:${serviceLineCodes.join(',')}:${includeArchived}:user:${user.id}`;
    
    const cached = await cache.get(cacheKey);
    if (cached) {
      return NextResponse.json(successResponse(cached));
    }

    let servLineCodes: string[] = [];
    
    if (serviceLine) {
      const hasAccess = userServiceLines.some((sl: { serviceLine: string; subGroups?: Array<{ code: string }> }) => 
        sl.serviceLine === serviceLine || 
        sl.subGroups?.some((sg) => sg.code === subServiceLineGroup)
      );
      
      if (!hasAccess) {
        return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
      }

      const whereClause = subServiceLineGroup
        ? { SubServlineGroupCode: subServiceLineGroup, masterCode: serviceLine }
        : { masterCode: serviceLine };
      
      servLineCodes = await prisma.serviceLineExternal
        .findMany({ where: whereClause, select: { ServLineCode: true } })
        .then(results => results.map(r => r.ServLineCode).filter((code): code is string => code !== null));
    } else {
      const subGroupCodes = userServiceLines.flatMap((sl: { subGroups?: Array<{ code: string }> }) => 
        sl.subGroups?.map((sg) => sg.code) || []
      );
      
      if (subGroupCodes.length > 0) {
        servLineCodes = await prisma.serviceLineExternal
          .findMany({ where: { SubServlineGroupCode: { in: subGroupCodes } }, select: { ServLineCode: true } })
          .then(results => results.map(r => r.ServLineCode).filter((code): code is string => code !== null));
      }
    }

    const where: Prisma.TaskWhereInput = {};
    
    if (!includeArchived) {
      where.Active = 'Yes';
    }

    if (servLineCodes.length > 0) {
      where.ServLineCode = { in: servLineCodes };
    }

    if (serviceLineCodes.length > 0) {
      where.ServLineCode = { in: serviceLineCodes };
    }

    if (partnerCodes.length > 0) {
      where.TaskPartner = { in: partnerCodes };
    }

    if (managerCodes.length > 0) {
      where.TaskManager = { in: managerCodes };
    }

    if (clientIds.length > 0) {
      const clientGSClientIDs = await prisma.client.findMany({
        where: { id: { in: clientIds } },
        select: { GSClientID: true },
      }).then(clients => clients.map(c => c.GSClientID));
      
      if (clientGSClientIDs.length > 0) {
        where.GSClientID = { in: clientGSClientIDs };
      }
    }

    if (taskNames.length > 0) {
      where.TaskDesc = { in: taskNames };
    }

    if (myTasksOnly) {
      where.TaskTeam = { some: { userId: user.id } };
    }

    const hasFilters = !!(
      clientIds.length > 0 ||
      taskNames.length > 0 ||
      partnerCodes.length > 0 ||
      managerCodes.length > 0 ||
      serviceLineCodes.length > 0 ||
      myTasksOnly
    );

    const perfStart = Date.now();
    
    let clientGSClientIDs: string[] = [];
    if (clientIds.length > 0) {
      clientGSClientIDs = await prisma.client.findMany({
        where: { id: { in: clientIds } },
        select: { GSClientID: true },
      }).then(clients => clients.map(c => c.GSClientID));
    }
    
    const servLineFilter = servLineCodes.length > 0 
      ? Prisma.sql`t.ServLineCode IN (${Prisma.join(servLineCodes.map(code => Prisma.sql`${code}`))})` 
      : Prisma.sql`1=1`;
    
    const activeFilter = !includeArchived ? Prisma.sql`AND t.Active = 'Yes'` : Prisma.empty;
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
      ? Prisma.sql`AND EXISTS (SELECT 1 FROM TaskTeam tt WHERE tt.taskId = t.id AND tt.userId = ${user.id})`
      : Prisma.empty;

    const tasksWithLatestStage = await prisma.$queryRaw<Array<{ id: number; latestStage: string | null }>>`
      WITH LatestStages AS (
        SELECT taskId, stage as latestStage, ROW_NUMBER() OVER (PARTITION BY taskId ORDER BY createdAt DESC) as rn
        FROM TaskStage
      )
      SELECT t.id, COALESCE(ls.latestStage, 'DRAFT') as latestStage
      FROM Task t
      LEFT JOIN LatestStages ls ON t.id = ls.taskId AND ls.rn = 1
      WHERE ${servLineFilter} ${activeFilter} ${partnerFilter} ${managerFilter} ${clientFilter} ${taskFilter} ${searchFilter} ${myTasksFilter}
    `;

    logger.info('Stage detection query completed', { durationMs: Date.now() - perfStart, taskCount: tasksWithLatestStage.length });

    const taskIdsByStage = new Map<TaskStage, number[]>();
    for (const task of tasksWithLatestStage) {
      const stage = (task.latestStage || 'DRAFT') as TaskStage;
      if (!taskIdsByStage.has(stage)) {
        taskIdsByStage.set(stage, []);
      }
      taskIdsByStage.get(stage)!.push(task.id);
    }
    
    if (includeArchived) {
      const archivedTasks = await prisma.task.findMany({
        where: { ...where, Active: { not: 'Yes' } },
        select: { id: true },
      });
      taskIdsByStage.set(TaskStage.ARCHIVED, archivedTasks.map(t => t.id));
    }

    const stages = [TaskStage.DRAFT, TaskStage.IN_PROGRESS, TaskStage.UNDER_REVIEW, TaskStage.COMPLETED];
    if (includeArchived) stages.push(TaskStage.ARCHIVED);

    const stageResultsPromises = stages.map(async (stage) => {
      const allTaskIds = taskIdsByStage.get(stage) || [];
      const totalCount = allTaskIds.length;
      const taskLimit = hasFilters ? undefined : 50;
      const tasksToFetch = taskLimit ? allTaskIds.slice(0, taskLimit) : allTaskIds;

      const tasks = await prisma.task.findMany({
        where: { id: { in: tasksToFetch } },
        select: {
          id: true, TaskDesc: true, TaskCode: true, ServLineCode: true, ServLineDesc: true,
          TaskPartner: true, TaskPartnerName: true, TaskManager: true, TaskManagerName: true,
          TaskDateOpen: true, TaskDateTerminate: true, Active: true, createdAt: true, updatedAt: true,
          Client: { select: { id: true, GSClientID: true, clientCode: true, clientNameFull: true } },
          TaskTeam: { select: { userId: true, role: true, User: { select: { id: true, name: true, email: true } } } },
          TaskStage: { orderBy: { createdAt: 'desc' }, take: 1, select: { stage: true, createdAt: true } },
        },
        orderBy: { updatedAt: 'desc' },
      });

      const partnerCodes = [...new Set(tasks.map(t => t.TaskPartner).filter(Boolean))];
      const managerCodes = [...new Set(tasks.map(t => t.TaskManager).filter(Boolean))];
      const allEmployeeCodes = [...new Set([...partnerCodes, ...managerCodes])];

      const employees = allEmployeeCodes.length > 0 ? await prisma.employee.findMany({
        where: { EmpCode: { in: allEmployeeCodes }, Active: 'Yes' },
        select: { EmpCode: true, EmpName: true },
      }) : [];

      const employeeNameMap = new Map(employees.map(emp => [emp.EmpCode, emp.EmpName]));

      const transformedTasks = tasks.map(task => {
        const currentStage = task.TaskStage.length > 0 ? task.TaskStage[0]?.stage ?? TaskStage.DRAFT : TaskStage.DRAFT;
        const taskTeamRole = task.TaskTeam.find(member => member.userId === user.id)?.role;
        const userRole = taskTeamRole || userServiceLineRole;

        return {
          id: task.id,
          name: task.TaskDesc,
          code: task.TaskCode,
          serviceLine: task.ServLineCode,
          serviceLineDesc: task.ServLineDesc,
          stage: currentStage,
          partner: employeeNameMap.get(task.TaskPartner) || task.TaskPartnerName || task.TaskPartner,
          manager: employeeNameMap.get(task.TaskManager) || task.TaskManagerName || task.TaskManager,
          dateOpen: task.TaskDateOpen,
          dateTerminate: task.TaskDateTerminate,
          client: task.Client ? { id: task.Client.id, GSClientID: task.Client.GSClientID, code: task.Client.clientCode, name: task.Client.clientNameFull } : null,
          team: task.TaskTeam.map(member => ({ userId: member.userId, role: member.role, name: member.User.name, email: member.User.email })),
          userRole,
          createdAt: task.createdAt,
          updatedAt: task.updatedAt,
        };
      });

      return {
        stage,
        name: stage === TaskStage.ARCHIVED ? 'ARCHIVED' : stage.replace(/_/g, ' '),
        taskCount: transformedTasks.length,
        totalCount,
        tasks: transformedTasks,
        metrics: { count: totalCount, loaded: transformedTasks.length },
      };
    });

    const columns = await Promise.all(stageResultsPromises);
    const totalTasksCount = columns.reduce((sum, col) => sum + col.totalCount, 0);
    const loadedTasksCount = columns.reduce((sum, col) => sum + col.taskCount, 0);

    const response = { columns, totalTasks: totalTasksCount, loadedTasks: loadedTasksCount };

    logger.info('Kanban board data prepared', { durationMs: Date.now() - perfStart, stages: columns.length, totalTasks: totalTasksCount, loadedTasks: loadedTasksCount });

    await cache.set(cacheKey, response, 300);

    return NextResponse.json(successResponse(response));
  },
});
