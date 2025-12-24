import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { secureRoute, Feature } from '@/lib/api/secureRoute';
import { AppError, ErrorCodes } from '@/lib/utils/errorHandler';
import { successResponse } from '@/lib/utils/apiUtils';
import { cache, CACHE_PREFIXES } from '@/lib/services/cache/CacheService';
import { getServiceLineMappings } from '@/lib/cache/staticDataCache';
import { calculateWIPBalances, categorizeTransaction } from '@/lib/services/clients/clientBalanceCalculation';
import { logger } from '@/lib/utils/logger';

interface DailyMetrics {
  date: string; // YYYY-MM-DD format
  production: number;
  adjustments: number;
  disbursements: number;
  billing: number;
  provisions: number;
  wipBalance: number;
}

interface ServiceLineGraphData {
  dailyMetrics: DailyMetrics[];
  summary: {
    totalProduction: number;
    totalAdjustments: number;
    totalDisbursements: number;
    totalBilling: number;
    totalProvisions: number;
    currentWipBalance: number;
  };
}

interface MasterServiceLineInfo {
  code: string;
  name: string;
}

interface GraphDataResponse {
  groupCode: string;
  groupDesc: string;
  clientCount: number;
  startDate: string;
  endDate: string;
  overall: ServiceLineGraphData;
  byMasterServiceLine: Record<string, ServiceLineGraphData>;
  masterServiceLines: MasterServiceLineInfo[];
}

/**
 * Downsample daily metrics to reduce payload size while maintaining visual fidelity
 * Uses smart downsampling that preserves all non-zero data points
 * @param metrics Array of daily metrics
 * @param targetPoints Target number of data points (default: 120 for ~4 months of daily data)
 * @returns Downsampled array
 */
function downsampleDailyMetrics(metrics: DailyMetrics[], targetPoints: number = 120): DailyMetrics[] {
  if (metrics.length <= targetPoints) {
    return metrics;
  }
  
  // Separate metrics into zero and non-zero groups
  const nonZeroMetrics: DailyMetrics[] = [];
  const zeroMetrics: { metric: DailyMetrics; index: number }[] = [];
  
  metrics.forEach((metric, index) => {
    const hasData = 
      metric.production !== 0 ||
      metric.adjustments !== 0 ||
      metric.disbursements !== 0 ||
      metric.billing !== 0 ||
      metric.provisions !== 0;
    
    if (hasData) {
      nonZeroMetrics.push(metric);
    } else {
      zeroMetrics.push({ metric, index });
    }
  });
  
  // Always include all non-zero metrics (these are critical data points)
  const result = [...nonZeroMetrics];
  
  // Calculate how many zero points we can include
  const remainingSlots = targetPoints - nonZeroMetrics.length;
  
  if (remainingSlots > 0 && zeroMetrics.length > 0) {
    // Sample zero metrics evenly to fill remaining slots
    const step = Math.ceil(zeroMetrics.length / remainingSlots);
    for (let i = 0; i < zeroMetrics.length; i += step) {
      result.push(zeroMetrics[i].metric);
    }
  }
  
  // Sort by date to maintain chronological order
  result.sort((a, b) => a.date.localeCompare(b.date));
  
  return result;
}

/**
 * GET /api/groups/[groupCode]/analytics/graphs
 * Get daily transaction metrics for all clients in the group for the last 24 months
 * 
 * Returns:
 * - Daily aggregated metrics (Production, Adjustments, Disbursements, Billing)
 * - Based on WIPTransactions table aggregated across all clients in the group
 * - Time period: Last 24 months from current date
 */
