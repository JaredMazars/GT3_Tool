import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { handleApiError } from '@/lib/utils/errorHandler';
import { successResponse } from '@/lib/utils/apiUtils';
import { getCurrentUser } from '@/lib/services/auth/auth';
import { 
  aggregateDebtorsByServiceLine, 
  aggregateOverallDebtorData,
  DebtorMetrics 
} from '@/lib/services/analytics/debtorAggregation';
import { cache, CACHE_PREFIXES } from '@/lib/services/cache/CacheService';

interface MasterServiceLineInfo {
  code: string;
  name: string;
}

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
export async function GET(
  request: NextRequest,
  { params }: { params: { groupCode: string } }
) {
  try {
    // 1. Authenticate
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Parse IDs
    const { groupCode } = params;

    if (!groupCode) {
      return NextResponse.json(
        { error: 'Group code is required' },
        { status: 400 }
      );
    }

    // 3. Check Permission
    const { checkFeature } = await import('@/lib/permissions/checkFeature');
    const { Feature } = await import('@/lib/permissions/features');
    const hasPermission = await checkFeature(user.id, Feature.VIEW_WIP_DATA);
    if (!hasPermission) {
      return NextResponse.json({ error: 'Forbidden - Insufficient permissions' }, { status: 403 });
    }

    // 4. Execute - Verify the group exists
    const groupInfo = await prisma.client.findFirst({
      where: { groupCode },
      select: {
        groupCode: true,
        groupDesc: true,
      },
    });

    if (!groupInfo) {
      return NextResponse.json(
        { error: 'Group not found' },
        { status: 404 }
      );
    }

    // Generate cache key
    const cacheKey = `${CACHE_PREFIXES.ANALYTICS}group-debtors:${groupCode}`;
    
    // Try cache first
    const cached = await cache.get(cacheKey);
    if (cached) {
      return NextResponse.json(successResponse(cached));
    }

    // Get all clients in this group (organization-wide)
    const clientsInGroup = await prisma.client.findMany({
      where: {
        groupCode,
      },
      select: {
        GSClientID: true,
      },
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

    // 4-5. Execute - Fetch debtor transactions for all clients in the group
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
    });

    // Get Service Line External mappings to Master Service Lines
    const serviceLineExternals = await prisma.serviceLineExternal.findMany({
      select: {
        ServLineCode: true,
        masterCode: true,
      },
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
  } catch (error) {
    return handleApiError(error, 'Get Group Debtors');
  }
}
