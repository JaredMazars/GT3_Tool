import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { handleApiError, AppError, ErrorCodes } from '@/lib/utils/errorHandler';
import { CreateTaskSchema } from '@/lib/validation/schemas';
import { successResponse } from '@/lib/utils/apiUtils';
import { getTasksWithCounts } from '@/lib/services/tasks/taskService';
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
      return NextResponse.json({ success: false, error: 'Forbidden - Insufficient permissions' }, { status: 403 });
    }
    
    const { searchParams } = new URL(request.url);
    const page = Number.parseInt(searchParams.get('page') || '1');
    const limit = Math.min(Number.parseInt(searchParams.get('limit') || '50'), 100);
    const search = searchParams.get('search') || '';
    const includeArchived = searchParams.get('includeArchived') === 'true';
    const serviceLine = searchParams.get('serviceLine') || undefined;
    const subServiceLineGroup = searchParams.get('subServiceLineGroup') || undefined;
    const internalOnly = searchParams.get('internalOnly') === 'true';
    const clientTasksOnly = searchParams.get('clientTasksOnly') === 'true';
    const myTasksOnly = searchParams.get('myTasksOnly') === 'true';
    const sortBy = searchParams.get('sortBy') || 'updatedAt';
    const sortOrder = (searchParams.get('sortOrder') || 'desc') as 'asc' | 'desc';
    const clientCode = searchParams.get('clientCode') || undefined;
    const status = searchParams.get('status') || undefined;
    
    const clientIds = searchParams.get('clientIds')?.split(',').map(Number).filter(Boolean) || [];
    const taskNames = searchParams.get('taskNames')?.split(',') || [];
    const partnerCodes = searchParams.get('partnerCodes')?.split(',') || [];
    const managerCodes = searchParams.get('managerCodes')?.split(',') || [];
    const serviceLineCodes = searchParams.get('serviceLineCodes')?.split(',') || [];

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

    const orderBy: Prisma.TaskOrderByWithRelationInput = {};
    const validSortFields = ['TaskDesc', 'updatedAt', 'createdAt'] as const;
    type ValidSortField = typeof validSortFields[number];
    if (validSortFields.includes(sortBy as ValidSortField)) {
      orderBy[sortBy as ValidSortField] = sortOrder;
    } else {
      orderBy.updatedAt = 'desc';
    }

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
      projectType: task.ServLineDesc,
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
    });
    
    if (!dbUser) {
      return NextResponse.json({ 
        success: false,
        error: 'User not found in database. Please log out and log back in.' 
      }, { status: 400 });
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
