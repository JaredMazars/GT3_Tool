import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { secureRoute, Feature } from '@/lib/api/secureRoute';
import { AppError, ErrorCodes } from '@/lib/utils/errorHandler';
import { successResponse, parseGSClientID } from '@/lib/utils/apiUtils';
import { cache, CACHE_PREFIXES } from '@/lib/services/cache/CacheService';
import { 
  aggregateDebtorsByServiceLine, 
  aggregateOverallDebtorData,
  DebtorMetrics 
} from '@/lib/services/analytics/debtorAggregation';

/**
 * GET /api/clients/[id]/debtors
 * Get aggregated debtor balances and recoverability metrics for a client
 * 
 * Returns:
 * - Overall debtor metrics (balance, aging, payment days)
 * - Debtor metrics grouped by Master Service Line
 * - Master Service Line information
 * - Transaction count
 * - Latest update timestamp
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
    const cacheKey = `${CACHE_PREFIXES.CLIENT}debtors:${GSClientID}`;
    const cached = await cache.get<Record<string, unknown>>(cacheKey);
    if (cached) {
      return NextResponse.json(successResponse(cached));
    }

    // Fetch debtor transactions and service line mappings in parallel
    const [debtorTransactions, serviceLineExternals] = await Promise.all([
      prisma.drsTransactions.findMany({
        where: { GSClientID },
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
      }),
      prisma.serviceLineExternal.findMany({
        select: {
          ServLineCode: true,
          masterCode: true,
        },
        take: 1000, // Reasonable limit for service line mappings
      }),
    ]);

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
      transactionCount: debtorTransactions.length,
      lastUpdated: latestDebtorTransaction?.updatedAt || null,
    };

    // Cache for 10 minutes (600 seconds)
    await cache.set(cacheKey, responseData, 600);

    return NextResponse.json(successResponse(responseData));
  },
});

