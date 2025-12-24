import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { secureRoute, Feature } from '@/lib/api/secureRoute';
import { AppError, ErrorCodes } from '@/lib/utils/errorHandler';
import { successResponse, parseGSClientID } from '@/lib/utils/apiUtils';
import { cache, CACHE_PREFIXES } from '@/lib/services/cache/CacheService';
import { getServiceLineMappings } from '@/lib/cache/staticDataCache';
import { calculateWIPBalances } from '@/lib/services/clients/clientBalanceCalculation';

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

/**
 * GET /api/clients/[id]/analytics/graphs
 * Get daily transaction metrics for the last 24 months
 * 
 * Returns:
 * - Daily aggregated metrics (Production, Adjustments, Disbursements, Billing)
 * - Based on WIPTransactions table
 * - Time period: Last 24 months from current date
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
    const cacheKey = `${CACHE_PREFIXES.ANALYTICS}graphs:${GSClientID}`;
    const cached = await cache.get<GraphDataResponse>(cacheKey);
    if (cached) {
      return NextResponse.json(successResponse(cached));
    }

    // Calculate date range - last 24 months
    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - 24);

    // Get all client tasks
    const clientTasks = await prisma.task.findMany({
      where: { GSClientID },
      select: { GSTaskID: true },
      take: 10000,
    });

    const taskIds = clientTasks.map(task => task.GSTaskID);

    // Build where clause for WIPTransactions
    const wipWhereClause = taskIds.length > 0
      ? {
          OR: [
            { GSClientID },
            { GSTaskID: { in: taskIds } },
          ],
          TranDate: {
            gte: startDate,
            lte: endDate,
          },
        }
      : {
          GSClientID,
          TranDate: {
            gte: startDate,
            lte: endDate,
          },
        };

    // Fetch opening balance transactions (before the 24-month period)
    const openingWhereClause = taskIds.length > 0
      ? {
          OR: [
            { GSClientID },
            { GSTaskID: { in: taskIds } },
          ],
          TranDate: {
            lt: startDate,
          },
        }
      : {
          GSClientID,
          TranDate: {
            lt: startDate,
          },
        };

    const openingBalanceTransactions = await prisma.wIPTransactions.findMany({
      where: openingWhereClause,
      select: {
        Amount: true,
        TType: true,
        TranType: true,
        TaskServLine: true,
      },
    });

    // Calculate opening WIP balance
    const openingBalances = calculateWIPBalances(openingBalanceTransactions);
    const openingWipBalance = openingBalances.netWip;

    // Fetch all transactions within the date range
    const transactions = await prisma.wIPTransactions.findMany({
      where: wipWhereClause,
      select: {
        TranDate: true,
        TType: true,
        Amount: true,
        TaskServLine: true,
      },
      orderBy: {
        TranDate: 'asc',
      },
    });

    // Get service line mappings
    const servLineToMasterMap = await getServiceLineMappings();

    // Helper function to aggregate transactions
    const aggregateTransactions = (txns: typeof transactions, openingBalance: number = 0) => {
      const dailyMap = new Map<string, DailyMetrics>();
      let totalProduction = 0;
      let totalAdjustments = 0;
      let totalDisbursements = 0;
      let totalBilling = 0;
      let totalProvisions = 0;

      txns.forEach((txn) => {
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

        // Categorize by TType
        const ttype = txn.TType.toUpperCase();
        switch (ttype) {
          case 'T':
            daily.production += amount;
            totalProduction += amount;
            break;
          case 'ADJ':
            daily.adjustments += amount;
            totalAdjustments += amount;
            break;
          case 'D':
            daily.disbursements += amount;
            totalDisbursements += amount;
            break;
          case 'F':
            daily.billing += amount;
            totalBilling += amount;
            break;
          case 'P':
            daily.provisions += amount;
            totalProvisions += amount;
            break;
          default:
            // Unknown types are ignored
            break;
        }
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
    const overall = aggregateTransactions(transactions, openingWipBalance);

    // Group transactions by Master Service Line
    const transactionsByMasterServiceLine = new Map<string, typeof transactions>();
    transactions.forEach((txn) => {
      const masterCode = servLineToMasterMap.get(txn.TaskServLine) || 'UNKNOWN';
      const existing = transactionsByMasterServiceLine.get(masterCode) || [];
      existing.push(txn);
      transactionsByMasterServiceLine.set(masterCode, existing);
    });

    // Aggregate by Master Service Line with opening balances
    const byMasterServiceLine: Record<string, ServiceLineGraphData> = {};
    transactionsByMasterServiceLine.forEach((txns, masterCode) => {
      // Calculate opening balance for this service line
      const slOpeningTransactions = openingBalanceTransactions.filter(
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

    const responseData: GraphDataResponse = {
      GSClientID: client.GSClientID,
      clientCode: client.clientCode,
      clientName: client.clientNameFull,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      overall,
      byMasterServiceLine,
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
