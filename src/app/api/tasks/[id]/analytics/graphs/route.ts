import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { secureRoute, Feature } from '@/lib/api/secureRoute';
import { AppError, ErrorCodes } from '@/lib/utils/errorHandler';
import { successResponse, parseTaskId } from '@/lib/utils/apiUtils';
import { cache, CACHE_PREFIXES } from '@/lib/services/cache/CacheService';
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

interface TaskGraphData {
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

interface GraphDataResponse {
  taskId: number;
  GSTaskID: string;
  taskCode: string;
  taskDesc: string;
  startDate: string;
  endDate: string;
  data: TaskGraphData;
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
 * GET /api/tasks/[id]/analytics/graphs
 * Get daily transaction metrics for the last 24 months for a specific task
 * 
 * Returns:
 * - Daily aggregated metrics (Production, Adjustments, Disbursements, Billing, Provisions)
 * - Based on WIPTransactions table filtered by GSTaskID
 * - Time period: Last 24 months from current date (extended for tasks to capture older project data)
 */
export const GET = secureRoute.queryWithParams({
  feature: Feature.ACCESS_TASKS,
  taskIdParam: 'id',
  handler: async (request, { user, params }) => {
    // Parse and validate taskId
    const taskId = parseTaskId(params.id);
    
    // Validate query parameters
    const { searchParams } = new URL(request.url);
    const queryParams = GraphsQuerySchema.parse({
      resolution: searchParams.get('resolution') ?? undefined, // Convert null to undefined for Zod default to work
    });
    const targetPoints = queryParams.resolution === 'high' ? 365 : queryParams.resolution === 'low' ? 60 : 120;

    // Check cache first (before DB queries)
    const cacheKey = `${CACHE_PREFIXES.ANALYTICS}task-graphs:${taskId}:${queryParams.resolution}`;
    const cached = await cache.get<GraphDataResponse>(cacheKey);
    if (cached) {
      // Audit log for analytics access
      logger.info('Task analytics graphs accessed (cached)', {
        userId: user.id,
        taskId,
        taskCode: cached.taskCode,
        resolution: queryParams.resolution,
      });
      
      const response = NextResponse.json(successResponse(cached));
      response.headers.set('Cache-Control', 'no-store'); // User-specific analytics
      return response;
    }

    // Calculate date range - last 24 months for tasks (tasks have fewer transactions than groups/clients)
    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - 24);

    // Fetch task info first to get GSTaskID
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
      throw new AppError(404, 'Task not found', ErrorCodes.NOT_FOUND);
    }

    // PARALLEL QUERY BATCH: Fetch opening balance aggregates and current period transaction aggregates simultaneously
    // OPTIMIZATION: Use database aggregation for both opening balance AND period transactions
    const [openingBalanceAggregates, periodTransactionAggregates] = await Promise.all([
      prisma.wIPTransactions.groupBy({
        by: ['TType'],
        where: {
          GSTaskID: task.GSTaskID,
          TranDate: {
            lt: startDate,
          },
        },
        _sum: {
          Amount: true,
        },
      }),
      prisma.wIPTransactions.groupBy({
        by: ['TranDate', 'TType'],
        where: {
          GSTaskID: task.GSTaskID,
          TranDate: {
            gte: startDate,
            lte: endDate,
          },
        },
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
    logger.info('Task graphs aggregates fetched', {
      taskId: task.id,
      taskCode: task.TaskCode,
      periodAggregates: periodTransactionAggregates.length,
      openingAggregates: openingBalanceAggregates.length,
      dateRange: { startDate: startDate.toISOString(), endDate: endDate.toISOString() },
    });

    // Calculate opening WIP balance from aggregates (much faster than processing individual records)
    const openingWipBalance = calculateOpeningBalanceFromAggregates(openingBalanceAggregates);

    // Helper function to aggregate transactions from database aggregates
    const aggregateTransactions = (aggregates: typeof periodTransactionAggregates, openingBalance: number = 0): TaskGraphData => {
      // Group aggregates by date
      const dailyMap = new Map<string, {
        production: number;
        adjustments: number;
        disbursements: number;
        billing: number;
        provisions: number;
      }>();

      for (const agg of aggregates) {
        const dateKey = agg.TranDate.toISOString().split('T')[0] as string; // YYYY-MM-DD (always defined)
        
        if (!dailyMap.has(dateKey)) {
          dailyMap.set(dateKey, {
            production: 0,
            adjustments: 0,
            disbursements: 0,
            billing: 0,
            provisions: 0,
          });
        }
        
        const daily = dailyMap.get(dateKey)!;
        const amount = agg._sum.Amount || 0;
        
        // Categorize using shared logic (same as profitability tab)
        // This ensures consistency between graphs and profitability data
        const category = categorizeTransaction(agg.TType);

        if (category.isTime) {
          daily.production += amount;
        } else if (category.isAdjustment) {
          daily.adjustments += amount;
        } else if (category.isDisbursement) {
          daily.disbursements += amount;
        } else if (category.isFee) {
          // NOW catches 'F', 'FEE', and any fee variants
          daily.billing += amount;
        } else if (category.isProvision) {
          daily.provisions += amount;
        }
        // No default case needed - categorization is comprehensive
      }

      // Convert to sorted array with cumulative WIP balance
      const sortedDates = Array.from(dailyMap.keys()).sort();

      let cumulativeWIP = openingBalance;
      
      const dailyMetrics: DailyMetrics[] = sortedDates.map(date => {
        const daily = dailyMap.get(date)!;
        
        // Calculate WIP balance change
        // WIP increases with production, adjustments, disbursements, and provisions
        // WIP decreases with billing
        const wipChange = daily.production + daily.adjustments + daily.disbursements + daily.provisions - daily.billing;
        cumulativeWIP += wipChange;
        
        return {
          date,
          production: daily.production,
          adjustments: daily.adjustments,
          disbursements: daily.disbursements,
          billing: daily.billing,
          provisions: daily.provisions,
          wipBalance: cumulativeWIP,
        };
      });

      // Calculate summary totals
      const summary = dailyMetrics.reduce(
        (acc, day) => ({
          totalProduction: acc.totalProduction + day.production,
          totalAdjustments: acc.totalAdjustments + day.adjustments,
          totalDisbursements: acc.totalDisbursements + day.disbursements,
          totalBilling: acc.totalBilling + day.billing,
          totalProvisions: acc.totalProvisions + day.provisions,
          currentWipBalance: day.wipBalance, // Last value
        }),
        {
          totalProduction: 0,
          totalAdjustments: 0,
          totalDisbursements: 0,
          totalBilling: 0,
          totalProvisions: 0,
          currentWipBalance: openingBalance,
        }
      );

      // Downsample if needed
      const downsampledMetrics = downsampleDailyMetrics(dailyMetrics, targetPoints);

      return {
        dailyMetrics: downsampledMetrics,
        summary,
      };
    };

    // Aggregate all transactions
    const graphData = aggregateTransactions(periodTransactionAggregates, openingWipBalance);

    const responseData: GraphDataResponse = {
      taskId: task.id,
      GSTaskID: task.GSTaskID,
      taskCode: task.TaskCode,
      taskDesc: task.TaskDesc,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      data: graphData,
    };

    // Cache for 30 minutes (1800 seconds) - matches group analytics cache duration
    await cache.set(cacheKey, responseData, 1800);

    // Audit log for analytics access
    logger.info('Task analytics graphs generated', {
      userId: user.id,
      taskId: task.id,
      GSTaskID: task.GSTaskID,
      taskCode: task.TaskCode,
      resolution: queryParams.resolution,
      periodAggregateGroups: periodTransactionAggregates.length,
      openingAggregateGroups: openingBalanceAggregates.length,
      dateRange: { startDate: startDate.toISOString(), endDate: endDate.toISOString() },
    });

    const response = NextResponse.json(successResponse(responseData));
    response.headers.set('Cache-Control', 'no-store'); // User-specific analytics
    return response;
  },
});

