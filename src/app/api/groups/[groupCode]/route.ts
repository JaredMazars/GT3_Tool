import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { successResponse } from '@/lib/utils/apiUtils';
import { AppError, ErrorCodes } from '@/lib/utils/errorHandler';
import { getCachedList, setCachedList } from '@/lib/services/cache/listCache';
import { enrichRecordsWithEmployeeNames } from '@/lib/services/employees/employeeQueries';
import { calculateWIPByTask } from '@/lib/services/clients/clientBalanceCalculation';
import { secureRoute, Feature } from '@/lib/api/secureRoute';
import { z } from 'zod';

const queryParamsSchema = z.object({
  search: z.string().optional().default(''),
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(50),
  type: z.enum(['clients', 'tasks']).optional().default('clients'),
  serviceLine: z.string().optional(),
});

/**
 * GET /api/groups/[groupCode]
 * Get group details with clients or tasks
 */
export const GET = secureRoute.queryWithParams<{ groupCode: string }>({
  feature: Feature.ACCESS_CLIENTS,
  handler: async (request, { user, params }) => {
    const { groupCode } = params;

    const { searchParams } = new URL(request.url);
    const queryResult = queryParamsSchema.safeParse({
      search: searchParams.get('search') || undefined,
      page: searchParams.get('page') || undefined,
      limit: searchParams.get('limit') || undefined,
      type: searchParams.get('type') || undefined,
      serviceLine: searchParams.get('serviceLine') || undefined,
    });

    if (!queryResult.success) {
      throw new AppError(400, 'Invalid query parameters', ErrorCodes.VALIDATION_ERROR);
    }

    const { search, page, limit, type: dataType, serviceLine } = queryResult.data;
    const skip = (page - 1) * limit;

    const cacheParams = {
      endpoint: 'groups' as const,
      page, limit, search, groupCode,
      type: dataType as 'clients' | 'tasks',
      serviceLine,
    };
    
    const cached = await getCachedList(cacheParams);
    if (cached) {
      return NextResponse.json(successResponse(cached));
    }

    const groupInfo = await prisma.client.findFirst({
      where: { groupCode },
      select: { groupCode: true, groupDesc: true },
    });

    if (!groupInfo) {
      throw new AppError(404, 'Group not found', ErrorCodes.NOT_FOUND);
    }

    if (dataType === 'tasks') {
      const taskWhere: Record<string, unknown> = { Client: { groupCode } };
      
      if (search) {
        taskWhere.OR = [{ TaskDesc: { contains: search } }, { TaskCode: { contains: search } }];
      }

      const [total, tasksRaw] = await Promise.all([
        prisma.task.count({ where: taskWhere }),
        prisma.task.findMany({
          where: taskWhere,
          skip, take: limit,
          orderBy: [{ updatedAt: 'desc' }, { id: 'asc' }],
          select: {
            id: true, GSTaskID: true, TaskDesc: true, TaskCode: true, Active: true,
            ServLineCode: true, ServLineDesc: true, SLGroup: true, createdAt: true, updatedAt: true,
            Client: { select: { GSClientID: true, clientCode: true, clientNameFull: true } },
          },
        }),
      ]);

      const serviceLineCodes = [...new Set(tasksRaw.map(t => t.ServLineCode))];
      const serviceLineExternalData = await prisma.serviceLineExternal.findMany({
        where: { ServLineCode: { in: serviceLineCodes } },
        select: { ServLineCode: true, masterCode: true, SubServlineGroupCode: true },
      });

      const serviceLineMap = new Map(serviceLineExternalData.map(sl => [sl.ServLineCode, sl.masterCode]));
      const servLineToSubGroupMap = new Map(serviceLineExternalData.map(sl => [sl.ServLineCode, sl.SubServlineGroupCode]));

      const taskGSTaskIDs = tasksRaw.map(t => t.GSTaskID);
      const wipTransactions = taskGSTaskIDs.length > 0 ? await prisma.wIPTransactions.findMany({
        where: { GSTaskID: { in: taskGSTaskIDs } },
        select: { GSTaskID: true, Amount: true, TType: true, TranType: true },
      }) : [];

      const wipByGSTaskID = calculateWIPByTask(wipTransactions);

      const tasks = tasksRaw.map(task => ({
        id: task.id, TaskDesc: task.TaskDesc, TaskCode: task.TaskCode, Active: task.Active,
        ServLineCode: task.ServLineCode, ServLineDesc: task.ServLineDesc, SLGroup: task.SLGroup,
        createdAt: task.createdAt, updatedAt: task.updatedAt, Client: task.Client,
        masterServiceLine: serviceLineMap.get(task.ServLineCode) || null,
        subServiceLineGroupCode: servLineToSubGroupMap.get(task.ServLineCode) || null,
        wip: wipByGSTaskID.get(task.GSTaskID) || { balWIP: 0, balTime: 0, balDisb: 0 },
      }));

      const uniqueMasterCodes = [...new Set(tasks.map(t => t.masterServiceLine).filter(Boolean))];
      const serviceLineMasterData = await prisma.serviceLineMaster.findMany({
        where: { code: { in: uniqueMasterCodes as string[] } },
        select: { code: true, name: true, description: true },
      });

      const responseData = {
        groupCode: groupInfo.groupCode, groupDesc: groupInfo.groupDesc,
        tasks, serviceLineMaster: serviceLineMasterData,
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      };

      await setCachedList(cacheParams, responseData);
      return NextResponse.json(successResponse(responseData));
    }

    const where: Record<string, unknown> = { groupCode };
    if (search) {
      where.OR = [
        { clientNameFull: { contains: search } }, { clientCode: { contains: search } },
        { industry: { contains: search } }, { sector: { contains: search } },
      ];
    }

    const [total, clients] = await Promise.all([
      prisma.client.count({ where }),
      prisma.client.findMany({
        where, skip, take: limit, orderBy: [{ clientNameFull: 'asc' }, { id: 'asc' }],
        select: {
          id: true, GSClientID: true, clientCode: true, clientNameFull: true,
          clientPartner: true, clientManager: true, clientIncharge: true, industry: true, active: true,
        },
      }),
    ]);

    const clientGSIDs = clients.map(c => c.GSClientID);
    const taskCounts = await prisma.task.groupBy({
      by: ['GSClientID'],
      where: { GSClientID: { in: clientGSIDs }, Active: 'Yes' },
      _count: { id: true },
    });

    const taskCountMap = new Map<string, number>();
    for (const count of taskCounts) {
      if (count.GSClientID) taskCountMap.set(count.GSClientID, count._count.id);
    }

    const clientsWithCounts = clients.map(client => ({
      ...client, _count: { Task: taskCountMap.get(client.GSClientID) || 0 },
    }));

    const enrichedClients = await enrichRecordsWithEmployeeNames(clientsWithCounts, [
      { codeField: 'clientPartner', nameField: 'clientPartnerName' },
      { codeField: 'clientManager', nameField: 'clientManagerName' },
      { codeField: 'clientIncharge', nameField: 'clientInchargeName' },
    ]);

    const wipTransactionsForClients = clientGSIDs.length > 0 ? await prisma.wIPTransactions.findMany({
      where: { GSClientID: { in: clientGSIDs } },
      select: { GSClientID: true, Amount: true, TType: true },
    }) : [];

    const wipByClient = new Map<string, { balWIP: number; balTime: number; balDisb: number }>();
    wipTransactionsForClients.forEach(transaction => {
      if (!transaction.GSClientID) return;
      if (!wipByClient.has(transaction.GSClientID)) wipByClient.set(transaction.GSClientID, { balWIP: 0, balTime: 0, balDisb: 0 });
      const clientWip = wipByClient.get(transaction.GSClientID)!;
      const amount = transaction.Amount || 0;
      const tType = transaction.TType.toUpperCase();
      
      if (tType === 'P' || tType === 'PRO') {
        clientWip.balWIP += amount;
      } else if (tType === 'F' || tType === 'FEE') {
        clientWip.balWIP -= amount;
        if (tType.includes('T') || tType === 'F') clientWip.balTime -= amount;
        else clientWip.balDisb -= amount;
      } else if (tType.startsWith('T') || tType === 'TI' || tType === 'TIM' || tType === 'AT' || tType === 'ADT') {
        clientWip.balWIP += amount; clientWip.balTime += amount;
      } else if (tType.startsWith('D') || tType === 'DI' || tType === 'DIS' || tType === 'AD' || tType === 'ADD') {
        clientWip.balWIP += amount; clientWip.balDisb += amount;
      } else {
        clientWip.balWIP += amount; clientWip.balTime += amount;
      }
    });

    const clientsWithWip = enrichedClients.map(client => ({
      ...client, wip: wipByClient.get(client.GSClientID) || { balWIP: 0, balTime: 0, balDisb: 0 },
    }));

    const responseData = {
      groupCode: groupInfo.groupCode, groupDesc: groupInfo.groupDesc,
      clients: clientsWithWip,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };

    await setCachedList(cacheParams, responseData);
    return NextResponse.json(successResponse(responseData));
  },
});
