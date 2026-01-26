import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { parseTaskId, successResponse } from '@/lib/utils/apiUtils';
import { checkTaskAccess } from '@/lib/services/tasks/taskAuthorization';
import { toTaskId } from '@/types/branded';
import { invalidateTaskListCache } from '@/lib/services/cache/listCache';
import { TaskStage } from '@/types/task-stages';
import { normalizeTaskStage } from '@/lib/utils/taskStages';
import { z } from 'zod';
import { secureRoute } from '@/lib/api/secureRoute';
import { AppError, ErrorCodes } from '@/lib/utils/errorHandler';

const updateStageSchema = z.object({
  stage: z.nativeEnum(TaskStage),
  notes: z.string().max(500).optional(),
}).strict();

/**
 * GET /api/tasks/[id]/stage
 * Get task stage and history
 */
export const GET = secureRoute.queryWithParams({
  handler: async (request, { user, params }) => {
    const taskId = toTaskId(parseTaskId(params?.id));

    const hasAccess = await checkTaskAccess(user.id, taskId);
    if (!hasAccess) {
      throw new AppError(403, 'Forbidden', ErrorCodes.FORBIDDEN);
    }

    const stages = await prisma.taskStage.findMany({
      where: { taskId },
      select: { id: true, stage: true, movedBy: true, notes: true, createdAt: true },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: 100,
    });

    const currentStage = stages.length > 0 ? stages[0]?.stage ?? TaskStage.ENGAGE : TaskStage.ENGAGE;

    const response = { currentStage, history: stages };

    return NextResponse.json(successResponse(response));
  },
});

/**
 * POST /api/tasks/[id]/stage
 * Update task stage
 */
export const POST = secureRoute.mutationWithParams({
  schema: updateStageSchema,
  handler: async (request, { user, data, params }) => {
    const taskId = toTaskId(parseTaskId(params?.id));

    const hasAccess = await checkTaskAccess(user.id, taskId, 'EDITOR');
    if (!hasAccess) {
      throw new AppError(403, 'Forbidden - EDITOR role required', ErrorCodes.FORBIDDEN);
    }

    // Normalize stage to uppercase for case-insensitive consistency
    const normalizedStage = normalizeTaskStage(data.stage);
    const sanitizedNotes = data.notes ?? null;

    const task = await prisma.task.findUnique({
      where: { id: taskId },
      select: { id: true, TaskDesc: true },
    });

    if (!task) {
      throw new AppError(404, 'Task not found', ErrorCodes.NOT_FOUND);
    }

    const currentStage = await prisma.taskStage.findFirst({
      where: { taskId },
      orderBy: { createdAt: 'desc' },
      select: { stage: true },
    });

    // Compare normalized stage values for case-insensitive matching
    if (currentStage && currentStage.stage.toUpperCase() === normalizedStage) {
      return NextResponse.json(successResponse({
        stage: currentStage,
        message: 'Task already in this stage',
      }));
    }

    const newStage = await prisma.taskStage.create({
      data: { taskId, stage: normalizedStage, movedBy: user.id, notes: sanitizedNotes },
      select: { id: true, stage: true, movedBy: true, notes: true, createdAt: true },
    });

    await invalidateTaskListCache(taskId);

    return NextResponse.json(successResponse({
      stage: newStage,
      message: 'Task stage updated successfully',
    }));
  },
});
