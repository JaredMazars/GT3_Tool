import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { checkTaskAccess } from '@/lib/services/tasks/taskAuthorization';
import { successResponse, parseTaskId } from '@/lib/utils/apiUtils';
import { AppError, ErrorCodes } from '@/lib/utils/errorHandler';
import { toTaskId } from '@/types/branded';
import { secureRoute, Feature } from '@/lib/api/secureRoute';
import { budgetFeeSchema } from '@/lib/validation/schemas';
import { logger } from '@/lib/utils/logger';

/**
 * PUT /api/tasks/[id]/budget/fees/[feeId]
 * Update an existing budget fee
 */
export const PUT = secureRoute.mutationWithParams({
  feature: Feature.MANAGE_TASKS,
  schema: budgetFeeSchema,
  handler: async (request, { user, params, data }) => {
    const taskId = toTaskId(parseTaskId(params.id));
    const feeId = parseInt(params.feeId as string);

    if (isNaN(feeId) || feeId <= 0) {
      throw new AppError(400, 'Invalid fee ID', ErrorCodes.VALIDATION_ERROR);
    }

    // Check task access
    const accessResult = await checkTaskAccess(user.id, taskId, 'MANAGER');
    if (!accessResult.canAccess) {
      throw new AppError(403, 'Access denied', ErrorCodes.FORBIDDEN);
    }

    // Verify fee exists and belongs to task
    const existingFee = await prisma.taskBudgetFee.findUnique({
      where: { id: feeId },
      select: { taskId: true }
    });

    if (!existingFee) {
      throw new AppError(404, 'Fee not found', ErrorCodes.NOT_FOUND);
    }

    if (existingFee.taskId !== taskId) {
      throw new AppError(404, 'Fee not found for this task', ErrorCodes.NOT_FOUND);
    }

    // Update fee
    const fee = await prisma.taskBudgetFee.update({
      where: { id: feeId },
      data: {
        description: data.description,
        amount: data.amount,
        expectedDate: data.expectedDate
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

    logger.info('Budget fee updated', {
      taskId,
      feeId,
      userId: user.id
    });

    return NextResponse.json(successResponse({
      id: fee.id,
      description: fee.description,
      amount: parseFloat(fee.amount.toString()),
      expectedDate: fee.expectedDate.toISOString(),
      createdBy: fee.createdBy,
      createdAt: fee.createdAt.toISOString()
    }));
  }
});

/**
 * DELETE /api/tasks/[id]/budget/fees/[feeId]
 * Delete a budget fee
 */
export const DELETE = secureRoute.mutationWithParams({
  feature: Feature.MANAGE_TASKS,
  handler: async (request, { user, params }) => {
    const taskId = toTaskId(parseTaskId(params.id));
    const feeId = parseInt(params.feeId as string);

    if (isNaN(feeId) || feeId <= 0) {
      throw new AppError(400, 'Invalid fee ID', ErrorCodes.VALIDATION_ERROR);
    }

    // Check task access
    const accessResult = await checkTaskAccess(user.id, taskId, 'MANAGER');
    if (!accessResult.canAccess) {
      throw new AppError(403, 'Access denied', ErrorCodes.FORBIDDEN);
    }

    // Verify fee exists and belongs to task
    const existingFee = await prisma.taskBudgetFee.findUnique({
      where: { id: feeId },
      select: { taskId: true }
    });

    if (!existingFee) {
      throw new AppError(404, 'Fee not found', ErrorCodes.NOT_FOUND);
    }

    if (existingFee.taskId !== taskId) {
      throw new AppError(404, 'Fee not found for this task', ErrorCodes.NOT_FOUND);
    }

    // Delete fee
    await prisma.taskBudgetFee.delete({
      where: { id: feeId }
    });

    logger.info('Budget fee deleted', {
      taskId,
      feeId,
      userId: user.id
    });

    return NextResponse.json(successResponse({ deleted: true }));
  }
});
