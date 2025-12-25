import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { AppError, ErrorCodes } from '@/lib/utils/errorHandler';
import { CreateTaskSchema } from '@/lib/validation/schemas';
import { successResponse } from '@/lib/utils/apiUtils';
import { getServLineCodesBySubGroup, getExternalServiceLinesByMaster } from '@/lib/utils/serviceLineExternal';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { getCachedList, setCachedList, invalidateTaskListCache } from '@/lib/services/cache/listCache';
import { performanceMonitor } from '@/lib/utils/performanceMonitor';
import { checkFeature } from '@/lib/permissions/checkFeature';
import { Feature } from '@/lib/permissions/features';
import { getUserSubServiceLineGroups } from '@/lib/services/service-lines/serviceLineService';
import { logger } from '@/lib/utils/logger';
import { secureRoute } from '@/lib/api/secureRoute';
import { TaskStage } from '@/types/task-stages';

// Zod schema for GET query params validation
const TaskListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  search: z.string().max(200).default(''),
  includeArchived: z.enum(['true', 'false']).default('false'),
  serviceLine: z.string().max(50).optional(),
  subServiceLineGroup: z.string().max(50).optional(),
  internalOnly: z.enum(['true', 'false']).default('false'),
  clientTasksOnly: z.enum(['true', 'false']).default('false'),
  myTasksOnly: z.enum(['true', 'false']).default('false'),
  sortBy: z.enum(['TaskDesc', 'updatedAt', 'createdAt']).default('updatedAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  clientCode: z.string().max(50).optional(),
  status: z.enum(['Active', 'Inactive']).optional(),
  clientIds: z.string().max(1000).optional(),
  taskNames: z.string().max(2000).optional(),
  partnerCodes: z.string().max(1000).optional(),
  managerCodes: z.string().max(1000).optional(),
  serviceLineCodes: z.string().max(1000).optional(),
});

/**
 * GET /api/tasks
 * Get tasks list with pagination and filtering
 */
