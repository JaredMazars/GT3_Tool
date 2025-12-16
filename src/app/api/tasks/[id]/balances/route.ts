import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { handleApiError } from '@/lib/utils/errorHandler';
import { successResponse } from '@/lib/utils/apiUtils';
import { getCurrentUser } from '@/lib/services/auth/auth';

interface TaskBalances {
  taskId: number;
  GSTaskID: string;
  taskCode: string;
  taskDesc: string;
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
 * GET /api/tasks/[id]/balances
 * Get WIP balances for a task with detailed breakdown
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
    const taskId = parseInt(params.id, 10);

    if (isNaN(taskId)) {
      return NextResponse.json(
        { error: 'Invalid task ID format' },
        { status: 400 }
      );
    }

    // 3. Check Permission - verify task exists
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
      return NextResponse.json(
        { error: 'Task not found' },
        { status: 404 }
      );
    }

    // 4-5. Execute - Get all WIP transactions for this task
    const wipTransactions = await prisma.wIPTransactions.findMany({
      where: {
        GSTaskID: task.GSTaskID,
      },
      select: {
        Amount: true,
        TType: true,
        updatedAt: true,
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

    // Get the latest update timestamp
    const latestTransaction = wipTransactions.length > 0
      ? wipTransactions.reduce((latest, current) =>
          current.updatedAt > latest.updatedAt ? current : latest
        )
      : null;

    // 6. Respond
    const responseData: TaskBalances = {
      taskId: task.id,
      GSTaskID: task.GSTaskID,
      taskCode: task.TaskCode,
      taskDesc: task.TaskDesc,
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
      lastUpdated: latestTransaction?.updatedAt.toISOString() || null,
    };

    return NextResponse.json(successResponse(responseData));
  } catch (error) {
    return handleApiError(error, 'Get Task Balances');
  }
}
