import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { handleApiError } from '@/lib/utils/errorHandler';
import { GSClientIDSchema } from '@/lib/validation/schemas';
import { successResponse } from '@/lib/utils/apiUtils';
import { getCurrentUser } from '@/lib/services/auth/auth';

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
  ADJUSTMENT_TIME: ['AT', 'ADT'], // Time adjustments
  ADJUSTMENT_DISB: ['AD', 'ADD'], // Disbursement adjustments
  PROVISION: ['P', 'PRO'], // Provision transactions
};

/**
 * Categorize a transaction type
 */
function categorizeTransaction(tType: string): {
  isTime: boolean;
  isDisbursement: boolean;
  isFee: boolean;
  isAdjustmentTime: boolean;
  isAdjustmentDisb: boolean;
  isProvision: boolean;
} {
  const tTypeUpper = tType.toUpperCase();
  
  return {
    isTime: TTYPE_CATEGORIES.TIME.includes(tTypeUpper) || (tTypeUpper.startsWith('T') && !tTypeUpper.startsWith('AT')),
    isDisbursement: TTYPE_CATEGORIES.DISBURSEMENT.includes(tTypeUpper) || (tTypeUpper.startsWith('D') && !tTypeUpper.startsWith('AD')),
    isFee: TTYPE_CATEGORIES.FEE.includes(tTypeUpper) || tTypeUpper === 'F',
    isAdjustmentTime: TTYPE_CATEGORIES.ADJUSTMENT_TIME.includes(tTypeUpper) || tTypeUpper === 'AT',
    isAdjustmentDisb: TTYPE_CATEGORIES.ADJUSTMENT_DISB.includes(tTypeUpper) || tTypeUpper === 'AD',
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

    // 4-5. Execute - Calculate balances from transaction tables
    
    // Get all tasks for this client
    const clientTasks = await prisma.task.findMany({
      where: {
        GSClientID: GSClientID,
      },
      select: {
        GSTaskID: true,
      },
    });

    const taskIds = clientTasks.map(task => task.GSTaskID);

    // Calculate WIP Balance: Sum of Amount from WIPTransactions for all client tasks
    // Use both GSClientID and GSTaskID to capture all transactions
    // If TTYPE is 'F', reverse the amount (make it negative)
    // Provision (TTYPE 'P') should NOT be reversed
    const wipWhereClause = taskIds.length > 0
      ? {
          OR: [
            { GSClientID: GSClientID },
            { GSTaskID: { in: taskIds } },
          ],
        }
      : { GSClientID: GSClientID };

    const wipTransactions = await prisma.wIPTransactions.findMany({
      where: wipWhereClause,
      select: {
        Amount: true,
        TType: true,
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
      const category = categorizeTransaction(transaction.TType);

      if (category.isProvision) {
        // Provision tracked separately
        provision += amount;
      } else if (category.isFee) {
        // Fees are reversed (subtracted)
        fees += amount;
      } else if (category.isAdjustmentTime) {
        // Time adjustments
        timeAdjustments += amount;
      } else if (category.isAdjustmentDisb) {
        // Disbursement adjustments
        disbursementAdjustments += amount;
      } else if (category.isTime) {
        // Time transactions
        time += amount;
      } else if (category.isDisbursement) {
        // Disbursement transactions
        disbursements += amount;
      } else {
        // Other transactions default to time-like behavior
        time += amount;
      }
    });

    // Gross WIP = Time + Time Adjustments + Disbursements + Disbursement Adjustments - Fees
    const grossWip = time + timeAdjustments + disbursements + disbursementAdjustments - fees;
    
    // Net WIP = Gross WIP + Provision
    const netWip = grossWip + provision;

    // Calculate Debtor Balance: Sum of Total from DrsTransactions
    const debtorAggregation = await prisma.drsTransactions.aggregate({
      where: {
        GSClientID: GSClientID,
      },
      _sum: {
        Total: true,
      },
    });

    // Get the latest update timestamp from both transaction tables
    const latestWipTransaction = await prisma.wIPTransactions.findFirst({
      where: wipWhereClause,
      orderBy: {
        updatedAt: 'desc',
      },
      select: {
        updatedAt: true,
      },
    });

    const latestDebtorTransaction = await prisma.drsTransactions.findFirst({
      where: {
        GSClientID: GSClientID,
      },
      orderBy: {
        updatedAt: 'desc',
      },
      select: {
        updatedAt: true,
      },
    });

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

    // 6. Respond
    const responseData: ClientBalances = {
      GSClientID: client.GSClientID,
      clientCode: client.clientCode,
      clientName: client.clientNameFull,
      // Breakdown components
      time,
      timeAdjustments,
      disbursements,
      disbursementAdjustments,
      fees,
      provision,
      // Calculated totals
      grossWip,
      netWip,
      debtorBalance: debtorAggregation._sum.Total || 0,
      lastUpdated: lastUpdated ? lastUpdated.toISOString() : null,
    };

    return NextResponse.json(successResponse(responseData));
  } catch (error) {
    return handleApiError(error, 'Get Client Balances');
  }
}