export const GET = secureRoute.query({
  handler: async (request, { user }) => {
    const startTime = Date.now();
    let cacheHit = false;

    // Check permission
    const hasPagePermission = await checkFeature(user.id, Feature.ACCESS_TASKS);
    const userSubGroups = await getUserSubServiceLineGroups(user.id);
    const hasServiceLineAccess = userSubGroups.length > 0;
    
    if (!hasPagePermission && !hasServiceLineAccess) {
      throw new AppError(403, 'Forbidden - Insufficient permissions', ErrorCodes.FORBIDDEN);
    }
    
    const { searchParams } = new URL(request.url);
    
    // Validate query params with Zod
    const queryParams = TaskListQuerySchema.parse({
      page: searchParams.get('page') ?? undefined,
      limit: searchParams.get('limit') ?? undefined,
      search: searchParams.get('search') ?? undefined,
      includeArchived: searchParams.get('includeArchived') ?? undefined,
      serviceLine: searchParams.get('serviceLine') ?? undefined,
      subServiceLineGroup: searchParams.get('subServiceLineGroup') ?? undefined,
      internalOnly: searchParams.get('internalOnly') ?? undefined,
      clientTasksOnly: searchParams.get('clientTasksOnly') ?? undefined,
      myTasksOnly: searchParams.get('myTasksOnly') ?? undefined,
      sortBy: searchParams.get('sortBy') ?? undefined,
      sortOrder: searchParams.get('sortOrder') ?? undefined,
      clientCode: searchParams.get('clientCode') ?? undefined,
      status: searchParams.get('status') ?? undefined,
      clientIds: searchParams.get('clientIds') ?? undefined,
      taskNames: searchParams.get('taskNames') ?? undefined,
      partnerCodes: searchParams.get('partnerCodes') ?? undefined,
      managerCodes: searchParams.get('managerCodes') ?? undefined,
      serviceLineCodes: searchParams.get('serviceLineCodes') ?? undefined,
    });
    
    const { page, limit, search, sortBy, sortOrder, clientCode, status } = queryParams;
    const includeArchived = queryParams.includeArchived === 'true';
    const serviceLine = queryParams.serviceLine;
    const subServiceLineGroup = queryParams.subServiceLineGroup;
    const internalOnly = queryParams.internalOnly === 'true';
    const clientTasksOnly = queryParams.clientTasksOnly === 'true';
    const myTasksOnly = queryParams.myTasksOnly === 'true';
    
    const clientIds = queryParams.clientIds?.split(',').map(Number).filter(Boolean) || [];
    const taskNames = queryParams.taskNames?.split(',').filter(Boolean) || [];
    const partnerCodes = queryParams.partnerCodes?.split(',').filter(Boolean) || [];
    const managerCodes = queryParams.managerCodes?.split(',').filter(Boolean) || [];
    const serviceLineCodes = queryParams.serviceLineCodes?.split(',').filter(Boolean) || [];

    const skip = (page - 1) * limit;

    const cacheParams = {
      endpoint: 'tasks' as const,
      page,
      limit,
      serviceLine,
      subServiceLineGroup,
      search,
      sortBy,
      sortOrder,
      includeArchived,
      internalOnly,
      clientTasksOnly,
      myTasksOnly,
      clientCode,
      status,
      clientIds: clientIds.length > 0 ? clientIds.join(',') : undefined,
      taskNames: taskNames.length > 0 ? taskNames.join(',') : undefined,
      partnerCodes: partnerCodes.length > 0 ? partnerCodes.join(',') : undefined,
      managerCodes: managerCodes.length > 0 ? managerCodes.join(',') : undefined,
      serviceLineCodes: serviceLineCodes.length > 0 ? serviceLineCodes.join(',') : undefined,
    };
    
    if (!myTasksOnly) {
      const cached = await getCachedList(cacheParams);
      if (cached) {
        cacheHit = true;
        performanceMonitor.trackApiCall('/api/tasks', startTime, true);
        return NextResponse.json(successResponse(cached));
      }
    }

    const where: Prisma.TaskWhereInput = {};

    if (myTasksOnly) {
      where.TaskTeam = { some: { userId: user.id } };
    }

    if (!includeArchived) {
      where.Active = 'Yes';
    }

    if (internalOnly) {
      where.GSClientID = null;
    }

    if (clientTasksOnly) {
      where.GSClientID = { not: null };
    }

    if (subServiceLineGroup) {
      const servLineCodes = await getServLineCodesBySubGroup(subServiceLineGroup, serviceLine || undefined);
      
      if (servLineCodes.length > 0) {
        where.ServLineCode = { in: servLineCodes };
      } else {
        return NextResponse.json(
          successResponse({
            tasks: [],
            pagination: { page, limit, total: 0, totalPages: 0 },
          })
        );
      }
    } else if (serviceLine) {
      const externalServiceLines = await getExternalServiceLinesByMaster(serviceLine);
      const servLineCodes = externalServiceLines
        .map(sl => sl.ServLineCode)
        .filter((code): code is string => code !== null);
      
      if (servLineCodes.length > 0) {
        where.ServLineCode = { in: servLineCodes };
      }
    }
    
    const clientFilter: Record<string, unknown> = {};
    if (clientCode) {
      clientFilter.clientCode = clientCode;
    }
    if (clientIds.length > 0) {
      clientFilter.id = { in: clientIds };
    }
    if (Object.keys(clientFilter).length > 0) {
      where.Client = clientFilter;
    }

    if (status) {
      if (status === 'Active') {
        where.Active = 'Yes';
      } else if (status === 'Inactive') {
        where.Active = 'No';
      }
    }

    if (search) {
      where.OR = [
        { TaskDesc: { contains: search } },
        { TaskCode: { contains: search } },
        { Client: { clientNameFull: { contains: search } } },
        { Client: { clientCode: { contains: search } } },
      ];
    }

    if (taskNames.length > 0) {
      where.TaskDesc = { in: taskNames };
    }

    if (partnerCodes.length > 0) {
      where.TaskPartner = { in: partnerCodes };
    }

    if (managerCodes.length > 0) {
      where.TaskManager = { in: managerCodes };
    }

    if (serviceLineCodes.length > 0) {
      where.ServLineCode = { in: serviceLineCodes };
    }

    // sortBy already validated by Zod schema - apply with deterministic secondary sort
    const orderBy: Prisma.TaskOrderByWithRelationInput[] = [
      { [sortBy]: sortOrder },
      { id: 'asc' }, // Deterministic secondary sort for pagination stability
    ];

    const [total, tasks] = await Promise.all([
      prisma.task.count({ where }),
      prisma.task.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        select: {
          id: true,
          GSClientID: true,
          TaskDesc: true,
          TaskCode: true,
          ServLineCode: true,
          ServLineDesc: true,
          Active: true,
          TaskPartner: true,
          TaskPartnerName: true,
          TaskManager: true,
          TaskManagerName: true,
          createdAt: true,
          updatedAt: true,
          Client: {
            select: {
              id: true,
              GSClientID: true,
              clientNameFull: true,
              clientCode: true,
            },
          },
          ...(myTasksOnly && {
            TaskTeam: {
              where: { userId: user.id },
              select: { role: true },
            },
          }),
        },
      }),
    ]);
    
    const uniquePartnerCodes = [...new Set(tasks.map(t => t.TaskPartner).filter(Boolean))];
    const uniqueManagerCodes = [...new Set(tasks.map(t => t.TaskManager).filter(Boolean))];
    const allEmployeeCodes = [...new Set([...uniquePartnerCodes, ...uniqueManagerCodes])];
    
    const employees = allEmployeeCodes.length > 0 ? await prisma.employee.findMany({
      where: { EmpCode: { in: allEmployeeCodes }, Active: 'Yes' },
      select: { EmpCode: true, EmpName: true },
    }) : [];
    
    const employeeNameMap = new Map(employees.map(emp => [emp.EmpCode, emp.EmpName]));
    
    const tasksWithCounts = tasks.map(task => ({
      id: task.id,
      name: task.TaskDesc,
      taskCode: task.TaskCode,
      description: null,
      serviceLine: task.ServLineCode,
      status: task.Active === 'Yes' ? 'ACTIVE' : 'INACTIVE',
      archived: task.Active !== 'Yes',
      clientId: task.Client?.id || null,
      GSClientID: task.GSClientID,
      taxYear: null,
      taskPartner: task.TaskPartner,
      taskPartnerName: employeeNameMap.get(task.TaskPartner) || task.TaskPartnerName,
      taskManager: task.TaskManager,
      taskManagerName: employeeNameMap.get(task.TaskManager) || task.TaskManagerName,
      createdAt: task.createdAt.toISOString(),
      updatedAt: task.updatedAt.toISOString(),
      client: task.Client ? {
        id: task.Client.id,
        GSClientID: task.Client.GSClientID,
        clientNameFull: task.Client.clientNameFull,
        clientCode: task.Client.clientCode,
      } : null,
      userRole: myTasksOnly && 'TaskTeam' in task ? (task.TaskTeam as Array<{role: string}>)[0]?.role || null : null,
      canAccess: true,
    }));
    
    const responseData = {
      tasks: tasksWithCounts,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };

    if (!myTasksOnly) {
      await setCachedList(cacheParams, responseData);
    }

    performanceMonitor.trackApiCall('/api/tasks', startTime, cacheHit);

    return NextResponse.json(successResponse(responseData));
  },
});

