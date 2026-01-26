import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { checkTaskAccess } from '@/lib/services/tasks/taskAuthorization';
import { successResponse, parseTaskId } from '@/lib/utils/apiUtils';
import { AppError, ErrorCodes } from '@/lib/utils/errorHandler';
import { toTaskId } from '@/types/branded';
import { secureRoute, Feature } from '@/lib/api/secureRoute';
import { budgetDisbursementSchema } from '@/lib/validation/schemas';
import { logger } from '@/lib/utils/logger';

/**
 * POST /api/tasks/[id]/budget/disbursements
 * Create a new budget disbursement
 */
export const POST = secureRoute.mutationWithParams({
  feature: Feature.MANAGE_TASKS,
  schema: budgetDisbursementSchema,
  handler: async (request, { user, params, data }) => {
    const taskId = toTaskId(parseTaskId(params.id));

    // Check task access
    const accessResult = await checkTaskAccess(user.id, taskId, 'MANAGER');
    if (!accessResult.canAccess) {
      throw new AppError(403, 'Access denied', ErrorCodes.FORBIDDEN);
    }

    // Verify task exists
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      select: { id: true, TaskDesc: true }
    });

    if (!task) {
      throw new AppError(404, 'Task not found', ErrorCodes.NOT_FOUND);
    }

    // Create disbursement
    const disbursement = await prisma.taskBudgetDisbursement.create({
      data: {
        taskId,
        description: data.description,
        amount: data.amount,
        expectedDate: data.expectedDate,
        createdBy: user.id,
        updatedAt: new Date()
      },
      select: {
        id: true,
        description: true,
        amount: true,
        expectedDate: true,
        createdBy: true,
        createdAt: true
      }
    });

    logger.info('Budget disbursement created', {
      taskId,
      disbursementId: disbursement.id,
      userId: user.id
    });

    return NextResponse.json(successResponse({
      id: disbursement.id,
      description: disbursement.description,
      amount: parseFloat(disbursement.amount.toString()),
      expectedDate: disbursement.expectedDate.toISOString(),
      createdBy: disbursement.createdBy,
      createdAt: disbursement.createdAt.toISOString()
    }));
  }
});
