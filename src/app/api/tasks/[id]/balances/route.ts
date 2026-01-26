import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { successResponse, parseTaskId } from '@/lib/utils/apiUtils';
import { secureRoute, Feature } from '@/lib/api/secureRoute';
import { AppError, ErrorCodes } from '@/lib/utils/errorHandler';
import { categorizeTransaction } from '@/lib/services/clients/clientBalanceCalculation';

interface TaskBalances {
  taskId: number;
  GSTaskID: string;
  taskCode: string;
  taskDesc: string;
  time: number;
  adjustments: number; // Single category for all adjustments
  disbursements: number;
  fees: number;
  provision: number;
  grossWip: number;
  netWip: number;
  lastUpdated: string | null;
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
      select: { Amount: true, TType: true, updatedAt: true },
      take: 50000,
    });

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

    const grossWip = time + adjustments + disbursements - fees;
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
      adjustments,
      disbursements,
      fees,
      provision,
      grossWip,
      netWip,
      lastUpdated: latestTransaction?.updatedAt.toISOString() || null,
    };

    return NextResponse.json(successResponse(responseData));
  },
});
