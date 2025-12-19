import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { secureRoute, Feature } from '@/lib/api/secureRoute';
import { AppError, ErrorCodes } from '@/lib/utils/errorHandler';
import { successResponse, parseGSClientID } from '@/lib/utils/apiUtils';
import { cache, CACHE_PREFIXES } from '@/lib/services/cache/CacheService';

interface ClientBalances {
  GSClientID: string;
  clientCode: string;
  clientName: string | null;
  // Breakdown components
  time: number;
  timeAdjustments: number;
  disbursements: number;
  disbursementAdjustments: number;
  fees: number;
  provision: number;
  // Calculated totals
  grossWip: number;
  netWip: number;
  debtorBalance: number;
  lastUpdated: string | null;
}

/**
 * Transaction Type Classification
 */
const TTYPE_CATEGORIES = {
  TIME: ['T', 'TI', 'TIM'], // Time transactions
  DISBURSEMENT: ['D', 'DI', 'DIS'], // Disbursement transactions
  FEE: ['F', 'FEE'], // Fee transactions (reversed)
  ADJUSTMENT: ['ADJ'], // Adjustment transactions (differentiated by TranType)
  PROVISION: ['P', 'PRO'], // Provision transactions
};

/**
 * Categorize a transaction type
 */
function categorizeTransaction(tType: string, tranType?: string): {
  isTime: boolean;
  isDisbursement: boolean;
  isFee: boolean;
  isAdjustment: boolean;
  isProvision: boolean;
} {
  const tTypeUpper = tType.toUpperCase();
  
  return {
    isTime: TTYPE_CATEGORIES.TIME.includes(tTypeUpper) || (tTypeUpper.startsWith('T') && tTypeUpper !== 'ADJ'),
    isDisbursement: TTYPE_CATEGORIES.DISBURSEMENT.includes(tTypeUpper) || (tTypeUpper.startsWith('D') && tTypeUpper !== 'ADJ'),
    isFee: TTYPE_CATEGORIES.FEE.includes(tTypeUpper) || tTypeUpper === 'F',
    isAdjustment: TTYPE_CATEGORIES.ADJUSTMENT.includes(tTypeUpper) || tTypeUpper === 'ADJ',
    isProvision: TTYPE_CATEGORIES.PROVISION.includes(tTypeUpper) || tTypeUpper === 'P',
  };
}

/**
 * GET /api/clients/[id]/balances
 * Get WIP and Debtor balances for a client with detailed breakdown
 * 
 * Returns:
 * Breakdown Components:
 * - Time: Sum of time transactions (TTYPE 'T', 'TI', 'TIM')
 * - Time Adjustments: Sum of time adjustments (TTYPE 'AT', 'ADT')
 * - Disbursements: Sum of disbursements (TTYPE 'D', 'DI', 'DIS')
 * - Disbursement Adjustments: Sum of disbursement adjustments (TTYPE 'AD', 'ADD')
 * - Fees: Sum of fees (TTYPE 'F') - reversed/subtracted
 * - Provision: Sum of provisions (TTYPE 'P')
 * 
 * Calculated Totals:
 * - Gross WIP: Time + Time Adj + Disbursements + Disb Adj - Fees
 * - Net WIP: Gross WIP + Provision
 * - Debtor Balance: Sum of Total from DrsTransactions
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

    // Generate cache key
    const cacheKey = `${CACHE_PREFIXES.CLIENT}balances:${GSClientID}`;
    
    // Try cache first
    const cached = await cache.get<ClientBalances>(cacheKey);
    if (cached) {
      return NextResponse.json(successResponse(cached));
    }

    // Get all tasks for this client
    const clientTasks = await prisma.task.findMany({
      where: { GSClientID },
      select: { GSTaskID: true },
      take: 10000, // Reasonable limit for client tasks
    });

    const taskIds = clientTasks.map(task => task.GSTaskID);

    // Calculate WIP Balance: Sum of Amount from WIPTransactions for all client tasks
    const wipWhereClause = taskIds.length > 0
      ? {
          OR: [
            { GSClientID },
            { GSTaskID: { in: taskIds } },
          ],
        }
      : { GSClientID };

    const wipTransactions = await prisma.wIPTransactions.findMany({
      where: wipWhereClause,
      select: {
        Amount: true,
        TType: true,
        TranType: true,
      },
    });

    // Calculate balances with detailed breakdown
    let time = 0;
    let timeAdjustments = 0;
    let disbursements = 0;
    let disbursementAdjustments = 0;
    let fees = 0;
    let provision = 0;

    wipTransactions.forEach((transaction) => {
      const amount = transaction.Amount || 0;
      const category = categorizeTransaction(transaction.TType, transaction.TranType);
      const tranTypeUpper = transaction.TranType.toUpperCase();

      if (category.isProvision) {
        provision += amount;
      } else if (category.isFee) {
        fees += amount;
      } else if (category.isAdjustment) {
        if (tranTypeUpper.includes('TIME')) {
          timeAdjustments += amount;
        } else if (tranTypeUpper.includes('DISBURSEMENT') || tranTypeUpper.includes('DISB')) {
          disbursementAdjustments += amount;
        }
      } else if (category.isTime) {
        time += amount;
      } else if (category.isDisbursement) {
        disbursements += amount;
      } else {
        time += amount;
      }
    });

    // Gross WIP = Time + Time Adjustments + Disbursements + Disbursement Adjustments - Fees
    const grossWip = time + timeAdjustments + disbursements + disbursementAdjustments - fees;
    
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
      timeAdjustments,
      disbursements,
      disbursementAdjustments,
      fees,
      provision,
      grossWip,
      netWip,
      debtorBalance: debtorAggregation._sum.Total || 0,
      lastUpdated: lastUpdated ? lastUpdated.toISOString() : null,
    };

    // Cache for 10 minutes (600 seconds)
    await cache.set(cacheKey, responseData, 600);

    return NextResponse.json(successResponse(responseData));
  },
});

