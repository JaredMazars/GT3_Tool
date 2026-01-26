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
 * PUT /api/tasks/[id]/budget/disbursements/[disbursementId]
 * Update an existing budget disbursement
 */
export const PUT = secureRoute.mutationWithParams({
  feature: Feature.MANAGE_TASKS,
  schema: budgetDisbursementSchema,
  handler: async (request, { user, params, data }) => {
    const taskId = toTaskId(parseTaskId(params.id));
    const disbursementId = parseInt(params.disbursementId as string);

    if (isNaN(disbursementId) || disbursementId <= 0) {
      throw new AppError(400, 'Invalid disbursement ID', ErrorCodes.VALIDATION_ERROR);
    }

    // Check task access
    const accessResult = await checkTaskAccess(user.id, taskId, 'MANAGER');
    if (!accessResult.canAccess) {
      throw new AppError(403, 'Access denied', ErrorCodes.FORBIDDEN);
    }

    // Verify disbursement exists and belongs to task
    const existingDisbursement = await prisma.taskBudgetDisbursement.findUnique({
      where: { id: disbursementId },
      select: { taskId: true }
    });

    if (!existingDisbursement) {
      throw new AppError(404, 'Disbursement not found', ErrorCodes.NOT_FOUND);
    }

    if (existingDisbursement.taskId !== taskId) {
      throw new AppError(404, 'Disbursement not found for this task', ErrorCodes.NOT_FOUND);
    }

    // Update disbursement
    const disbursement = await prisma.taskBudgetDisbursement.update({
      where: { id: disbursementId },
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

    logger.info('Budget disbursement updated', {
      taskId,
      disbursementId,
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

/**
 * DELETE /api/tasks/[id]/budget/disbursements/[disbursementId]
 * Delete a budget disbursement
 */
export const DELETE = secureRoute.mutationWithParams({
  feature: Feature.MANAGE_TASKS,
  handler: async (request, { user, params }) => {
    const taskId = toTaskId(parseTaskId(params.id));
    const disbursementId = parseInt(params.disbursementId as string);

    if (isNaN(disbursementId) || disbursementId <= 0) {
      throw new AppError(400, 'Invalid disbursement ID', ErrorCodes.VALIDATION_ERROR);
    }

    // Check task access
    const accessResult = await checkTaskAccess(user.id, taskId, 'MANAGER');
    if (!accessResult.canAccess) {
      throw new AppError(403, 'Access denied', ErrorCodes.FORBIDDEN);
    }

    // Verify disbursement exists and belongs to task
    const existingDisbursement = await prisma.taskBudgetDisbursement.findUnique({
      where: { id: disbursementId },
      select: { taskId: true }
    });

    if (!existingDisbursement) {
      throw new AppError(404, 'Disbursement not found', ErrorCodes.NOT_FOUND);
    }

    if (existingDisbursement.taskId !== taskId) {
      throw new AppError(404, 'Disbursement not found for this task', ErrorCodes.NOT_FOUND);
    }

    // Delete disbursement
    await prisma.taskBudgetDisbursement.delete({
      where: { id: disbursementId }
    });

    logger.info('Budget disbursement deleted', {
      taskId,
      disbursementId,
      userId: user.id
    });

    return NextResponse.json(successResponse({ deleted: true }));
  }
});
