import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { secureRoute, Feature } from '@/lib/api/secureRoute';
import { AppError, ErrorCodes } from '@/lib/utils/errorHandler';
import { successResponse, parseGSClientID } from '@/lib/utils/apiUtils';
import { cache, CACHE_PREFIXES } from '@/lib/services/cache/CacheService';
import { getServiceLineMappings } from '@/lib/cache/staticDataCache';
import { calculateWIPBalances, categorizeTransaction } from '@/lib/services/clients/clientBalanceCalculation';
import { calculateOpeningBalanceFromAggregates } from '@/lib/services/analytics/openingBalanceCalculator';
import { logger } from '@/lib/utils/logger';
import { z } from 'zod';

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
  GSClientID: string;
  clientCode: string;
  clientName: string | null;
  startDate: string;
  endDate: string;
  overall: ServiceLineGraphData;
  byMasterServiceLine: Record<string, ServiceLineGraphData>;
  masterServiceLines: MasterServiceLineInfo[];
}

// Query parameter validation schema
const GraphsQuerySchema = z.object({
  resolution: z.enum(['high', 'standard', 'low']).optional().default('low'), // Changed to 'low' for better performance
});

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
      const zeroMetric = zeroMetrics[i];
      if (zeroMetric) {
        result.push(zeroMetric.metric);
      }
    }
  }
  
  // Sort by date to maintain chronological order
  result.sort((a, b) => a.date.localeCompare(b.date));
  
  return result;
}

/**
 * GET /api/clients/[id]/analytics/graphs
 * Get daily transaction metrics for the last 12 months
 * 
 * Returns:
 * - Daily aggregated metrics (Production, Adjustments, Disbursements, Billing)
 * - Based on WIPTransactions table
 * - Time period: Last 12 months from current date
 */
