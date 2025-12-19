import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db/prisma';
import { logger } from '@/lib/utils/logger';
import { secureRoute, Feature } from '@/lib/api/secureRoute';
import { auditTaskDeletion } from '@/lib/utils/auditLog';
import { getClientIdentifier } from '@/lib/utils/rateLimit';

/**
 * DELETE /api/tasks/[id]/permanent
 * Permanently delete a task and all its related data from the database
 */
export const DELETE = secureRoute.mutationWithParams<z.ZodAny, { id: string }>({
  feature: Feature.MANAGE_TASKS,
  handler: async (request, { user, params }) => {
    const taskId = Number.parseInt(params.id, 10);
    
    if (Number.isNaN(taskId)) {
      return NextResponse.json({ success: false, error: 'Invalid task ID format' }, { status: 400 });
    }

    const existingTask = await prisma.task.findUnique({
      where: { id: taskId },
      select: { id: true, TaskCode: true, TaskDesc: true },
    });

    if (!existingTask) {
      return NextResponse.json({ success: false, error: 'Task not found' }, { status: 404 });
    }

    // Delete task and all related data in a transaction
    await prisma.$transaction(async (tx) => {
      await tx.adjustmentDocument.deleteMany({ where: { taskId: taskId } });
      await tx.taxAdjustment.deleteMany({ where: { taskId: taskId } });
      await tx.mappedAccount.deleteMany({ where: { taskId: taskId } });
      await tx.aITaxReport.deleteMany({ where: { taskId: taskId } });
      await tx.task.delete({ where: { id: taskId } });
    });

    // Audit log
    const ipAddress = getClientIdentifier(request);
    await auditTaskDeletion(user.id, taskId, existingTask.TaskCode, ipAddress);

    logger.info('Task permanently deleted', { taskId, taskCode: existingTask.TaskCode, deletedBy: user.id });

    return NextResponse.json({ success: true, message: 'Task permanently deleted successfully' });
  },
});
