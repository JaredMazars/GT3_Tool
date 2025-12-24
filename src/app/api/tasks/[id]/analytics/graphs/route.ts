import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { secureRoute, Feature } from '@/lib/api/secureRoute';
import { AppError, ErrorCodes } from '@/lib/utils/errorHandler';
import { successResponse, parseTaskId } from '@/lib/utils/apiUtils';
import { cache, CACHE_PREFIXES } from '@/lib/services/cache/CacheService';
import { calculateWIPBalances, categorizeTransaction } from '@/lib/services/clients/clientBalanceCalculation';

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

/**
 * Downsample daily metrics to reduce payload size while maintaining visual fidelity
 * @param metrics Array of daily metrics
 * @param targetPoints Target number of data points (default: 120 for ~4 months of daily data)
 * @returns Downsampled array
 */
function downsampleDailyMetrics(metrics: DailyMetrics[], targetPoints: number = 120): DailyMetrics[] {
  if (metrics.length <= targetPoints) {
    return metrics;
  }
  
  const step = Math.ceil(metrics.length / targetPoints);
  const downsampled: DailyMetrics[] = [];
  
  for (let i = 0; i < metrics.length; i += step) {
    const metric = metrics[i];
    if (metric) {
      downsampled.push(metric);
    }
  }
  
  // Always include the last data point for accuracy
  const lastMetric = metrics[metrics.length - 1];
  if (lastMetric && downsampled[downsampled.length - 1] !== lastMetric) {
    downsampled.push(lastMetric);
  }
  
  return downsampled;
}

/**
 * GET /api/tasks/[id]/analytics/graphs
 * Get daily transaction metrics for the last 24 months for a specific task
 * 
 * Returns:
 * - Daily aggregated metrics (Production, Adjustments, Disbursements, Billing, Provisions)
 * - Based on WIPTransactions table filtered by GSTaskID
 * - Time period: Last 24 months from current date
 */
export const GET = secureRoute.queryWithParams({
  feature: Feature.ACCESS_TASKS,
  taskIdParam: 'id',
  handler: async (request, { user, params }) => {
    // Parse and validate taskId
    const taskId = parseTaskId(params.id);
    
    // Get resolution parameter (default: standard, options: high, standard, low)
    const { searchParams } = new URL(request.url);
    const resolution = searchParams.get('resolution') || 'standard';
    const targetPoints = resolution === 'high' ? 365 : resolution === 'low' ? 60 : 120;

    // Verify task exists
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

    // Check cache first
    const cacheKey = `${CACHE_PREFIXES.ANALYTICS}task-graphs:${taskId}`;
    const cached = await cache.get<GraphDataResponse>(cacheKey);
    if (cached) {
      return NextResponse.json(successResponse(cached));
    }

    // Calculate date range - last 24 months
    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - 24);

    // Fetch opening balance transactions (before the 24-month period)
    const openingBalanceTransactions = await prisma.wIPTransactions.findMany({
      where: {
        GSTaskID: task.GSTaskID,
        TranDate: {
          lt: startDate,
        },
      },
      select: {
        Amount: true,
        TType: true,
        TranType: true,
      },
      take: 50000, // Reasonable upper bound for opening balance calculation
    });

    // Calculate opening WIP balance
    const openingBalances = calculateWIPBalances(openingBalanceTransactions);
    const openingWipBalance = openingBalances.netWip;

    // Fetch all transactions within the date range
    const transactions = await prisma.wIPTransactions.findMany({
      where: {
        GSTaskID: task.GSTaskID,
        TranDate: {
          gte: startDate,
          lte: endDate,
        },
      },
      select: {
        TranDate: true,
        TType: true,
        TranType: true, // Needed for transaction categorization
        Amount: true,
      },
      orderBy: {
        TranDate: 'asc',
      },
      take: 50000, // Prevent unbounded queries - reasonable limit for 24 months of data
    });

    // Helper function to aggregate transactions by date
    const aggregateTransactions = (txns: typeof transactions, openingBalance: number = 0): TaskGraphData => {
      // Group transactions by date
      const dailyMap = new Map<string, {
        production: number;
        adjustments: number;
        disbursements: number;
        billing: number;
        provisions: number;
      }>();

      for (const txn of txns) {
        const dateKey = txn.TranDate.toISOString().split('T')[0] as string; // YYYY-MM-DD (always defined)
        
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
        const amount = txn.Amount || 0;
        
        // Categorize using shared logic (same as profitability tab)
        // This ensures consistency between graphs and profitability data
        const category = categorizeTransaction(txn.TType, txn.TranType);

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
        // WIP increases with production, adjustments, disbursements
        // WIP decreases with billing and provisions
        const wipChange = daily.production + daily.adjustments + daily.disbursements - daily.billing - daily.provisions;
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
    const graphData = aggregateTransactions(transactions, openingWipBalance);

    const responseData: GraphDataResponse = {
      taskId: task.id,
      GSTaskID: task.GSTaskID,
      taskCode: task.TaskCode,
      taskDesc: task.TaskDesc,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      data: graphData,
    };

    // Cache for 30 minutes (analytics TTL)
    await cache.set(cacheKey, responseData, 30 * 60);

    return NextResponse.json(successResponse(responseData));
  },
});