export const GET = secureRoute.queryWithParams({
  feature: Feature.ACCESS_CLIENTS,
  handler: async (request, { user, params }) => {
    // Parse and validate GSClientID
    const GSClientID = parseGSClientID(params.id);
    
    // Validate query parameters
    const { searchParams } = new URL(request.url);
    const queryParams = GraphsQuerySchema.parse({
      resolution: searchParams.get('resolution') ?? undefined, // Convert null to undefined for Zod default to work
    });
    const targetPoints = queryParams.resolution === 'high' ? 365 : queryParams.resolution === 'low' ? 60 : 120;

    // Check cache first (before DB queries)
    const cacheKey = `${CACHE_PREFIXES.ANALYTICS}graphs:${GSClientID}:${queryParams.resolution}`;
    const cached = await cache.get<GraphDataResponse>(cacheKey);
    if (cached) {
      // Audit log for analytics access
      logger.info('Client analytics graphs accessed (cached)', {
        userId: user.id,
        GSClientID,
        resolution: queryParams.resolution,
      });
      
      const response = NextResponse.json(successResponse(cached));
      response.headers.set('Cache-Control', 'no-store'); // User-specific analytics
      return response;
    }

    // Calculate date range - last 12 months (reduced from 24 for performance)
    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - 12);

    // PARALLEL QUERY BATCH: Fetch client and service line mappings simultaneously
    const [client, servLineToMasterMap] = await Promise.all([
      prisma.client.findUnique({
        where: { GSClientID },
        select: {
          id: true,
          GSClientID: true,
          clientCode: true,
          clientNameFull: true,
        },
      }),
      getServiceLineMappings(),
    ]);

    if (!client) {
      throw new AppError(404, 'Client not found', ErrorCodes.NOT_FOUND);
    }

    // Build where clause for WIPTransactions
    // Query by GSClientID only - all WIP transactions are properly linked to clients
    // Uses composite index: idx_wip_gsclientid_trandate_ttype for optimal performance
    const wipWhereClause = {
      GSClientID,
      TranDate: {
        gte: startDate,
        lte: endDate,
      },
    };

    // Fetch opening balance transactions (before the 12-month period)
    const openingWhereClause = {
      GSClientID,
      TranDate: {
        lt: startDate,
      },
    };

    // PARALLEL QUERY BATCH: Fetch opening balance aggregates and current period transaction aggregates simultaneously
    // OPTIMIZATION: Use database aggregation for both opening balance AND period transactions
    const [openingBalanceAggregates, periodTransactionAggregates] = await Promise.all([
      prisma.wIPTransactions.groupBy({
        by: ['TType', 'TaskServLine'],
        where: openingWhereClause,
        _sum: {
          Amount: true,
        },
      }),
      prisma.wIPTransactions.groupBy({
        by: ['TranDate', 'TType', 'TaskServLine'],
        where: wipWhereClause,
        _sum: {
          Amount: true,
        },
        orderBy: {
          TranDate: 'asc',
        },
        // No take limit needed - aggregating by day/type, not individual transactions
      }),
    ]);

    // Log aggregate counts for debugging
    logger.info('Client graphs aggregates fetched', {
      GSClientID,
      clientCode: client.clientCode,
      periodAggregates: periodTransactionAggregates.length,
      openingAggregates: openingBalanceAggregates.length,
      dateRange: { startDate: startDate.toISOString(), endDate: endDate.toISOString() },
    });

    // Group opening balance aggregates by Master Service Line
    const openingAggregatesByMasterServiceLine = new Map<string, typeof openingBalanceAggregates>();
    openingBalanceAggregates.forEach((agg) => {
      const masterCode = servLineToMasterMap.get(agg.TaskServLine) || 'UNKNOWN';
      const existing = openingAggregatesByMasterServiceLine.get(masterCode) || [];
      existing.push(agg);
      openingAggregatesByMasterServiceLine.set(masterCode, existing);
    });

    // Calculate opening WIP balance per service line
    const openingBalancesByServiceLine = new Map<string, number>();
    openingAggregatesByMasterServiceLine.forEach((aggs, masterCode) => {
      openingBalancesByServiceLine.set(masterCode, calculateOpeningBalanceFromAggregates(aggs));
    });

    // Calculate overall opening WIP balance from all aggregates
    const openingWipBalance = calculateOpeningBalanceFromAggregates(openingBalanceAggregates);

    // Helper function to aggregate transactions from database aggregates
    const aggregateTransactions = (aggregates: typeof periodTransactionAggregates, openingBalance: number = 0) => {
      const dailyMap = new Map<string, DailyMetrics>();
      let totalProduction = 0;
      let totalAdjustments = 0;
      let totalDisbursements = 0;
      let totalBilling = 0;
      let totalProvisions = 0;

      aggregates.forEach((agg) => {
        const amount = agg._sum.Amount || 0;
        const dateKey = agg.TranDate.toISOString().split('T')[0] as string; // YYYY-MM-DD (always defined)
        
        // Get or create daily entry
        if (!dailyMap.has(dateKey)) {
          dailyMap.set(dateKey, {
            date: dateKey,
            production: 0,
            adjustments: 0,
            disbursements: 0,
            billing: 0,
            provisions: 0,
            wipBalance: 0,
          });
        }
        
        const daily = dailyMap.get(dateKey)!; // Safe to assert - we just created it if it didn't exist

        // Categorize using exact TType matching
        const category = categorizeTransaction(agg.TType);

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
    const overall = aggregateTransactions(periodTransactionAggregates, openingWipBalance);

    // Group aggregates by Master Service Line
    const aggregatesByMasterServiceLine = new Map<string, typeof periodTransactionAggregates>();
    periodTransactionAggregates.forEach((agg) => {
      const masterCode = servLineToMasterMap.get(agg.TaskServLine) || 'UNKNOWN';
      const existing = aggregatesByMasterServiceLine.get(masterCode) || [];
      existing.push(agg);
      aggregatesByMasterServiceLine.set(masterCode, existing);
    });

    // Aggregate by Master Service Line with service-line-specific opening balances
    const byMasterServiceLine: Record<string, ServiceLineGraphData> = {};
    aggregatesByMasterServiceLine.forEach((aggs, masterCode) => {
      const serviceLineOpeningBalance = openingBalancesByServiceLine.get(masterCode) || 0;
      byMasterServiceLine[masterCode] = aggregateTransactions(aggs, serviceLineOpeningBalance);
    });

    // Fetch Master Service Line names
    const masterServiceLines = await prisma.serviceLineMaster.findMany({
      where: {
        code: {
          in: Array.from(aggregatesByMasterServiceLine.keys()).filter(code => code !== 'UNKNOWN'),
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
      GSClientID: client.GSClientID,
      clientCode: client.clientCode,
      clientName: client.clientNameFull,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      overall: downsampledOverall,
      byMasterServiceLine: downsampledByMasterServiceLine,
      masterServiceLines: masterServiceLines.map(msl => ({
        code: msl.code,
        name: msl.name,
      })),
    };

    // Cache for 2 hours (7200 seconds) - increased for better performance
    await cache.set(cacheKey, responseData, 7200);

    // Audit log for analytics access
    logger.info('Client analytics graphs generated', {
      userId: user.id,
      GSClientID: client.GSClientID,
      clientCode: client.clientCode,
      resolution: queryParams.resolution,
      periodAggregateGroups: periodTransactionAggregates.length,
      dateRange: { startDate: startDate.toISOString(), endDate: endDate.toISOString() },
    });

    const response = NextResponse.json(successResponse(responseData));
    response.headers.set('Cache-Control', 'no-store'); // User-specific analytics
    return response;
  },
});
