import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db/prisma';
import { successResponse, parseTaskId } from '@/lib/utils/apiUtils';
import { getCarlPartnerCodes } from '@/lib/cache/staticDataCache';
import { secureRoute, Feature } from '@/lib/api/secureRoute';
import { AppError, ErrorCodes } from '@/lib/utils/errorHandler';

// Maximum transactions per page to prevent memory issues
const MAX_PAGE_SIZE = 500;
const DEFAULT_PAGE_SIZE = 100;

const TransactionsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE),
}).strict();

/**
 * GET /api/tasks/[id]/transactions
 * Get WIP transactions for a task with standard fields for transaction details modal
 * 
 * Query params:
 * - page: Page number (default 1)
 * - limit: Items per page (default 100, max 500)
 * 
 * Returns:
 * - Task information
 * - Array of WIP transactions with standard fields
 * - Pagination metadata
 */
export const GET = secureRoute.queryWithParams<{ id: string }>({
  feature: Feature.ACCESS_TASKS,
  handler: async (request, { user, params }) => {
    const taskId = parseTaskId(params.id);

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
      throw new AppError(404, 'Task not found', ErrorCodes.NOT_FOUND);
    }

    // Parse and validate query parameters
    const { searchParams } = new URL(request.url);
    const queryResult = TransactionsQuerySchema.safeParse({
      page: searchParams.get('page') ?? undefined,
      limit: searchParams.get('limit') ?? undefined,
    });

    if (!queryResult.success) {
      throw new AppError(400, 'Invalid query parameters', ErrorCodes.VALIDATION_ERROR);
    }

    const { page, limit } = queryResult.data;
    const skip = (page - 1) * limit;

    // Get CARL partner employee codes from cache
    const carlPartnerCodes = await getCarlPartnerCodes();

    // Fetch WIP transactions with pagination
    const [transactions, total] = await Promise.all([
      prisma.wIPTransactions.findMany({
        where: {
          GSTaskID: task.GSTaskID,
        },
        select: {
          id: true,
          GSWIPTransID: true,
          TranDate: true,
          TranType: true,
          TType: true,
          EmpCode: true,
          EmpName: true,
          Amount: true,
          Cost: true,
          Hour: true,
          Ref: true,
          Narr: true,
          OfficeCode: true,
          TaskServLine: true,
        },
        orderBy: [
          { TranDate: 'desc' },
          { id: 'desc' },
        ],
        skip,
        take: limit,
      }),
      prisma.wIPTransactions.count({
        where: {
          GSTaskID: task.GSTaskID,
        },
      }),
    ]);

    // Map transactions and zero out CARL partner costs
    const responseData = {
      taskId: task.id,
      taskCode: task.TaskCode,
      taskDesc: task.TaskDesc,
      transactions: transactions.map(txn => ({
        id: txn.id,
        GSWIPTransID: txn.GSWIPTransID,
        tranDate: txn.TranDate,
        tranType: txn.TranType,
        tType: txn.TType,
        empCode: txn.EmpCode,
        empName: txn.EmpName,
        amount: txn.Amount,
        cost: txn.EmpCode && carlPartnerCodes.has(txn.EmpCode) ? 0 : txn.Cost,
        hour: txn.Hour,
        ref: txn.Ref,
        narr: txn.Narr,
        officeCode: txn.OfficeCode,
        taskServLine: txn.TaskServLine,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };

    return NextResponse.json(successResponse(responseData));
  },
});



















