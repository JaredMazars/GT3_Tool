import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { AppError, ErrorCodes } from '@/lib/utils/errorHandler';
import { UpdateClientSchema, GSClientIDSchema } from '@/lib/validation/schemas';
import { successResponse } from '@/lib/utils/apiUtils';
import { z } from 'zod';
import { getTaskCountsByServiceLine } from '@/lib/services/tasks/taskAggregation';
import { invalidateClientListCache } from '@/lib/services/cache/listCache';
import { enrichRecordsWithEmployeeNames } from '@/lib/services/employees/employeeQueries';
import { enrichEmployeesWithStatus } from '@/lib/services/employees/employeeStatusService';
import { enrichObjectsWithEmployeeStatus } from '@/lib/services/employees/employeeStatusService';
import { calculateWIPByTask, calculateWIPBalances } from '@/lib/services/clients/clientBalanceCalculation';
import { secureRoute } from '@/lib/api/secureRoute';
import { cache, CACHE_PREFIXES } from '@/lib/services/cache/CacheService';
import { logger } from '@/lib/utils/logger';

// Zod schema for GET query params validation
const ClientDetailQuerySchema = z.object({
  taskPage: z.coerce.number().int().min(1).max(1000).optional().default(1),
  taskLimit: z.coerce.number().int().min(1).max(50).optional().default(20),
  serviceLine: z.string().max(50).optional(),
  includeArchived: z.enum(['true', 'false']).optional().default('false'),
}).strict();

/**
 * GET /api/clients/[id]
 * Get client details with tasks and balances
 */
