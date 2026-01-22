export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db/prisma';
import { successResponse } from '@/lib/utils/apiUtils';
import { getUserServiceLines } from '@/lib/services/service-lines/serviceLineService';
import { getUserServiceLineRole } from '@/lib/services/service-lines/getUserServiceLineRole';
import { isSystemAdmin } from '@/lib/services/auth/authorization';
import { TaskStage } from '@/types/task-stages';
import { logger } from '@/lib/utils/logger';
import { secureRoute, Feature } from '@/lib/api/secureRoute';
import { hasServiceLineRole } from '@/lib/utils/roleHierarchy';
import { getWipBalancesByTaskIds } from '@/lib/services/wip/wipCalculationSQL';
import { z } from 'zod';
import { enrichEmployeesWithStatus } from '@/lib/services/employees/employeeStatusService';

// Zod schema for query params validation
const KanbanQuerySchema = z.object({
  serviceLine: z.string().max(50).optional(),
  subServiceLineGroup: z.string().max(50).optional(),
  myTasksOnly: z.enum(['true', 'false']).default('false'),
  includeArchived: z.enum(['true', 'false']).default('false'),
  search: z.string().max(200).default(''),
  clientIds: z.string().max(1000).optional(),
  taskNames: z.string().max(2000).optional(),
  partnerCodes: z.string().max(1000).optional(),
  managerCodes: z.string().max(1000).optional(),
  serviceLineCodes: z.string().max(1000).optional(),
});

/**
 * GET /api/tasks/kanban
 * Get tasks organized by kanban stage
 */
