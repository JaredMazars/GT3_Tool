import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { AppError, ErrorCodes } from '@/lib/utils/errorHandler';
import { successResponse } from '@/lib/utils/apiUtils';
import { 
  aggregateDebtorsByServiceLine, 
  aggregateOverallDebtorData,
  DebtorMetrics 
} from '@/lib/services/analytics/debtorAggregation';
import { cache, CACHE_PREFIXES } from '@/lib/services/cache/CacheService';
import { secureRoute, Feature } from '@/lib/api/secureRoute';

/**
 * GET /api/groups/[groupCode]/debtors
 * Get aggregated debtor balances and recoverability metrics for a group
 * 
 * Returns:
 * - Overall debtor metrics (balance, aging, payment days)
 * - Debtor metrics grouped by Master Service Line
 * - Master Service Line information
 * - Transaction count
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
    const cacheKey = `${CACHE_PREFIXES.ANALYTICS}group-debtors:${groupCode}`;
    
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
          overall: {
            totalBalance: 0,
            aging: {
              current: 0,
              days31_60: 0,
              days61_90: 0,
              days91_120: 0,
              days120Plus: 0,
            },
            avgPaymentDaysPaid: null,
            avgPaymentDaysOutstanding: 0,
            transactionCount: 0,
            invoiceCount: 0,
          },
          byMasterServiceLine: {},
          masterServiceLines: [],
          transactionCount: 0,
          lastUpdated: null,
        })
      );
    }

    // Fetch debtor transactions for all clients in the group (limited to 50000)
    const debtorTransactions = await prisma.drsTransactions.findMany({
      where: {
        GSClientID: {
          in: GSClientIDs,
        },
      },
      select: {
        TranDate: true,
        Total: true,
        EntryType: true,
        InvNumber: true,
        Reference: true,
        Narration: true,
        ServLineCode: true,
        updatedAt: true,
      },
      take: 50000,
    });

    // Get Service Line External mappings to Master Service Lines
    const serviceLineExternals = await prisma.serviceLineExternal.findMany({
      select: {
        ServLineCode: true,
        masterCode: true,
      },
      take: 1000,
    });

    // Create a map of ServLineCode to masterCode
    const servLineToMasterMap = new Map<string, string>();
    serviceLineExternals.forEach((sl) => {
      if (sl.ServLineCode && sl.masterCode) {
        servLineToMasterMap.set(sl.ServLineCode, sl.masterCode);
      }
    });

    // Aggregate debtor transactions by Master Service Line
    const groupedData = aggregateDebtorsByServiceLine(
      debtorTransactions,
      servLineToMasterMap
    );

    // Calculate overall totals
    const overall = aggregateOverallDebtorData(debtorTransactions);

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

    // Convert grouped data to response format
    const byMasterServiceLine: Record<string, DebtorMetrics> = {};
    groupedData.forEach((data, masterCode) => {
      byMasterServiceLine[masterCode] = data;
    });

    // Get the latest update timestamp from transactions
    const latestDebtorTransaction = debtorTransactions.length > 0
      ? debtorTransactions.reduce((latest, current) =>
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
      transactionCount: debtorTransactions.length,
      lastUpdated: latestDebtorTransaction?.updatedAt || null,
    };

    // Cache for 10 minutes (600 seconds)
    await cache.set(cacheKey, responseData, 600);

    return NextResponse.json(successResponse(responseData));
  },
});
