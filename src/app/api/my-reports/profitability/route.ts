/**
 * My Reports - Profitability Report API
 * 
 * Returns flat list of all tasks across all service lines with Net WIP data
 * Filtered based on employee category:
 * - CARL/Local/DIR: Tasks where user is Task Partner
 * - Others: Tasks where user is Task Manager
 * 
 * Access restricted to employees who are partners or managers
 */

import { NextResponse } from 'next/server';
import { secureRoute } from '@/lib/api/secureRoute';
import { Feature } from '@/lib/permissions/features';
import { prisma } from '@/lib/db/prisma';
import { handleApiError, AppError, ErrorCodes } from '@/lib/utils/errorHandler';
import { successResponse } from '@/lib/utils/apiUtils';
import { cache, CACHE_PREFIXES } from '@/lib/services/cache/CacheService';
import { categorizeTransaction } from '@/lib/services/clients/clientBalanceCalculation';
import { logger } from '@/lib/utils/logger';
import type { ProfitabilityReportData, TaskWithWIPAndServiceLine } from '@/types/api';

export const dynamic = 'force-dynamic';

/**
 * GET /api/my-reports/profitability
 * 
 * Returns flat list of tasks with all relations and service line info
 */
export const GET = secureRoute.query({
  feature: Feature.ACCESS_DASHBOARD,
  handler: async (request, { user }) => {
    try {
      const startTime = Date.now();

      // 1. Find employee record for current user
      const userEmail = user.email.toLowerCase();
      const emailPrefix = userEmail.split('@')[0];

      const employee = await prisma.employee.findFirst({
        where: {
          AND: [
            { Active: 'Yes' },
            {
              OR: [
                { WinLogon: { equals: userEmail } },
                { WinLogon: { equals: emailPrefix } },
                { WinLogon: { startsWith: `${emailPrefix}@` } },
              ],
            },
          ],
        },
        select: {
          EmpCode: true,
          EmpNameFull: true,
          EmpCatCode: true,
          EmpCatDesc: true,
        },
      });

      if (!employee) {
        throw new AppError(
          403,
          'No employee record found for your account',
          ErrorCodes.FORBIDDEN
        );
      }

      logger.info('Profitability report requested', {
        userId: user.id,
        empCode: employee.EmpCode,
        empCatCode: employee.EmpCatCode,
      });

      // 2. Determine filter mode based on employee category
      const partnerCategories = ['CARL', 'Local', 'DIR'];
      const isPartnerReport = partnerCategories.includes(employee.EmpCatCode);
      const filterMode = isPartnerReport ? 'PARTNER' : 'MANAGER';

      // Check cache
      const cacheKey = `${CACHE_PREFIXES.USER}my-reports:profitability:${user.id}`;
      const cached = await cache.get<ProfitabilityReportData>(cacheKey);
      if (cached) {
        logger.info('Returning cached profitability report', { userId: user.id, filterMode });
        return NextResponse.json(successResponse(cached));
      }

      // 3. Query ALL tasks across all service lines based on filter mode
      const taskWhereClause = isPartnerReport
        ? { TaskPartner: employee.EmpCode, Active: 'Yes' }
        : { TaskManager: employee.EmpCode, Active: 'Yes' };

      const tasks = await prisma.task.findMany({
        where: taskWhereClause,
        select: {
          id: true,
          GSTaskID: true,
          TaskCode: true,
          TaskDesc: true,
          TaskPartner: true,
          TaskPartnerName: true,
          TaskManager: true,
          TaskManagerName: true,
          ServLineCode: true,
          ServLineDesc: true,
          Client: {
            select: {
              GSClientID: true,
              clientCode: true,
              clientNameFull: true,
              groupCode: true,
              groupDesc: true,
            },
          },
        },
        orderBy: [
          { Client: { groupDesc: 'asc' } },
          { Client: { clientCode: 'asc' } },
          { TaskCode: 'asc' },
        ],
      });

      // Filter out tasks without clients
      const tasksWithClients = tasks.filter((task) => task.Client !== null);

      if (tasksWithClients.length === 0) {
        const emptyReport: ProfitabilityReportData = {
          tasks: [],
          filterMode,
          employeeCode: employee.EmpCode,
        };

        // Cache empty result for 5 minutes
        await cache.set(cacheKey, emptyReport, 300);

        return NextResponse.json(successResponse(emptyReport));
      }

      // 4. Get service line details
      const uniqueServLineCodes = [...new Set(tasksWithClients.map((t) => t.ServLineCode))];
      const serviceLines = await prisma.serviceLineExternal.findMany({
        where: {
          ServLineCode: { in: uniqueServLineCodes },
        },
        select: {
          ServLineCode: true,
          ServLineDesc: true,
          SubServlineGroupCode: true,
          SubServlineGroupDesc: true,
          masterCode: true,
        },
      });

      // Get unique master codes to fetch master service line names
      const uniqueMasterCodes = [...new Set(serviceLines.map((sl) => sl.masterCode).filter(Boolean))];
      const masterServiceLines = await prisma.serviceLineMaster.findMany({
        where: {
          code: { in: uniqueMasterCodes as string[] },
        },
        select: {
          code: true,
          name: true,
        },
      });

      // Create maps for quick lookup
      const masterServiceLineMap = new Map(
        masterServiceLines.map((msl) => [msl.code, msl.name])
      );

      const servLineDetailsMap = new Map(
        serviceLines.map((sl) => [
          sl.ServLineCode,
          {
            servLineDesc: sl.ServLineDesc || '',
            subServlineGroupCode: sl.SubServlineGroupCode || '',
            subServlineGroupDesc: sl.SubServlineGroupDesc || '',
            masterCode: sl.masterCode || '',
          },
        ])
      );

      // 5. Get all task GSTaskIDs for WIP calculation
      const taskGSTaskIDs = tasksWithClients.map((t) => t.GSTaskID);

      // 6. Fetch WIP transactions for all tasks
      const wipTransactions = await prisma.wIPTransactions.findMany({
        where: {
          GSTaskID: { in: taskGSTaskIDs },
        },
        select: {
          GSTaskID: true,
          Amount: true,
          TType: true,
        },
      });

      // 7. Calculate Net WIP for each task
      const wipByTask = new Map<string, number>();

      // Group transactions by task
      const transactionsByTask = new Map<string, typeof wipTransactions>();
      wipTransactions.forEach((transaction) => {
        if (!transactionsByTask.has(transaction.GSTaskID)) {
          transactionsByTask.set(transaction.GSTaskID, []);
        }
        transactionsByTask.get(transaction.GSTaskID)!.push(transaction);
      });

      // Calculate Net WIP per task
      transactionsByTask.forEach((transactions, gsTaskId) => {
        let time = 0;
        let adjustments = 0;
        let disbursements = 0;
        let fees = 0;
        let provision = 0;

        transactions.forEach((transaction) => {
          const amount = transaction.Amount || 0;
          const category = categorizeTransaction(transaction.TType);

          if (category.isProvision) {
            provision += amount;
          } else if (category.isFee) {
            fees += amount;
          } else if (category.isAdjustment) {
            adjustments += amount;
          } else if (category.isTime) {
            time += amount;
          } else if (category.isDisbursement) {
            disbursements += amount;
          }
        });

        // Net WIP = Time + Adjustments + Disbursements - Fees + Provision
        const netWip = time + adjustments + disbursements - fees + provision;
        wipByTask.set(gsTaskId, netWip);
      });

      // 8. Build flat list with all relations
      const flatTasks: TaskWithWIPAndServiceLine[] = tasksWithClients.map((task) => {
        const servLineDetails = servLineDetailsMap.get(task.ServLineCode);
        const masterCode = servLineDetails?.masterCode || '';
        
        // Use ServiceLineExternal descriptions if available, otherwise fallback to task's ServLineDesc
        const serviceLineDesc = servLineDetails?.servLineDesc || task.ServLineDesc;
        const subServlineGroupCode = servLineDetails?.subServlineGroupCode || '';
        const subServlineGroupDesc = servLineDetails?.subServlineGroupDesc || serviceLineDesc;
        const masterServiceLineName = masterCode ? (masterServiceLineMap.get(masterCode) || serviceLineDesc) : serviceLineDesc;
        
        return {
          id: task.id,
          TaskCode: task.TaskCode,
          TaskDesc: task.TaskDesc,
          TaskPartner: task.TaskPartner,
          TaskPartnerName: task.TaskPartnerName,
          TaskManager: task.TaskManager,
          TaskManagerName: task.TaskManagerName,
          netWip: wipByTask.get(task.GSTaskID) || 0,
          groupCode: task.Client!.groupCode,
          groupDesc: task.Client!.groupDesc,
          clientCode: task.Client!.clientCode,
          clientNameFull: task.Client!.clientNameFull,
          GSClientID: task.Client!.GSClientID,
          servLineCode: task.ServLineCode,
          subServlineGroupCode: subServlineGroupCode,
          subServlineGroupDesc: subServlineGroupDesc,
          serviceLineName: serviceLineDesc,
          masterServiceLineCode: masterCode || task.ServLineCode,
          masterServiceLineName: masterServiceLineName,
        };
      });

      const report: ProfitabilityReportData = {
        tasks: flatTasks,
        filterMode,
        employeeCode: employee.EmpCode,
      };

      // Cache for 10 minutes
      await cache.set(cacheKey, report, 600);

      const duration = Date.now() - startTime;
      logger.info('Profitability report generated', {
        userId: user.id,
        filterMode,
        taskCount: flatTasks.length,
        duration,
      });

      return NextResponse.json(successResponse(report));
    } catch (error) {
      logger.error('Error generating profitability report', error);
      return handleApiError(error, 'Generate profitability report');
    }
  },
});

