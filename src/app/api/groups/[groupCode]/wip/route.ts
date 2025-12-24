import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { AppError, ErrorCodes } from '@/lib/utils/errorHandler';
import { successResponse } from '@/lib/utils/apiUtils';
import { 
  aggregateWipTransactionsByServiceLine, 
  aggregateOverallWipData,
  countUniqueTasks 
} from '@/lib/services/analytics/wipAggregation';
import { cache, CACHE_PREFIXES } from '@/lib/services/cache/CacheService';
import { getCarlPartnerCodes, getServiceLineMappings } from '@/lib/cache/staticDataCache';
import { secureRoute, Feature } from '@/lib/api/secureRoute';

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
  taskCount: number;
}

interface MasterServiceLineInfo {
  code: string;
  name: string;
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
  taskCount: number;
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
    taskCount: data.taskCount,
  };
}

/**
 * GET /api/groups/[groupCode]/wip
 * Get aggregated Work in Progress and Profitability data for a group
 * 
 * Returns:
 * - Overall profitability metrics for all clients in the group
 * - Profitability metrics grouped by Master Service Line
 * - Master Service Line information
 * - Task count contributing to WIP
 * - Latest update timestamp
 */
export const GET = secureRoute.queryWithParams<{ groupCode: string }>({
  feature: Feature.VIEW_WIP_DATA,
  handler: async (request, { user, params }) => {
    const { groupCode } = params;

    if (!groupCode) {
      throw new AppError(400, 'Group code is required', ErrorCodes.VALIDATION_ERROR);
    }

    // Verify the group exists
    const groupInfo = await prisma.client.findFirst({
      where: { groupCode },
      select: {
        groupCode: true,
        groupDesc: true,
      },
    });

    if (!groupInfo) {
      throw new AppError(404, 'Group not found', ErrorCodes.NOT_FOUND);
    }

    // Generate cache key
    const cacheKey = `${CACHE_PREFIXES.ANALYTICS}group-wip:${groupCode}`;
    
    // Try cache first
    const cached = await cache.get(cacheKey);
    if (cached) {
      return NextResponse.json(successResponse(cached));
    }

    // Get all clients in this group (organization-wide, limited to 1000)
    const clientsInGroup = await prisma.client.findMany({
      where: {
        groupCode,
      },
      select: {
        GSClientID: true,
      },
      take: 1000,
    });

    const GSClientIDs = clientsInGroup.map(c => c.GSClientID);

    if (GSClientIDs.length === 0) {
      return NextResponse.json(
        successResponse({
          groupCode: groupInfo.groupCode,
          groupDesc: groupInfo.groupDesc,
          overall: calculateProfitabilityMetrics({
            ltdTime: 0,
            ltdAdjTime: 0,
            ltdAdjDisb: 0,
            ltdCost: 0,
            balWIP: 0,
            balTime: 0,
            balDisb: 0,
            wipProvision: 0,
            ltdDisb: 0,
            ltdFeeTime: 0,
            ltdFeeDisb: 0,
            ltdHours: 0,
            taskCount: 0,
          }),
          byMasterServiceLine: {},
          masterServiceLines: [],
          taskCount: 0,
          lastUpdated: null,
        })
      );
    }

    // Get CARL partner employee codes from cache
    const carlPartnerCodes = await getCarlPartnerCodes();

    // Fetch WIP transactions for all clients in the group (limited to 100000)
    const wipTransactions = await prisma.wIPTransactions.findMany({
      where: {
        GSClientID: {
          in: GSClientIDs,
        },
      },
      select: {
        GSTaskID: true,
        TaskServLine: true,
        Amount: true,
        Cost: true,
        Hour: true,
        TType: true,
        TranType: true,
        EmpCode: true,
        updatedAt: true,
      },
      take: 100000,
    });

    // Set cost to 0 for Carl Partner transactions
    const processedTransactions = wipTransactions.map(txn => ({
      ...txn,
      Cost: txn.EmpCode && carlPartnerCodes.has(txn.EmpCode) ? 0 : txn.Cost,
    }));

    // Get Service Line External mappings from cache
    const servLineToMasterMap = await getServiceLineMappings();

    // Aggregate WIP transactions by Master Service Line using processed transactions
    const groupedData = aggregateWipTransactionsByServiceLine(
      processedTransactions,
      servLineToMasterMap
    );

    // Calculate overall totals using processed transactions
    const overallTotals = aggregateOverallWipData(processedTransactions);
    
    // Count unique tasks
    const taskCount = countUniqueTasks(processedTransactions);
    overallTotals.taskCount = taskCount;

    // Fetch Master Service Line names
    const masterServiceLines = await prisma.serviceLineMaster.findMany({
      where: {
        code: {
          in: Array.from(groupedData.keys()).filter(code => code !== 'UNKNOWN'),
        },
      },
      select: {
        code: true,
        name: true,
      },
      take: 100,
    });

    // Calculate profitability metrics for each Master Service Line
    const byMasterServiceLine: Record<string, ProfitabilityMetrics> = {};
    groupedData.forEach((data, masterCode) => {
      byMasterServiceLine[masterCode] = calculateProfitabilityMetrics(data);
    });

    // #region agent log - Hypothesis F: Log profitability billing data
    fetch('http://127.0.0.1:7242/ingest/b3aab070-f6ba-47bb-8f83-44bc48c48d0b',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'wip/route.ts:245',message:'Profitability billing data',data:{groupCode,ltdFeeTime:overallTotals.ltdFeeTime,ltdFeeDisb:overallTotals.ltdFeeDisb,totalFees:overallTotals.ltdFeeTime+overallTotals.ltdFeeDisb},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'F'})}).catch(()=>{});
    // #endregion

    // Calculate overall profitability metrics
    const overall = calculateProfitabilityMetrics(overallTotals);

    // Get the latest update timestamp from transactions
    const latestWipTransaction = wipTransactions.length > 0
      ? wipTransactions.reduce((latest, current) =>
          current.updatedAt > latest.updatedAt ? current : latest
        )
      : null;

    // 6. Respond
    const responseData = {
      groupCode: groupInfo.groupCode,
      groupDesc: groupInfo.groupDesc,
      overall,
      byMasterServiceLine,
      masterServiceLines: masterServiceLines.map(msl => ({
        code: msl.code,
        name: msl.name,
      })),
      taskCount: taskCount,
      lastUpdated: latestWipTransaction?.updatedAt || null,
    };

    // Cache for 10 minutes (600 seconds)
    await cache.set(cacheKey, responseData, 600);

    return NextResponse.json(successResponse(responseData));
  },
});