/**
 * POST /api/tasks
 * Create a new task
 */
export const POST = secureRoute.mutation({
  feature: Feature.MANAGE_TASKS,
  schema: CreateTaskSchema,
  handler: async (request, { user, data }) => {
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { id: true, email: true },
    });
    
    if (!dbUser) {
      throw new AppError(400, 'User not found in database. Please log out and log back in.', ErrorCodes.NOT_FOUND);
    }

    let GSClientID: string | null = null;
    if (data.GSClientID) {
      GSClientID = data.GSClientID;
    }

    const externalServiceLine = await prisma.serviceLineExternal.findFirst({
      where: {
        ServLineCode: data.ServLineCode,
        ServLineDesc: { not: null },
        SubServlineGroupCode: { not: null },
      },
      select: { ServLineDesc: true, SubServlineGroupCode: true },
    });

    if (!externalServiceLine) {
      throw new AppError(
        400, 
        `Invalid service line code: ${data.ServLineCode}. Service line not found or has incomplete data.`,
        ErrorCodes.VALIDATION_ERROR
      );
    }

    const ServLineDesc = externalServiceLine.ServLineDesc!;
    const SLGroup = externalServiceLine.SubServlineGroupCode!;

    let TaskCode = data.TaskCode || '';
    if (!TaskCode) {
      const prefix = data.ServLineCode.substring(0, 3).toUpperCase();
      const suffix = Date.now().toString().slice(-5);
      TaskCode = `${prefix}${suffix}`;
    }

    const result = await prisma.$transaction(async (tx) => {
      const task = await tx.task.create({
        data: {
          GSTaskID: crypto.randomUUID(),
          TaskCode,
          TaskDesc: data.TaskDesc,
          taskYear: data.taskYear,
          GSClientID,
          TaskPartner: data.TaskPartner,
          TaskPartnerName: data.TaskPartnerName,
          TaskManager: data.TaskManager,
          TaskManagerName: data.TaskManagerName,
          OfficeCode: data.OfficeCode,
          SLGroup,
          ServLineCode: data.ServLineCode,
          ServLineDesc,
          Active: 'Yes',
          TaskDateOpen: data.TaskDateOpen,
          TaskDateTerminate: data.TaskDateTerminate || null,
          createdBy: user.id,
        },
        select: {
          id: true,
          GSTaskID: true,
          TaskCode: true,
          TaskDesc: true,
          ServLineCode: true,
          ServLineDesc: true,
          createdAt: true,
          updatedAt: true,
          Client: {
            select: { id: true, GSClientID: true, clientNameFull: true, clientCode: true },
          },
        },
      });

      // Create initial ENGAGE stage for the new task
      await tx.taskStage.create({
        data: {
          taskId: task.id,
          stage: TaskStage.ENGAGE,
          movedBy: user.id,
          notes: 'Task created',
        },
      });

      let teamMembersCreated = 0;
      const failedMembers: Array<{ empCode: string; reason: string }> = [];
      
      if (data.teamMembers && data.teamMembers.length > 0) {
        for (const member of data.teamMembers) {
          const employee = await tx.employee.findFirst({
            where: { EmpCode: member.empCode, Active: 'Yes' },
            select: { id: true, EmpCode: true, WinLogon: true },
          });

          if (!employee) {
            failedMembers.push({ empCode: member.empCode, reason: 'Employee not found or inactive' });
            continue;
          }

          if (!employee.WinLogon) {
            failedMembers.push({ empCode: member.empCode, reason: 'No WinLogon value' });
            continue;
          }

          const teamUser = await tx.user.findFirst({
            where: {
              OR: [
                { email: { endsWith: employee.WinLogon } },
                { email: { equals: employee.WinLogon } },
                { email: { equals: `${employee.WinLogon}@mazarsinafrica.onmicrosoft.com` } },
              ],
            },
            select: { id: true, email: true },
          });

          if (!teamUser) {
            failedMembers.push({ empCode: member.empCode, reason: `User not found for WinLogon: ${employee.WinLogon}` });
            continue;
          }

          await tx.taskTeam.create({
            data: { taskId: task.id, userId: teamUser.id, role: member.role },
          });
          
          teamMembersCreated++;
        }
      } else {
        await tx.taskTeam.create({
          data: { taskId: task.id, userId: user.id, role: 'ADMIN' },
        });
        teamMembersCreated = 1;
      }

      if (data.EstChgHours || data.EstFeeTime || data.EstFeeDisb || data.BudStartDate || data.BudDueDate) {
        await tx.taskBudget.create({
          data: {
            TaskBudgetID: crypto.randomUUID(),
            GSTaskID: task.GSTaskID,
            GSClientID: GSClientID,
            ClientCode: task.Client?.clientCode || null,
            TaskCode: task.TaskCode,
            EstChgHours: data.EstChgHours || null,
            EstFeeTime: data.EstFeeTime || null,
            EstFeeDisb: data.EstFeeDisb || null,
            BudStartDate: data.BudStartDate || null,
            BudDueDate: data.BudDueDate || null,
            LastUser: user.email || user.id,
            LastUpdated: new Date(),
          },
        });
      }

      return {
        task,
        teamMemberSummary: {
          requested: data.teamMembers?.length || 0,
          created: teamMembersCreated,
          failed: failedMembers,
        },
      };
    });

    await invalidateTaskListCache();

    logger.info('Task created successfully', { taskCode: result.task.TaskCode, teamMembersCreated: result.teamMemberSummary.created });

    return NextResponse.json(
      successResponse({
        id: result.task.id,
        name: result.task.TaskDesc,
        taskCode: result.task.TaskCode,
        serviceLine: result.task.ServLineCode,
        createdAt: result.task.createdAt.toISOString(),
        updatedAt: result.task.updatedAt.toISOString(),
        client: result.task.Client,
        teamMemberSummary: result.teamMemberSummary,
      })
    );
  },
});
