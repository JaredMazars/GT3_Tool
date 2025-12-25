import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { secureRoute, Feature } from '@/lib/api/secureRoute';
import { AppError, ErrorCodes } from '@/lib/utils/errorHandler';
import { successResponse, parseGSClientID } from '@/lib/utils/apiUtils';
import { cache, CACHE_PREFIXES } from '@/lib/services/cache/CacheService';
import { 
  aggregateWipTransactionsByServiceLine, 
  aggregateOverallWipData,
  countUniqueTasks 
} from '@/lib/services/analytics/wipAggregation';
import { getCarlPartnerCodes, getServiceLineMappings } from '@/lib/cache/staticDataCache';

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
  taskCount: number;
  // Legacy fields for backwards compatibility
  ltdAdjTime: number;
  ltdAdjDisb: number;
  ltdFeeTime: number;
  ltdFeeDisb: number;
}

/**
 * Calculate profitability metrics from raw WIP data
 */
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
  taskCount: number;
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
    taskCount: data.taskCount,
    // Legacy fields for backwards compatibility - set to 0
    ltdAdjTime: 0,
    ltdAdjDisb: 0,
    ltdFeeTime: 0,
    ltdFeeDisb: 0,
  };
}

/**
 * GET /api/clients/[id]/wip
 * Get aggregated Work in Progress and Profitability data for a client
 * 
 * Returns:
 * - Overall profitability metrics (lifetime/all transactions)
 * - Profitability metrics grouped by Master Service Line
 * - Master Service Line information
 * - Task count contributing to WIP
 * - Latest update timestamp
 * - Time period: All-time (cumulative balances across all transactions)
 * 
 * Note: WIP Balance (balWIP) represents current outstanding balance and must include
 * all historical transactions to be accurate. This is used in client headers.
 */
export const GET = secureRoute.queryWithParams({
  feature: Feature.ACCESS_CLIENTS,
  handler: async (request, { user, params }) => {
    // Parse and validate GSClientID
    const GSClientID = parseGSClientID(params.id);

    // Verify client exists
    const client = await prisma.client.findUnique({
      where: { GSClientID },
      select: {
        id: true,
        GSClientID: true,
        clientCode: true,
        clientNameFull: true,
      },
    });

    if (!client) {
      throw new AppError(404, 'Client not found', ErrorCodes.NOT_FOUND);
    }

    // Check cache first
    const cacheKey = `${CACHE_PREFIXES.CLIENT}wip:${GSClientID}`;
    const cached = await cache.get<Record<string, unknown>>(cacheKey);
    if (cached) {
      return NextResponse.json(successResponse(cached));
    }

    // Get CARL partner employee codes and WIP transactions in parallel
    const [carlPartnerCodes, wipTransactions] = await Promise.all([
      getCarlPartnerCodes(),
      prisma.wIPTransactions.findMany({
        where: { GSClientID },
        select: {
          GSTaskID: true,
          TaskServLine: true,
          Amount: true,
          Cost: true,
          Hour: true,
          TType: true,
          EmpCode: true,
          updatedAt: true,
        },
        take: 100000, // Reasonable upper bound - prevents unbounded queries
      }),
    ]);

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

    // Calculate overall profitability metrics
    const overall = calculateProfitabilityMetrics(overallTotals);

    // Get the latest update timestamp from transactions
    const latestWipTransaction = wipTransactions.length > 0
      ? wipTransactions.reduce((latest, current) =>
          current.updatedAt > latest.updatedAt ? current : latest
        )
      : null;

    const responseData = {
      GSClientID: client.GSClientID,
      clientCode: client.clientCode,
      clientName: client.clientNameFull,
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
