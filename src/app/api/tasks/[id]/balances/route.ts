import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { successResponse, parseTaskId } from '@/lib/utils/apiUtils';
import { secureRoute, Feature } from '@/lib/api/secureRoute';
import { AppError, ErrorCodes } from '@/lib/utils/errorHandler';

interface TaskBalances {
  taskId: number;
  GSTaskID: string;
  taskCode: string;
  taskDesc: string;
  time: number;
  timeAdjustments: number;
  disbursements: number;
  disbursementAdjustments: number;
  fees: number;
  provision: number;
  grossWip: number;
  netWip: number;
  lastUpdated: string | null;
}

const TTYPE_CATEGORIES = {
  TIME: ['T', 'TI', 'TIM'],
  DISBURSEMENT: ['D', 'DI', 'DIS'],
  FEE: ['F', 'FEE'],
  ADJUSTMENT: ['ADJ'],
  PROVISION: ['P', 'PRO'],
};

function categorizeTransaction(tType: string): {
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
 * GET /api/tasks/[id]/balances
 * Get WIP balances for a task with detailed breakdown
 */
export const GET = secureRoute.queryWithParams<{ id: string }>({
  feature: Feature.ACCESS_TASKS,
  handler: async (request, { user, params }) => {
    const taskId = parseTaskId(params.id);

    const task = await prisma.task.findUnique({
      where: { id: taskId },
      select: { id: true, GSTaskID: true, TaskCode: true, TaskDesc: true },
    });

    if (!task) {
      throw new AppError(404, 'Task not found', ErrorCodes.NOT_FOUND);
    }

    const wipTransactions = await prisma.wIPTransactions.findMany({
      where: { GSTaskID: task.GSTaskID },
      select: { Amount: true, TType: true, TranType: true, updatedAt: true },
      take: 50000,
    });

    let time = 0;
    let timeAdjustments = 0;
    let disbursements = 0;
    let disbursementAdjustments = 0;
    let fees = 0;
    let provision = 0;

    wipTransactions.forEach((transaction) => {
      const amount = transaction.Amount || 0;
      const category = categorizeTransaction(transaction.TType);
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

    const grossWip = time + timeAdjustments + disbursements + disbursementAdjustments - fees;
    const netWip = grossWip + provision;

    const latestTransaction = wipTransactions.length > 0
      ? wipTransactions.reduce((latest, current) =>
          current.updatedAt > latest.updatedAt ? current : latest
        )
      : null;

    const responseData: TaskBalances = {
      taskId: task.id,
      GSTaskID: task.GSTaskID,
      taskCode: task.TaskCode,
      taskDesc: task.TaskDesc,
      time,
      timeAdjustments,
      disbursements,
      disbursementAdjustments,
      fees,
      provision,
      grossWip,
      netWip,
      lastUpdated: latestTransaction?.updatedAt.toISOString() || null,
    };

    return NextResponse.json(successResponse(responseData));
  },
});
