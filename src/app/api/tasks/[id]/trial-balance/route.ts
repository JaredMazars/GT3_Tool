import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { parseTaskId, successResponse } from '@/lib/utils/apiUtils';
import { secureRoute, Feature } from '@/lib/api/secureRoute';
import { AppError, ErrorCodes } from '@/lib/utils/errorHandler';

/**
 * GET /api/tasks/[id]/trial-balance
 * Get trial balance data for a project
 */
export const GET = secureRoute.queryWithParams<{ id: string }>({
  feature: Feature.ACCESS_TASKS,
  handler: async (request, { user, params }) => {
    const taskId = parseTaskId(params.id);

    // Verify task exists
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      select: { id: true },
    });

    if (!task) {
      throw new AppError(404, 'Task not found', ErrorCodes.NOT_FOUND);
    }

    // Fetch all mapped accounts for this project
    const accounts = await prisma.mappedAccount.findMany({
      where: { taskId },
      orderBy: [
        { section: 'asc' },
        { accountCode: 'asc' },
        { id: 'asc' },
      ],
      select: {
        id: true,
        accountCode: true,
        accountName: true,
        balance: true,
        priorYearBalance: true,
        sarsItem: true,
        section: true,
        subsection: true,
      },
      take: 5000,
    });

    // Calculate totals
    const currentYearTotal = accounts.reduce((sum, acc) => sum + acc.balance, 0);
    const priorYearTotal = accounts.reduce((sum, acc) => sum + acc.priorYearBalance, 0);

    const trialBalanceData = {
      accounts,
      totals: {
        currentYear: currentYearTotal,
        priorYear: priorYearTotal,
      },
    };

    return NextResponse.json(successResponse(trialBalanceData));
  },
});
