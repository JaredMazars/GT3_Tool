import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { logger } from '@/lib/utils/logger';
import { secureRoute, Feature } from '@/lib/api/secureRoute';
import { auditTaskDeletion } from '@/lib/utils/auditLog';
import { getClientIdentifier } from '@/lib/utils/rateLimit';
import { parseNumericId, successResponse } from '@/lib/utils/apiUtils';
import { AppError, ErrorCodes } from '@/lib/utils/errorHandler';
import { invalidateTaskListCache } from '@/lib/services/cache/listCache';
import { cache, CACHE_PREFIXES } from '@/lib/services/cache/CacheService';

/**
 * DELETE /api/tasks/[id]/permanent
 * Permanently delete a task and all its related data from the database
 */
export const DELETE = secureRoute.mutationWithParams({
  feature: Feature.MANAGE_TASKS,
  handler: async (request, { user, params }) => {
    const taskId = parseNumericId(params?.id, 'task');

    const existingTask = await prisma.task.findUnique({
      where: { id: taskId },
      select: { id: true, TaskCode: true, TaskDesc: true, GSClientID: true },
    });

    if (!existingTask) {
      throw new AppError(404, 'Task not found', ErrorCodes.NOT_FOUND);
    }

    // Delete task and all related data in a transaction
    await prisma.$transaction(async (tx) => {
      await tx.adjustmentDocument.deleteMany({ where: { taskId: taskId } });
      await tx.taxAdjustment.deleteMany({ where: { taskId: taskId } });
      await tx.mappedAccount.deleteMany({ where: { taskId: taskId } });
      await tx.aITaxReport.deleteMany({ where: { taskId: taskId } });
      await tx.task.delete({ where: { id: taskId } });
    });

    // Invalidate cache
    await cache.invalidate(`${CACHE_PREFIXES.TASK}detail:${taskId}`);
    await invalidateTaskListCache(taskId);

    // Audit log
    const ipAddress = getClientIdentifier(request);
    await auditTaskDeletion(user.id, taskId, existingTask.TaskCode, ipAddress);

    logger.info('Task permanently deleted', { taskId, taskCode: existingTask.TaskCode, deletedBy: user.id });

    return NextResponse.json(successResponse({ message: 'Task permanently deleted successfully' }));
  },
});
