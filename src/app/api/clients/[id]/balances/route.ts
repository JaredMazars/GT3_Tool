import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { secureRoute, Feature } from '@/lib/api/secureRoute';
import { AppError, ErrorCodes } from '@/lib/utils/errorHandler';
import { successResponse, parseGSClientID } from '@/lib/utils/apiUtils';
import { categorizeTransaction } from '@/lib/services/clients/clientBalanceCalculation';

interface ClientBalances {
  GSClientID: string;
  clientCode: string;
  clientName: string | null;
  // Breakdown components
  time: number;
  adjustments: number; // Single category for all adjustments
  disbursements: number;
  fees: number;
  provision: number;
  // Calculated totals
  grossWip: number;
  netWip: number;
  debtorBalance: number;
  lastUpdated: string | null;
}

/**
 * GET /api/clients/[id]/balances
 * Get WIP and Debtor balances for a client with detailed breakdown
 * 
 * Uses exact TType matching:
 * - Time: TType = 'T'
 * - Adjustments: TType = 'ADJ' (single category)
 * - Disbursements: TType = 'D'
 * - Fees: TType = 'F' (subtracted)
 * - Provision: TType = 'P'
 * 
 * Formula:
 * - Gross WIP = Time + Adjustments + Disbursements - Fees
 * - Net WIP = Gross WIP + Provision
 * - Debtor Balance: Sum of Total from DrsTransactions
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

    // Calculate WIP Balance: Sum of Amount from WIPTransactions for this client
    // Query by GSClientID only - all WIP transactions are properly linked to clients
    // Uses composite index: idx_wip_gsclientid_trandate_ttype for optimal performance
    const wipWhereClause = { GSClientID };

    const wipTransactions = await prisma.wIPTransactions.findMany({
      where: wipWhereClause,
      select: {
        Amount: true,
        TType: true,
      },
    });

    // Calculate balances using exact TType matching
    let time = 0;
    let adjustments = 0;
    let disbursements = 0;
    let fees = 0;
    let provision = 0;

    wipTransactions.forEach((transaction) => {
      const amount = transaction.Amount || 0;
      const category = categorizeTransaction(transaction.TType);

      if (category.isProvision) {
        provision += amount;
      } else if (category.isFee) {
        fees += amount;
      } else if (category.isAdjustment) {
        adjustments += amount;
      } else if (category.isTime) {
        time += amount;
      } else if (category.isDisbursement) {
        disbursements += amount;
      }
    });

    // Gross WIP = Time + Adjustments + Disbursements - Fees
    const grossWip = time + adjustments + disbursements - fees;
    
    // Net WIP = Gross WIP + Provision
    const netWip = grossWip + provision;

    // Run parallel queries for debtor aggregation and latest timestamps
    const [debtorAggregation, latestWipTransaction, latestDebtorTransaction] = await Promise.all([
      prisma.drsTransactions.aggregate({
        where: { GSClientID },
        _sum: { Total: true },
      }),
      prisma.wIPTransactions.findFirst({
        where: wipWhereClause,
        orderBy: { updatedAt: 'desc' },
        select: { updatedAt: true },
      }),
      prisma.drsTransactions.findFirst({
        where: { GSClientID },
        orderBy: { updatedAt: 'desc' },
        select: { updatedAt: true },
      }),
    ]);

    // Determine the most recent update
    let lastUpdated: Date | null = null;
    if (latestWipTransaction && latestDebtorTransaction) {
      lastUpdated = latestWipTransaction.updatedAt > latestDebtorTransaction.updatedAt
        ? latestWipTransaction.updatedAt
        : latestDebtorTransaction.updatedAt;
    } else if (latestWipTransaction) {
      lastUpdated = latestWipTransaction.updatedAt;
    } else if (latestDebtorTransaction) {
      lastUpdated = latestDebtorTransaction.updatedAt;
    }

    const responseData: ClientBalances = {
      GSClientID: client.GSClientID,
      clientCode: client.clientCode,
      clientName: client.clientNameFull,
      time,
      adjustments,
      disbursements,
      fees,
      provision,
      grossWip,
      netWip,
      debtorBalance: debtorAggregation._sum.Total || 0,
      lastUpdated: lastUpdated ? lastUpdated.toISOString() : null,
    };

    return NextResponse.json(successResponse(responseData));
  },
});