export const GET = secureRoute.queryWithParams<{ id: string }>({
  handler: async (request, { user, params }) => {
    const GSClientID = params.id;

    const validationResult = GSClientIDSchema.safeParse(GSClientID);
    if (!validationResult.success) {
      throw new AppError(400, 'Invalid client ID format. Expected GUID.', ErrorCodes.VALIDATION_ERROR);
    }

    const { searchParams } = new URL(request.url);
    
    // Validate query params
    const queryResult = ClientDetailQuerySchema.safeParse({
      taskPage: searchParams.get('taskPage') || undefined,
      taskLimit: searchParams.get('taskLimit') || undefined,
      serviceLine: searchParams.get('serviceLine') || undefined,
      includeArchived: searchParams.get('includeArchived') || undefined,
    });
    
    if (!queryResult.success) {
      throw new AppError(400, 'Invalid query parameters', ErrorCodes.VALIDATION_ERROR, { errors: queryResult.error.flatten() });
    }
    
    const { taskPage, taskLimit, serviceLine, includeArchived: includeArchivedStr } = queryResult.data;
    const includeArchived = includeArchivedStr === 'true';
    
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
      throw new AppError(404, 'Client not found', ErrorCodes.NOT_FOUND);
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
          TaskAcceptance: { select: { acceptanceApproved: true } },
          TaskEngagementLetter: { select: { uploaded: true, dpaUploaded: true } },
          Client: { select: { id: true, GSClientID: true, clientNameFull: true, clientCode: true } },
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
    
    // Optimized WIP query with caching and performance logging
    // Uses UNION ALL instead of OR for better index utilization with covering indexes
    const cacheKey = `${CACHE_PREFIXES.ANALYTICS}client-wip-by-task:${client.GSClientID}:${taskPage}:${taskLimit}`;
    let wipTransactions: Array<{ GSTaskID: string; Amount: number | null; TType: string }> = [];
    
    // Try cache first
    const cachedWip = await cache.get<typeof wipTransactions>(cacheKey);
    if (cachedWip) {
      wipTransactions = cachedWip;
      logger.info('Client WIP query served from cache', {
        GSClientID: client.GSClientID,
        taskCount: taskGSTaskIDs.length,
        cached: true,
      });
    } else if (taskGSTaskIDs.length > 0) {
      // Performance tracking
      const wipQueryStart = Date.now();
      
      // OPTIMIZED QUERY: UNION ALL approach (uses covering indexes efficiently)
      // This replaces the old OR query which caused table scans
      // Path 1: Get transactions directly linked to client (uses idx_wip_gsclientid_covering)
      // Path 2: Get transactions linked only via task (uses idx_wip_gstaskid_covering)
      //         Excludes duplicates by filtering out rows already captured in Path 1
      const [clientTransactions, taskOnlyTransactions] = await Promise.all([
        // Path 1: Direct client link (uses idx_wip_gsclientid_covering)
        prisma.wIPTransactions.findMany({
          where: { GSClientID: client.GSClientID },
          select: { GSTaskID: true, Amount: true, TType: true },
        }),
        
        // Path 2: Task-only link with NULL/different GSClientID (uses idx_wip_gstaskid_covering)
        // CRITICAL: This captures billing fees that may only be linked via GSTaskID
        prisma.wIPTransactions.findMany({
          where: { 
            GSTaskID: { in: taskGSTaskIDs },
            // Exclude rows already captured by GSClientID query (prevent duplicates)
            OR: [
              { GSClientID: null },
              { GSClientID: { not: client.GSClientID } }
            ]
          },
          select: { GSTaskID: true, Amount: true, TType: true },
        }),
      ]);
      
      // Combine results (equivalent to UNION ALL in SQL)
      wipTransactions = [...clientTransactions, ...taskOnlyTransactions];
      
      const wipQueryDuration = Date.now() - wipQueryStart;
      
      // Performance logging
      logger.info('Client WIP query completed', {
        GSClientID: client.GSClientID,
        clientCode: client.clientCode,
        taskCount: taskGSTaskIDs.length,
        transactionCount: wipTransactions.length,
        clientTxnCount: clientTransactions.length,
        taskOnlyTxnCount: taskOnlyTransactions.length,
        durationMs: wipQueryDuration,
        queryType: 'union-all-optimized',
        cached: false,
      });
      
      // Cache for 5 minutes (300 seconds)
      // WIP data changes infrequently (nightly sync), so short-term caching is safe
      await cache.set(cacheKey, wipTransactions, 300);
    }

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
        wip: taskWip || { balWIP: 0, balTime: 0, balDisb: 0, netWip: 0, grossWip: 0, time: 0, adjustments: 0, disbursements: 0, fees: 0, provision: 0 },
        acceptanceApproved: task.TaskAcceptance?.acceptanceApproved ?? null,
        engagementLetterUploaded: task.TaskEngagementLetter?.uploaded ?? null,
        dpaUploaded: task.TaskEngagementLetter?.dpaUploaded ?? null,
      };
    });

    // Enrich tasks with current employee names for partner/manager
    const enrichedTasks = await enrichRecordsWithEmployeeNames(tasksWithMasterServiceLine, [
      { codeField: 'TaskPartner', nameField: 'TaskPartnerName' },
      { codeField: 'TaskManager', nameField: 'TaskManagerName' },
    ]);

    // Fetch employee status for all task partners and managers
    const allTaskEmployeeCodes = [...new Set(
      enrichedTasks.flatMap(t => [t.TaskPartner, t.TaskManager]).filter(Boolean) as string[]
    )];
    const taskEmployeeStatusMap = await enrichEmployeesWithStatus(allTaskEmployeeCodes);

    // Add status to each task
    const enrichedTasksWithStatus = enrichedTasks.map(task => ({
      ...task,
      TaskPartnerStatus: task.TaskPartner ? taskEmployeeStatusMap.get(task.TaskPartner) : undefined,
      TaskManagerStatus: task.TaskManager ? taskEmployeeStatusMap.get(task.TaskManager) : undefined,
    }));

    const enrichedClients = await enrichRecordsWithEmployeeNames(
      [client],
      [
        { codeField: 'clientPartner', nameField: 'clientPartnerName' },
        { codeField: 'clientManager', nameField: 'clientManagerName' },
        { codeField: 'clientIncharge', nameField: 'clientInchargeName' },
      ],
      true // Bypass cache for fresh employee data
    );

    // Enrich with employee status (active/inactive, has user account)
    await enrichObjectsWithEmployeeStatus(enrichedClients, [
      { codeField: 'clientPartner', statusField: 'clientPartnerStatus' },
      { codeField: 'clientManager', statusField: 'clientManagerStatus' },
      { codeField: 'clientIncharge', statusField: 'clientInchargeStatus' },
    ]);

    const enrichedClient = enrichedClients[0]!;

    const clientWipBalances = calculateWIPBalances(wipTransactions);

    const debtorAggregation = await prisma.drsTransactions.aggregate({
      where: { GSClientID: client.GSClientID },
      _sum: { Total: true },
    });

    const responseData = {
      ...enrichedClient,
      tasks: enrichedTasksWithStatus,
      balances: { ...clientWipBalances, debtorBalance: debtorAggregation._sum.Total || 0 },
      _count: { Task: totalAcrossAllServiceLines },
      taskPagination: { page: taskPage, limit: taskLimit, total: totalTasks, totalPages: Math.ceil(totalTasks / taskLimit) },
      taskCountsByServiceLine,
    };

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
      throw new AppError(400, 'Invalid client ID format. Expected GUID.', ErrorCodes.VALIDATION_ERROR);
    }

    const existingClient = await prisma.client.findUnique({
      where: { GSClientID: GSClientID },
      select: { GSClientID: true, clientCode: true },
    });

    if (!existingClient) {
      throw new AppError(404, 'Client not found', ErrorCodes.NOT_FOUND);
    }

    if (data.clientCode && data.clientCode !== existingClient.clientCode) {
      const duplicateClient = await prisma.client.findUnique({
        where: { clientCode: data.clientCode },
        select: { clientCode: true },
      });
      if (duplicateClient) {
        throw new AppError(400, `Client code '${data.clientCode}' is already in use`, ErrorCodes.VALIDATION_ERROR);
      }
    }

    // Explicit field mapping to prevent mass assignment
    const client = await prisma.client.update({
      where: { GSClientID: GSClientID },
      data: {
        clientNameFull: data.clientNameFull,
        clientCode: data.clientCode,
        groupCode: data.groupCode,
        groupDesc: data.groupDesc,
        clientPartner: data.clientPartner,
        clientManager: data.clientManager,
        clientIncharge: data.clientIncharge,
        industry: data.industry,
        sector: data.sector,
        active: data.active,
      },
      select: {
        id: true,
        GSClientID: true,
        clientCode: true,
        clientNameFull: true,
        groupCode: true,
        groupDesc: true,
        clientPartner: true,
        clientManager: true,
        clientIncharge: true,
        industry: true,
        sector: true,
        active: true,
        updatedAt: true,
      },
    });

    await invalidateClientListCache(GSClientID);

    return NextResponse.json(successResponse(client));
  },
});

/**
 * DELETE /api/clients/[id]
 * Delete client
 */
export const DELETE = secureRoute.mutationWithParams<z.ZodUndefined, { id: string }>({
  handler: async (request, { user, params }) => {
    const GSClientID = params.id;

    const validationResult = GSClientIDSchema.safeParse(GSClientID);
    if (!validationResult.success) {
      throw new AppError(400, 'Invalid client ID format. Expected GUID.', ErrorCodes.VALIDATION_ERROR);
    }

    const existingClient = await prisma.client.findUnique({
      where: { GSClientID: GSClientID },
      select: {
        GSClientID: true,
        _count: { select: { Task: true } },
      },
    });

    if (!existingClient) {
      throw new AppError(404, 'Client not found', ErrorCodes.NOT_FOUND);
    }

    if (existingClient._count.Task > 0) {
      throw new AppError(400, 'Cannot delete client with existing tasks. Please reassign or delete tasks first.', ErrorCodes.VALIDATION_ERROR);
    }

    await prisma.client.delete({ where: { GSClientID: GSClientID } });

    await invalidateClientListCache(GSClientID);

    return NextResponse.json(successResponse({ message: 'Client deleted successfully' }));
  },
});
