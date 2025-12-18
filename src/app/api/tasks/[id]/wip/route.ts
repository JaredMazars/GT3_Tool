import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { handleApiError } from '@/lib/utils/errorHandler';
import { successResponse } from '@/lib/utils/apiUtils';
import { getCurrentUser } from '@/lib/services/auth/auth';
import { aggregateOverallWipData } from '@/lib/services/analytics/wipAggregation';
import { checkFeature } from '@/lib/permissions/checkFeature';
import { Feature } from '@/lib/permissions/features';
import { getCarlPartnerCodes } from '@/lib/cache/staticDataCache';

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
  ltdAdjTime: number;
  ltdAdjDisb: number;
  ltdFeeTime: number;
  ltdFeeDisb: number;
  ltdHours: number;
}

/**
 * Calculate profitability metrics from raw WIP data
 */
function calculateProfitabilityMetrics(data: {
  ltdTime: number;
  ltdAdjTime: number;
  ltdAdjDisb: number;
  ltdCost: number;
  balWIP: number;
  balTime: number;
  balDisb: number;
  wipProvision: number;
  ltdDisb: number;
  ltdFeeTime: number;
  ltdFeeDisb: number;
  ltdHours: number;
}): ProfitabilityMetrics {
  const grossProduction = data.ltdTime + data.ltdDisb;
  const ltdAdjustment = data.ltdAdjTime + data.ltdAdjDisb;
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
    ltdAdjTime: data.ltdAdjTime,
    ltdAdjDisb: data.ltdAdjDisb,
    ltdFeeTime: data.ltdFeeTime,
    ltdFeeDisb: data.ltdFeeDisb,
    ltdHours: data.ltdHours,
  };
}

/**
 * GET /api/tasks/[id]/wip
 * Get Work in Progress and Profitability data for a task
 * 
 * Returns:
 * - Profitability metrics for the task
 * - Task information (code, description)
 * - Latest update timestamp
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    // 1. Authenticate
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // 2. Parse IDs
    const params = await context.params;
    const taskId = parseInt(params.id, 10);

    if (isNaN(taskId)) {
      return NextResponse.json(
        { error: 'Invalid task ID format' },
        { status: 400 }
      );
    }

    // 3. Check Feature - verify user has access to tasks and WIP data
    const hasAccess = await checkFeature(user.id, Feature.ACCESS_TASKS);
    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Forbidden - Insufficient permissions' },
        { status: 403 }
      );
    }

    // 4. Execute - verify task exists and get task details
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      select: {
        id: true,
        GSTaskID: true,
        TaskCode: true,
        TaskDesc: true,
      },
    });

    if (!task) {
      return NextResponse.json(
        { error: 'Task not found' },
        { status: 404 }
      );
    }

    // 5. Execute - Get CARL partner employee codes from cache to exclude their costs
    const carlPartnerCodes = await getCarlPartnerCodes();

    // Fetch ALL WIP transactions for this task
    const wipTransactions = await prisma.wIPTransactions.findMany({
      where: {
        GSTaskID: task.GSTaskID,
      },
      select: {
        TaskServLine: true,
        Amount: true,
        Cost: true,
        Hour: true,
        TType: true,
        TranType: true,
        EmpCode: true,
        updatedAt: true,
      },
    });

    // Set cost to 0 for Carl Partner transactions
    const processedTransactions = wipTransactions.map(txn => ({
      ...txn,
      Cost: txn.EmpCode && carlPartnerCodes.has(txn.EmpCode) ? 0 : txn.Cost,
    }));

    // Calculate overall totals using processed transactions
    const aggregatedData = aggregateOverallWipData(processedTransactions);

    // Calculate profitability metrics
    const metrics = calculateProfitabilityMetrics(aggregatedData);

    // Get the latest update timestamp from transactions
    const latestWipTransaction = wipTransactions.length > 0
      ? wipTransactions.reduce((latest, current) =>
          current.updatedAt > latest.updatedAt ? current : latest
        )
      : null;

    // 6. Respond
    const responseData = {
      taskId: task.id,
      GSTaskID: task.GSTaskID,
      taskCode: task.TaskCode,
      taskDesc: task.TaskDesc,
      metrics,
      lastUpdated: latestWipTransaction?.updatedAt || null,
    };

    return NextResponse.json(successResponse(responseData));
  } catch (error) {
    return handleApiError(error, 'Get Task WIP');
  }
}




