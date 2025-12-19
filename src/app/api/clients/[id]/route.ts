import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { handleApiError, AppError, ErrorCodes } from '@/lib/utils/errorHandler';
import { UpdateClientSchema, GSClientIDSchema } from '@/lib/validation/schemas';
import { successResponse } from '@/lib/utils/apiUtils';
import { z } from 'zod';
import { getTaskCountsByServiceLine } from '@/lib/services/tasks/taskAggregation';
import { getCachedClient, setCachedClient, invalidateClientCache } from '@/lib/services/clients/clientCache';
import { invalidateClientListCache } from '@/lib/services/cache/listCache';
import { enrichRecordsWithEmployeeNames } from '@/lib/services/employees/employeeQueries';
import { calculateWIPByTask, calculateWIPBalances } from '@/lib/services/clients/clientBalanceCalculation';
import { secureRoute } from '@/lib/api/secureRoute';

/**
 * GET /api/clients/[id]
 * Get client details with tasks and balances
 */
export const GET = secureRoute.queryWithParams<{ id: string }>({
  handler: async (request, { user, params }) => {
    const GSClientID = params.id;

    const validationResult = GSClientIDSchema.safeParse(GSClientID);
    if (!validationResult.success) {
      return NextResponse.json({ success: false, error: 'Invalid client ID format. Expected GUID.' }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const taskPage = Number.parseInt(searchParams.get('taskPage') || '1');
    const taskLimit = Math.min(Number.parseInt(searchParams.get('taskLimit') || '20'), 50);
    const serviceLine = searchParams.get('serviceLine') || undefined;
    const includeArchived = searchParams.get('includeArchived') === 'true';
    
    const cached = await getCachedClient(GSClientID, serviceLine, includeArchived);
    if (cached) {
      return NextResponse.json(successResponse(cached));
    }
    
    const taskSkip = (taskPage - 1) * taskLimit;

    interface TaskWhereClause {
      GSClientID: string;
      Active?: string;
    }
    
    const client = await prisma.client.findUnique({
      where: { GSClientID: GSClientID },
      select: {
        id: true, GSClientID: true, clientCode: true, clientNameFull: true,
        groupCode: true, groupDesc: true, clientPartner: true, clientManager: true,
        clientIncharge: true, active: true, clientDateOpen: true, clientDateTerminate: true,
        industry: true, sector: true, forvisMazarsIndustry: true, forvisMazarsSector: true,
        forvisMazarsSubsector: true, clientOCFlag: true, clientTaxFlag: true, clientSecFlag: true,
        creditor: true, rolePlayer: true, typeCode: true, typeDesc: true, createdAt: true, updatedAt: true,
      },
    });

    if (!client) {
      return NextResponse.json({ success: false, error: 'Client not found' }, { status: 404 });
    }

    const taskWhere: TaskWhereClause = { GSClientID: client.GSClientID };
    if (!includeArchived) {
      taskWhere.Active = 'Yes';
    }

    const [tasks, totalTasks, taskCountsByServiceLine] = await Promise.all([
      prisma.task.findMany({
        where: taskWhere,
        orderBy: { updatedAt: 'desc' },
        skip: taskSkip,
        take: taskLimit,
        select: {
          id: true, TaskDesc: true, TaskCode: true, Active: true, createdAt: true,
          updatedAt: true, ServLineCode: true, SLGroup: true, GSTaskID: true,
          TaskDateOpen: true, TaskDateTerminate: true, TaskPartner: true, TaskPartnerName: true,
          TaskManager: true, TaskManagerName: true,
          _count: { select: { MappedAccount: true, TaxAdjustment: true } },
        },
      }),
      prisma.task.count({ where: taskWhere }),
      getTaskCountsByServiceLine(client.GSClientID, includeArchived),
    ]);

    const totalAcrossAllServiceLines = Object.values(taskCountsByServiceLine).reduce((sum, count) => sum + count, 0);

    const allServLineCodes = tasks.map(t => t.ServLineCode);
    const serviceLineMapping: Record<string, string> = {};
    const servLineToSubGroupMapping: Record<string, string> = {};
    const servLineDescMapping: Record<string, string> = {};
    const subGroupDescMapping: Record<string, string> = {};
    
    if (allServLineCodes.length > 0) {
      const mappings = await prisma.serviceLineExternal.findMany({
        where: { ServLineCode: { in: allServLineCodes } },
        select: { ServLineCode: true, ServLineDesc: true, masterCode: true, SubServlineGroupCode: true, SubServlineGroupDesc: true, SLGroup: true },
      });
      mappings.forEach(m => {
        if (m.ServLineCode) {
          if (m.masterCode) serviceLineMapping[m.ServLineCode] = m.masterCode;
          if (m.ServLineDesc) servLineDescMapping[m.ServLineCode] = m.ServLineDesc;
          if (m.SubServlineGroupCode) servLineToSubGroupMapping[m.ServLineCode] = m.SubServlineGroupCode;
          else if (m.SLGroup) servLineToSubGroupMapping[m.ServLineCode] = m.SLGroup;
          if (m.SubServlineGroupDesc) subGroupDescMapping[m.ServLineCode] = m.SubServlineGroupDesc;
        }
      });
    }
    
    const masterCodes = Array.from(new Set(Object.values(serviceLineMapping).filter(Boolean)));
    const masterServiceLineDescMapping: Record<string, string> = {};
    
    if (masterCodes.length > 0) {
      const masterServiceLines = await prisma.serviceLineMaster.findMany({
        where: { code: { in: masterCodes } },
        select: { code: true, description: true },
      });
      masterServiceLines.forEach(m => {
        if (m.description) masterServiceLineDescMapping[m.code] = m.description;
      });
    }

    const taskGSTaskIDs = tasks.map(t => t.GSTaskID);
    const wipTransactions = taskGSTaskIDs.length > 0 ? await prisma.wIPTransactions.findMany({
      where: { OR: [{ GSClientID: client.GSClientID }, { GSTaskID: { in: taskGSTaskIDs } }] },
      select: { GSTaskID: true, Amount: true, TType: true, TranType: true },
    }) : [];

    const wipByTask = calculateWIPByTask(wipTransactions);

    const tasksWithMasterServiceLine = tasks.map(task => {
      const masterCode = serviceLineMapping[task.ServLineCode] || null;
      const taskWip = wipByTask.get(task.GSTaskID);
      
      return {
        ...task,
        masterServiceLine: masterCode,
        masterServiceLineDesc: masterCode ? masterServiceLineDescMapping[masterCode] || null : null,
        subServiceLineGroupCode: servLineToSubGroupMapping[task.ServLineCode] || task.SLGroup,
        subServiceLineGroupDesc: subGroupDescMapping[task.ServLineCode] || null,
        ServLineDesc: servLineDescMapping[task.ServLineCode] || null,
        wip: taskWip || { balWIP: 0, balTime: 0, balDisb: 0, netWip: 0, grossWip: 0, time: 0, timeAdjustments: 0, disbursements: 0, disbursementAdjustments: 0, fees: 0, provision: 0 },
      };
    });

    const [enrichedClient] = await enrichRecordsWithEmployeeNames([client], [
      { codeField: 'clientPartner', nameField: 'clientPartnerName' },
      { codeField: 'clientManager', nameField: 'clientManagerName' },
      { codeField: 'clientIncharge', nameField: 'clientInchargeName' },
    ]);

    const clientWipBalances = calculateWIPBalances(wipTransactions);

    const debtorAggregation = await prisma.drsTransactions.aggregate({
      where: { GSClientID: client.GSClientID },
      _sum: { Total: true },
    });

    const responseData = {
      ...enrichedClient,
      tasks: tasksWithMasterServiceLine,
      balances: { ...clientWipBalances, debtorBalance: debtorAggregation._sum.Total || 0 },
      _count: { Task: totalAcrossAllServiceLines },
      taskPagination: { page: taskPage, limit: taskLimit, total: totalTasks, totalPages: Math.ceil(totalTasks / taskLimit) },
      taskCountsByServiceLine,
    };

    await setCachedClient(GSClientID, responseData, serviceLine, includeArchived);

    return NextResponse.json(successResponse(responseData));
  },
});

/**
 * PUT /api/clients/[id]
 * Update client
 */
export const PUT = secureRoute.mutationWithParams<typeof UpdateClientSchema, { id: string }>({
  schema: UpdateClientSchema,
  handler: async (request, { user, data, params }) => {
    const GSClientID = params.id;

    const validationResult = GSClientIDSchema.safeParse(GSClientID);
    if (!validationResult.success) {
      return NextResponse.json({ success: false, error: 'Invalid client ID format. Expected GUID.' }, { status: 400 });
    }

    const existingClient = await prisma.client.findUnique({ where: { GSClientID: GSClientID } });

    if (!existingClient) {
      return NextResponse.json({ success: false, error: 'Client not found' }, { status: 404 });
    }

    if (data.clientCode && data.clientCode !== existingClient.clientCode) {
      const duplicateClient = await prisma.client.findUnique({ where: { clientCode: data.clientCode } });
      if (duplicateClient) {
        throw new AppError(400, `Client code '${data.clientCode}' is already in use`, ErrorCodes.VALIDATION_ERROR);
      }
    }

    const client = await prisma.client.update({ where: { GSClientID: GSClientID }, data });

    await invalidateClientCache(GSClientID);
    await invalidateClientListCache(GSClientID);

    return NextResponse.json(successResponse(client));
  },
});

/**
 * DELETE /api/clients/[id]
 * Delete client
 */
export const DELETE = secureRoute.mutationWithParams<z.ZodAny, { id: string }>({
  handler: async (request, { user, params }) => {
    const GSClientID = params.id;

    const validationResult = GSClientIDSchema.safeParse(GSClientID);
    if (!validationResult.success) {
      return NextResponse.json({ success: false, error: 'Invalid client ID format. Expected GUID.' }, { status: 400 });
    }

    const existingClient = await prisma.client.findUnique({
      where: { GSClientID: GSClientID },
      include: { _count: { select: { Task: true } } },
    });

    if (!existingClient) {
      return NextResponse.json({ success: false, error: 'Client not found' }, { status: 404 });
    }

    if (existingClient._count.Task > 0) {
      return NextResponse.json({ success: false, error: 'Cannot delete client with existing tasks. Please reassign or delete tasks first.' }, { status: 400 });
    }

    await prisma.client.delete({ where: { GSClientID: GSClientID } });

    await invalidateClientCache(GSClientID);

    return NextResponse.json(successResponse({ message: 'Client deleted successfully' }));
  },
});
