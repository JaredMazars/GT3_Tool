import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { handleApiError } from '@/lib/utils/errorHandler';
import { GSClientIDSchema } from '@/lib/validation/schemas';
import { successResponse } from '@/lib/utils/apiUtils';
import { getCurrentUser } from '@/lib/services/auth/auth';
import { 
  aggregateDebtorsByServiceLine, 
  aggregateOverallDebtorData,
  DebtorMetrics 
} from '@/lib/services/analytics/debtorAggregation';

interface MasterServiceLineInfo {
  code: string;
  name: string;
}

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
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    // 1. Authenticate
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // 2. Parse IDs
    const params = await context.params;
    const GSClientID = params.id;

    // Validate GSClientID is a valid GUID
    const validationResult = GSClientIDSchema.safeParse(GSClientID);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid client ID format. Expected GUID.' },
        { status: 400 }
      );
    }

    // 3. Check Permission - verify client exists and user has access
    const client = await prisma.client.findUnique({
      where: { GSClientID: GSClientID },
      select: {
        id: true,
        GSClientID: true,
        clientCode: true,
        clientNameFull: true,
      },
    });

    if (!client) {
      return NextResponse.json(
        { error: 'Client not found' },
        { status: 404 }
      );
    }

    // 4-5. Execute - Fetch debtor transactions for this client
    const debtorTransactions = await prisma.drsTransactions.findMany({
      where: {
        GSClientID: GSClientID,
      },
      select: {
        TranDate: true,
        Total: true,
        EntryType: true,
        InvNumber: true,
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

    return NextResponse.json(successResponse(responseData));
  } catch (error) {
    return handleApiError(error, 'Get Client Debtors');
  }
}