export const GET = secureRoute.query({
  feature: Feature.ACCESS_TASKS,
  handler: async (request, { user }) => {
    const { searchParams } = new URL(request.url);
    
    // Validate query params with Zod
    const queryParams = KanbanQuerySchema.parse({
      serviceLine: searchParams.get('serviceLine') ?? undefined,
      subServiceLineGroup: searchParams.get('subServiceLineGroup') ?? undefined,
      myTasksOnly: searchParams.get('myTasksOnly') ?? undefined,
      includeArchived: searchParams.get('includeArchived') ?? undefined,
      search: searchParams.get('search') ?? undefined,
      clientIds: searchParams.get('clientIds') ?? undefined,
      taskNames: searchParams.get('taskNames') ?? undefined,
      partnerCodes: searchParams.get('partnerCodes') ?? undefined,
      managerCodes: searchParams.get('managerCodes') ?? undefined,
      serviceLineCodes: searchParams.get('serviceLineCodes') ?? undefined,
    });
    
    const serviceLine = queryParams.serviceLine || null;
    const subServiceLineGroup = queryParams.subServiceLineGroup || null;
    const myTasksOnly = queryParams.myTasksOnly === 'true';
    const includeArchived = queryParams.includeArchived === 'true';
    const search = queryParams.search;
    
    const clientIds = queryParams.clientIds ? queryParams.clientIds.split(',').map(Number).filter(Boolean) : [];
    const taskNames = queryParams.taskNames ? queryParams.taskNames.split(',').filter(Boolean) : [];
    const partnerCodes = queryParams.partnerCodes ? queryParams.partnerCodes.split(',').filter(Boolean) : [];
    const managerCodes = queryParams.managerCodes ? queryParams.managerCodes.split(',').filter(Boolean) : [];
    const serviceLineCodes = queryParams.serviceLineCodes ? queryParams.serviceLineCodes.split(',').filter(Boolean) : [];

    const userServiceLines = await getUserServiceLines(user.id);
    
    let userServiceLineRole: string | null = null;
    const userIsSystemAdmin = await isSystemAdmin(user.id);
    if (userIsSystemAdmin) {
      userServiceLineRole = 'ADMINISTRATOR';
    } else if (subServiceLineGroup) {
      userServiceLineRole = await getUserServiceLineRole(user.id, subServiceLineGroup);
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
      // Get user's employee code(s) by matching email to Employee.WinLogon
      const userEmail = user.email.toLowerCase();
      const emailPrefix = userEmail.split('@')[0];
      
      const userEmployees = await prisma.employee.findMany({
        where: {
          OR: [
            { WinLogon: { equals: userEmail } },
            { WinLogon: { startsWith: `${emailPrefix}@` } },
          ],
        },
        select: { EmpCode: true },
      });
      
      const empCodes = userEmployees.map(e => e.EmpCode);
      
      // Include tasks where user is team member, partner, or manager
      where.OR = [
        { TaskTeam: { some: { userId: user.id } } },
        ...(empCodes.length > 0 ? [
          { TaskPartner: { in: empCodes } },
          { TaskManager: { in: empCodes } },
        ] : []),
      ];
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
    
    // ALWAYS filter for Active = 'Yes' in main stage query
    // Inactive tasks are handled separately and placed in ARCHIVED column
    const activeFilter = Prisma.sql`AND t.Active = 'Yes'`;
    
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
    
    // Build myTasksFilter - must check TaskTeam, TaskPartner, and TaskManager
    let myTasksFilter = Prisma.empty;
    if (myTasksOnly) {
      // Get user's employee code(s) by matching email to Employee.WinLogon
      const userEmail = user.email.toLowerCase();
      const emailPrefix = userEmail.split('@')[0];
      
      const userEmployees = await prisma.employee.findMany({
        where: {
          OR: [
            { WinLogon: { equals: userEmail } },
            { WinLogon: { startsWith: `${emailPrefix}@` } },
          ],
        },
        select: { EmpCode: true },
      });
      
      const empCodes = userEmployees.map(e => e.EmpCode);
      
      // Add myTasksOnly filter to WHERE object (for archived Prisma query)
      where.OR = [
        { TaskTeam: { some: { userId: user.id } } },
        ...(empCodes.length > 0 ? [
          { TaskPartner: { in: empCodes } },
          { TaskManager: { in: empCodes } },
        ] : []),
      ];
      
      // Include tasks where user is team member, partner, or manager (for raw SQL query)
      if (empCodes.length > 0) {
        myTasksFilter = Prisma.sql`AND (
          EXISTS (SELECT 1 FROM TaskTeam tt WHERE tt.taskId = t.id AND tt.userId = ${user.id})
          OR t.TaskPartner IN (${Prisma.join(empCodes.map(code => Prisma.sql`${code}`))})
          OR t.TaskManager IN (${Prisma.join(empCodes.map(code => Prisma.sql`${code}`))})
        )`;
      } else {
        myTasksFilter = Prisma.sql`AND EXISTS (SELECT 1 FROM TaskTeam tt WHERE tt.taskId = t.id AND tt.userId = ${user.id})`;
      }
    }

    const tasksWithLatestStage = await prisma.$queryRaw<Array<{ id: number; latestStage: string | null }>>`
      WITH LatestStages AS (
        SELECT taskId, stage as latestStage, ROW_NUMBER() OVER (PARTITION BY taskId ORDER BY createdAt DESC) as rn
        FROM TaskStage
      )
      SELECT t.id, COALESCE(ls.latestStage, 'ENGAGE') as latestStage
      FROM Task t
      LEFT JOIN LatestStages ls ON t.id = ls.taskId AND ls.rn = 1
      WHERE ${servLineFilter} ${activeFilter} ${partnerFilter} ${managerFilter} ${clientFilter} ${taskFilter} ${searchFilter} ${myTasksFilter}
    `;

    logger.info('Stage detection query completed', { durationMs: Date.now() - perfStart, taskCount: tasksWithLatestStage.length });

    const taskIdsByStage = new Map<TaskStage, number[]>();
    for (const task of tasksWithLatestStage) {
      const stage = (task.latestStage || 'ENGAGE') as TaskStage;
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

    const stages = [TaskStage.ENGAGE, TaskStage.IN_PROGRESS, TaskStage.UNDER_REVIEW, TaskStage.COMPLETED];
    if (includeArchived) stages.push(TaskStage.ARCHIVED);

    // OPTIMIZATION: Fetch ALL tasks across all stages first to extract employee codes
    // This prevents duplicate employee lookups inside each stage loop
    const allTaskIds = stages.flatMap(stage => taskIdsByStage.get(stage) || []);
    const taskLimit = hasFilters ? undefined : 50;
    
    // Get limited set of task IDs per stage for fetching
    const tasksToFetchByStage = new Map<TaskStage, number[]>();
    stages.forEach(stage => {
      const stageTaskIds = taskIdsByStage.get(stage) || [];
      const limited = taskLimit ? stageTaskIds.slice(0, taskLimit) : stageTaskIds;
      tasksToFetchByStage.set(stage, limited);
    });
    
    const allTaskIdsToFetch = Array.from(tasksToFetchByStage.values()).flat();
    
    // Fetch all tasks at once to extract employee codes
    const allTasks = await prisma.task.findMany({
      where: { id: { in: allTaskIdsToFetch } },
      select: { TaskPartner: true, TaskManager: true },
    });
    
    // Extract ALL unique employee codes across all stages
    const allPartnerCodes = new Set<string>();
    const allManagerCodes = new Set<string>();
    allTasks.forEach(task => {
      if (task.TaskPartner) allPartnerCodes.add(task.TaskPartner);
      if (task.TaskManager) allManagerCodes.add(task.TaskManager);
    });
    const allEmployeeCodes = [...allPartnerCodes, ...allManagerCodes];
    
    // Single employee lookup for ALL stages (instead of 5 separate queries)
    // Note: No Active filter - we want to show names for historical employees too
    const allEmployees = allEmployeeCodes.length > 0 ? await prisma.employee.findMany({
      where: { EmpCode: { in: allEmployeeCodes } },
      select: { EmpCode: true, EmpName: true, WinLogon: true },
    }) : [];
    const employeeNameMap = new Map(allEmployees.map(emp => [emp.EmpCode, emp.EmpName]));
    const employeeMap = new Map(allEmployees.map(emp => [emp.EmpCode, { name: emp.EmpName, email: emp.WinLogon || emp.EmpCode }]));
    
    // Fetch employee status for all partners and managers (single batch query)
    const employeeStatusMap = await enrichEmployeesWithStatus(allEmployeeCodes);
    
    // Single user employee lookup (instead of 5 separate queries)
    const userEmail = user.email.toLowerCase();
    const emailPrefix = userEmail.split('@')[0];
    const userEmployees = await prisma.employee.findMany({
      where: {
        OR: [
          { WinLogon: { equals: userEmail } },
          { WinLogon: { startsWith: `${emailPrefix}@` } },
        ],
      },
      select: { EmpCode: true },
    });
    const userEmpCodes = userEmployees.map(e => e.EmpCode);

    const stageResultsPromises = stages.map(async (stage) => {
      const allTaskIds = taskIdsByStage.get(stage) || [];
      const totalCount = allTaskIds.length;
      const tasksToFetch = tasksToFetchByStage.get(stage) || [];

      const tasks = await prisma.task.findMany({
        where: { id: { in: tasksToFetch } },
        select: {
          id: true, TaskDesc: true, TaskCode: true, ServLineCode: true, ServLineDesc: true,
          TaskPartner: true, TaskPartnerName: true, TaskManager: true, TaskManagerName: true,
          TaskDateOpen: true, TaskDateTerminate: true, Active: true, createdAt: true, updatedAt: true,
          GSTaskID: myTasksOnly, // Include GSTaskID for WIP lookup when myTasksOnly is true
          Client: { select: { id: true, GSClientID: true, clientCode: true, clientNameFull: true } },
          TaskTeam: { select: { userId: true, role: true, User: { select: { id: true, name: true, email: true } } } },
          TaskStage: { orderBy: { createdAt: 'desc' }, take: 1, select: { stage: true, createdAt: true } },
          TaskAcceptance: { select: { acceptanceApproved: true } },
          TaskEngagementLetter: { select: { uploaded: true, dpaUploaded: true } },
        },
        orderBy: { updatedAt: 'desc' },
      });

      // Fetch WIP balances for all tasks if myTasksOnly mode (SQL-based aggregation)
      let wipByTask = new Map<string, number>();
      if (myTasksOnly && tasks.length > 0) {
        const gsTaskIDs = tasks.map(t => t.GSTaskID).filter(Boolean) as string[];
        
        if (gsTaskIDs.length > 0) {
          // Single SQL query with database-level aggregation (80-90% faster)
          wipByTask = await getWipBalancesByTaskIds(gsTaskIDs);
        }
      }

      // Use shared employee map (no duplicate queries)

      const transformedTasks = tasks.map(task => {
        const currentStage = task.TaskStage.length > 0 ? task.TaskStage[0]?.stage ?? TaskStage.ENGAGE : TaskStage.ENGAGE;
        const taskTeamRole = task.TaskTeam.find(member => member.userId === user.id)?.role;
        
        // Use the higher of the two roles to ensure users get maximum privilege
        const userRole = (() => {
          if (!taskTeamRole) return userServiceLineRole;
          if (!userServiceLineRole) return taskTeamRole;
          
          // Both exist - return the higher role
          return hasServiceLineRole(taskTeamRole, userServiceLineRole) 
            ? taskTeamRole 
            : userServiceLineRole;
        })();

        // Check if user is involved with this task (partner, manager, or team member)
        const isTeamMember = task.TaskTeam.some(member => member.userId === user.id);
        const isPartner = userEmpCodes.includes(task.TaskPartner);
        const isManager = userEmpCodes.includes(task.TaskManager);
        const isUserInvolved = isTeamMember || isPartner || isManager;

        // Get Net WIP from calculated wipByTask map (myTasksOnly mode)
        let wipData = null;
        if (myTasksOnly) {
          const netWip = task.GSTaskID ? (wipByTask.get(task.GSTaskID) ?? 0) : 0;
          wipData = { netWip };
        }

        // Build team array including partner and manager if they're not already in TaskTeam
        const teamMembers: Array<{ userId: string; role: string; name: string | null; email: string; employeeStatus?: { isActive: boolean; hasUserAccount: boolean } }> = [];
        
        // Add existing TaskTeam members with employee status lookup
        for (const member of task.TaskTeam) {
          // Try to find the employee code for this user to get their status
          const userEmailLower = member.User.email.toLowerCase();
          const userEmailPrefix = userEmailLower.split('@')[0];
          const matchedEmployee = allEmployees.find(emp => 
            emp.WinLogon?.toLowerCase() === userEmailLower || 
            emp.WinLogon?.toLowerCase().startsWith(`${userEmailPrefix}@`)
          );
          
          teamMembers.push({
            userId: member.userId,
            role: member.role,
            name: member.User.name,
            email: member.User.email,
            employeeStatus: matchedEmployee?.EmpCode ? employeeStatusMap.get(matchedEmployee.EmpCode) : undefined,
          });
        }
        
        // Check if partner is already in team
        const partnerInTeam = teamMembers.some(m => {
          const memberEmailLower = m.email.toLowerCase();
          const partnerInfo = task.TaskPartner ? employeeMap.get(task.TaskPartner) : null;
          return partnerInfo && (
            memberEmailLower === partnerInfo.email.toLowerCase() ||
            memberEmailLower.startsWith(partnerInfo.email.toLowerCase().split('@')[0] + '@')
          );
        });
        
        // Add partner if not in team
        if (task.TaskPartner && !partnerInTeam) {
          const partnerInfo = employeeMap.get(task.TaskPartner);
          teamMembers.push({
            userId: `partner-${task.TaskPartner}`,
            role: 'PARTNER',
            name: partnerInfo?.name || task.TaskPartnerName || task.TaskPartner,
            email: partnerInfo?.email || task.TaskPartner,
            employeeStatus: employeeStatusMap.get(task.TaskPartner),
          });
        }
        
        // Check if manager is already in team
        const managerInTeam = teamMembers.some(m => {
          const memberEmailLower = m.email.toLowerCase();
          const managerInfo = task.TaskManager ? employeeMap.get(task.TaskManager) : null;
          return managerInfo && (
            memberEmailLower === managerInfo.email.toLowerCase() ||
            memberEmailLower.startsWith(managerInfo.email.toLowerCase().split('@')[0] + '@')
          );
        });
        
        // Add manager if not in team
        if (task.TaskManager && !managerInTeam) {
          const managerInfo = employeeMap.get(task.TaskManager);
          teamMembers.push({
            userId: `manager-${task.TaskManager}`,
            role: 'MANAGER',
            name: managerInfo?.name || task.TaskManagerName || task.TaskManager,
            email: managerInfo?.email || task.TaskManager,
            employeeStatus: employeeStatusMap.get(task.TaskManager),
          });
        }

        return {
          id: task.id,
          name: task.TaskDesc,
          code: task.TaskCode,
          serviceLine: task.ServLineCode,
          serviceLineDesc: task.ServLineDesc,
          stage: currentStage,
          partner: employeeNameMap.get(task.TaskPartner) || task.TaskPartnerName || task.TaskPartner,
          manager: employeeNameMap.get(task.TaskManager) || task.TaskManagerName || task.TaskManager,
          partnerStatus: task.TaskPartner ? employeeStatusMap.get(task.TaskPartner) : undefined,
          managerStatus: task.TaskManager ? employeeStatusMap.get(task.TaskManager) : undefined,
          dateOpen: task.TaskDateOpen,
          dateTerminate: task.TaskDateTerminate,
          client: task.Client ? { id: task.Client.id, GSClientID: task.Client.GSClientID, code: task.Client.clientCode, name: task.Client.clientNameFull } : null,
          team: teamMembers,
          userRole,
          isUserInvolved,
          wip: wipData,
          createdAt: task.createdAt,
          updatedAt: task.updatedAt,
          acceptanceApproved: task.TaskAcceptance?.acceptanceApproved ?? null,
          engagementLetterUploaded: task.TaskEngagementLetter?.uploaded ?? null,
          dpaUploaded: task.TaskEngagementLetter?.dpaUploaded ?? null,
          isClientTask: !!task.Client,
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

    return NextResponse.json(successResponse(response));
  },
});
