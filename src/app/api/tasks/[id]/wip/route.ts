import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { successResponse, parseTaskId } from '@/lib/utils/apiUtils';
import { aggregateOverallWipData } from '@/lib/services/analytics/wipAggregation';
import { getCarlPartnerCodes } from '@/lib/cache/staticDataCache';
import { secureRoute, Feature } from '@/lib/api/secureRoute';
import { AppError, ErrorCodes } from '@/lib/utils/errorHandler';

interface ProfitabilityMetrics {
  grossProduction: number;
  ltdAdjustment: number;
  netRevenue: number;
  adjustmentPercentage: number;
  ltdCost: number;
  grossProfit: number;
  grossProfitPercentage: number;
  averageChargeoutRate: number;
  averageRecoveryRate: number;
  balWIP: number;
  balTime: number;
  balDisb: number;
  wipProvision: number;
  ltdTime: number;
  ltdDisb: number;
  ltdAdj: number; // Merged adjustments
  ltdFee: number; // Merged fees
  ltdHours: number;
  // Legacy fields for backwards compatibility
  ltdAdjTime: number;
  ltdAdjDisb: number;
  ltdFeeTime: number;
  ltdFeeDisb: number;
}

function calculateProfitabilityMetrics(data: {
  ltdTime: number;
  ltdAdj: number;
  ltdCost: number;
  balWIP: number;
  balTime: number;
  balDisb: number;
  wipProvision: number;
  ltdDisb: number;
  ltdFee: number;
  ltdHours: number;
}): ProfitabilityMetrics {
  const grossProduction = data.ltdTime + data.ltdDisb;
  const ltdAdjustment = data.ltdAdj;
  const netRevenue = grossProduction + ltdAdjustment;
  const adjustmentPercentage = grossProduction !== 0 ? (ltdAdjustment / grossProduction) * 100 : 0;
  const grossProfit = netRevenue - data.ltdCost;
  const grossProfitPercentage = netRevenue !== 0 ? (grossProfit / netRevenue) * 100 : 0;
  const averageChargeoutRate = data.ltdHours !== 0 ? grossProduction / data.ltdHours : 0;
  const averageRecoveryRate = data.ltdHours !== 0 ? netRevenue / data.ltdHours : 0;

  return {
    grossProduction,
    ltdAdjustment,
    netRevenue,
    adjustmentPercentage,
    ltdCost: data.ltdCost,
    grossProfit,
    grossProfitPercentage,
    averageChargeoutRate,
    averageRecoveryRate,
    balWIP: data.balWIP,
    balTime: data.balTime,
    balDisb: data.balDisb,
    wipProvision: data.wipProvision,
    ltdTime: data.ltdTime,
    ltdDisb: data.ltdDisb,
    ltdAdj: data.ltdAdj,
    ltdFee: data.ltdFee,
    ltdHours: data.ltdHours,
    // Legacy fields for backwards compatibility - set to 0
    ltdAdjTime: 0,
    ltdAdjDisb: 0,
    ltdFeeTime: 0,
    ltdFeeDisb: 0,
  };
}

/**
 * GET /api/tasks/[id]/wip
 * Get Work in Progress and Profitability data for a task
 */
export const GET = secureRoute.queryWithParams<{ id: string }>({
  feature: Feature.ACCESS_TASKS,
  handler: async (request, { user, params }) => {
    const taskId = parseTaskId(params.id);

    const task = await prisma.task.findUnique({
      where: { id: taskId },
      select: { id: true, GSTaskID: true, TaskCode: true, TaskDesc: true },
    });

    if (!task) {
      throw new AppError(404, 'Task not found', ErrorCodes.NOT_FOUND);
    }

    const carlPartnerCodes = await getCarlPartnerCodes();

    const wipTransactions = await prisma.wIPTransactions.findMany({
      where: { GSTaskID: task.GSTaskID },
      select: {
        TaskServLine: true,
        Amount: true,
        Cost: true,
        Hour: true,
        TType: true,
        EmpCode: true,
        updatedAt: true,
      },
      take: 50000,
    });

    const processedTransactions = wipTransactions.map(txn => ({
      ...txn,
      Cost: txn.EmpCode && carlPartnerCodes.has(txn.EmpCode) ? 0 : txn.Cost,
    }));

    const aggregatedData = aggregateOverallWipData(processedTransactions);
    const metrics = calculateProfitabilityMetrics(aggregatedData);

    const latestWipTransaction = wipTransactions.length > 0
      ? wipTransactions.reduce((latest, current) =>
          current.updatedAt > latest.updatedAt ? current : latest
        )
      : null;

    const responseData = {
      taskId: task.id,
      GSTaskID: task.GSTaskID,
      taskCode: task.TaskCode,
      taskDesc: task.TaskDesc,
      metrics,
      lastUpdated: latestWipTransaction?.updatedAt || null,
    };

    return NextResponse.json(successResponse(responseData));
  },
});