export const GET = secureRoute.queryWithParams<{ groupCode: string }>({
  feature: Feature.ACCESS_CLIENTS,
  handler: async (request, { user, params }) => {
    const { groupCode } = params;
    
    // Get resolution parameter (default: standard, options: high, standard, low)
    const { searchParams } = new URL(request.url);
    const resolution = searchParams.get('resolution') || 'standard';
    const targetPoints = resolution === 'high' ? 365 : resolution === 'low' ? 60 : 120;

    // Check cache first
    const cacheKey = `${CACHE_PREFIXES.ANALYTICS}graphs:group:${groupCode}`;
    const cached = await cache.get<GraphDataResponse>(cacheKey);
    if (cached) {
      return NextResponse.json(successResponse(cached));
    }

    // Calculate date range first (no DB query needed)
    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - 24);

    // BATCH 1: Get group info, clients, and tasks in parallel
    const [groupInfo, clients, allTasks] = await Promise.all([
      prisma.client.findFirst({
        where: { groupCode },
        select: {
          groupCode: true,
          groupDesc: true,
        },
      }),
      prisma.client.findMany({
        where: { groupCode },
        select: { GSClientID: true },
        take: 10000, // Reasonable upper bound for group size
      }),
      prisma.task.findMany({
        where: {
          Client: {
            groupCode,
          },
        },
        select: { GSTaskID: true },
        take: 50000, // Generous limit for large groups
      }),
    ]);

    if (!groupInfo || clients.length === 0) {
      throw new AppError(404, 'Group not found or no clients', ErrorCodes.NOT_FOUND);
    }

    const clientIds = clients.map(client => client.GSClientID);
    const taskIds = allTasks.map(task => task.GSTaskID);

    // Log query parameters for debugging
    logger.info('Group graphs query started', {
      groupCode,
      clientCount: clients.length,
      taskCount: allTasks.length,
      dateRange: { startDate, endDate },
    });

    // Build where clauses for WIPTransactions
    // CRITICAL: Use OR clause to capture transactions linked via GSClientID OR GSTaskID
    // Some WIP transactions (especially billing fees) may only be linked via task, not client
    const wipWhereClause = taskIds.length > 0
      ? {
          OR: [
            { GSClientID: { in: clientIds } },
            { GSTaskID: { in: taskIds } },
          ],
          TranDate: {
            gte: startDate,
            lte: endDate,
          },
        }
      : {
          GSClientID: { in: clientIds },
          TranDate: {
            gte: startDate,
            lte: endDate,
          },
        };

    const openingWhereClause = taskIds.length > 0
      ? {
          OR: [
            { GSClientID: { in: clientIds } },
            { GSTaskID: { in: taskIds } },
          ],
          TranDate: {
            lt: startDate,
          },
        }
      : {
          GSClientID: { in: clientIds },
          TranDate: {
            lt: startDate,
          },
        };

    // BATCH 2: Fetch service line mappings and WIP transactions in parallel
    const [servLineToMasterMap, actualOpeningBalanceTransactions, actualTransactions] = await Promise.all([
      getServiceLineMappings(),
      prisma.wIPTransactions.findMany({
        where: openingWhereClause,
        select: {
          Amount: true,
          TType: true,
          TranType: true,
          TaskServLine: true,
          GSClientID: true, // For debugging
          GSTaskID: true, // For debugging
        },
        // Removed take limit - groups may have many transactions
      }),
      prisma.wIPTransactions.findMany({
        where: wipWhereClause,
        select: {
          TranDate: true,
          TType: true,
          TranType: true, // Needed for transaction categorization
          Amount: true,
          TaskServLine: true,
          GSClientID: true, // For debugging
          GSTaskID: true, // For debugging
        },
        orderBy: {
          TranDate: 'asc',
        },
        // Removed take limit - groups may have many transactions
      }),
    ]);

    // Log transaction counts by type for debugging
    const transactionsByType = actualTransactions.reduce((acc, txn) => {
      acc[txn.TType] = (acc[txn.TType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    logger.info('Group graphs transactions fetched', {
      groupCode,
      totalTransactions: actualTransactions.length,
      openingTransactions: actualOpeningBalanceTransactions.length,
      byType: transactionsByType,
      transactionsWithClientID: actualTransactions.filter(t => t.GSClientID).length,
      transactionsOnlyWithTaskID: actualTransactions.filter(t => !t.GSClientID && t.GSTaskID).length,
    });

    // Calculate opening WIP balance using actual data
    const openingBalances = calculateWIPBalances(actualOpeningBalanceTransactions);
    const openingWipBalance = openingBalances.netWip;

    // Helper function to aggregate transactions
    const aggregateTransactions = (txns: typeof actualTransactions, openingBalance: number = 0) => {
      const dailyMap = new Map<string, DailyMetrics>();
      let totalProduction = 0;
      let totalAdjustments = 0;
      let totalDisbursements = 0;
      let totalBilling = 0;
      let totalProvisions = 0;

      txns.forEach((txn, idx) => {
        const amount = txn.Amount || 0;
        const dateKey = txn.TranDate.toISOString().split('T')[0]; // YYYY-MM-DD
        
        // Get or create daily entry
        let daily = dailyMap.get(dateKey);
        if (!daily) {
          daily = {
            date: dateKey,
            production: 0,
            adjustments: 0,
            disbursements: 0,
            billing: 0,
            provisions: 0,
            wipBalance: 0,
          };
          dailyMap.set(dateKey, daily);
        }

        // Categorize using shared logic (same as profitability tab)
        // This ensures consistency between graphs and profitability data
        const category = categorizeTransaction(txn.TType, txn.TranType);

        if (category.isTime) {
          daily.production += amount;
          totalProduction += amount;
        } else if (category.isAdjustment) {
          daily.adjustments += amount;
          totalAdjustments += amount;
        } else if (category.isDisbursement) {
          daily.disbursements += amount;
          totalDisbursements += amount;
        } else if (category.isFee) {
          // NOW catches 'F', 'FEE', and any fee variants
          daily.billing += amount;
          totalBilling += amount;
        } else if (category.isProvision) {
          daily.provisions += amount;
          totalProvisions += amount;
        }
        // No default case needed - categorization is comprehensive
      });

      // Convert map to sorted array
      const sortedDailyMetrics = Array.from(dailyMap.values()).sort((a, b) => 
        a.date.localeCompare(b.date)
      );

      // Calculate cumulative WIP balance for each day
      // Start from opening balance (WIP balance at the beginning of the period)
      // WIP Balance = Opening Balance + Production + Adjustments + Disbursements + Provisions - Billing
      let cumulativeBalance = openingBalance;
      const dailyMetrics = sortedDailyMetrics.map((daily) => {
        const dailyWipChange = daily.production + daily.adjustments + daily.disbursements + daily.provisions - daily.billing;
        cumulativeBalance += dailyWipChange;
        return {
          ...daily,
          wipBalance: cumulativeBalance,
        };
      });

      return {
        dailyMetrics,
        summary: {
          totalProduction,
          totalAdjustments,
          totalDisbursements,
          totalBilling,
          totalProvisions,
          currentWipBalance: cumulativeBalance,
        },
      };
    };

    // Aggregate overall data with opening balance
    const overall = aggregateTransactions(actualTransactions, openingWipBalance);

    // Group transactions by Master Service Line
    const transactionsByMasterServiceLine = new Map<string, typeof actualTransactions>();
    actualTransactions.forEach((txn) => {
      const masterCode = servLineToMasterMap.get(txn.TaskServLine) || 'UNKNOWN';
      const existing = transactionsByMasterServiceLine.get(masterCode) || [];
      existing.push(txn);
      transactionsByMasterServiceLine.set(masterCode, existing);
    });

    // Aggregate by Master Service Line with opening balances
    const byMasterServiceLine: Record<string, ServiceLineGraphData> = {};
    transactionsByMasterServiceLine.forEach((txns, masterCode) => {
      // Calculate opening balance for this service line
      const slOpeningTransactions = actualOpeningBalanceTransactions.filter(
        txn => (servLineToMasterMap.get(txn.TaskServLine) || 'UNKNOWN') === masterCode
      );
      const slOpeningBalances = calculateWIPBalances(slOpeningTransactions);
      byMasterServiceLine[masterCode] = aggregateTransactions(txns, slOpeningBalances.netWip);
    });

    // Fetch Master Service Line names
    const masterServiceLines = await prisma.serviceLineMaster.findMany({
      where: {
        code: {
          in: Array.from(transactionsByMasterServiceLine.keys()).filter(code => code !== 'UNKNOWN'),
        },
      },
      select: {
        code: true,
        name: true,
      },
      take: 100,
    });

    // Apply downsampling to reduce payload size
    const downsampledOverall = {
      ...overall,
      dailyMetrics: downsampleDailyMetrics(overall.dailyMetrics, targetPoints),
    };
    
    const downsampledByMasterServiceLine: Record<string, ServiceLineGraphData> = {};
    Object.entries(byMasterServiceLine).forEach(([code, data]) => {
      downsampledByMasterServiceLine[code] = {
        ...data,
        dailyMetrics: downsampleDailyMetrics(data.dailyMetrics, targetPoints),
      };
    });

    const responseData: GraphDataResponse = {
      groupCode: groupInfo.groupCode,
      groupDesc: groupInfo.groupDesc,
      clientCount: clients.length,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      overall: downsampledOverall,
      byMasterServiceLine: downsampledByMasterServiceLine,
      masterServiceLines: masterServiceLines.map(msl => ({
        code: msl.code,
        name: msl.name,
      })),
    };

    // Cache for 10 minutes (600 seconds)
    await cache.set(cacheKey, responseData, 600);

    return NextResponse.json(successResponse(responseData));
  },
});

