import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { parseTaskId, successResponse } from '@/lib/utils/apiUtils';
import { checkTaskAccess } from '@/lib/services/tasks/taskAuthorization';
import { toTaskId } from '@/types/branded';
import { sanitizeText } from '@/lib/utils/sanitization';
import { cache, CACHE_PREFIXES } from '@/lib/services/cache/CacheService';
import { invalidateTaskListCache } from '@/lib/services/cache/listCache';
import { TaskStage } from '@/types/task-stages';
import { z } from 'zod';
import { secureRoute } from '@/lib/api/secureRoute';
import { AppError, ErrorCodes } from '@/lib/utils/errorHandler';

const updateStageSchema = z.object({
  stage: z.enum(['DRAFT', 'IN_PROGRESS', 'UNDER_REVIEW', 'COMPLETED', 'ARCHIVED']),
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

    const cacheKey = `${CACHE_PREFIXES.TASK}stage:${taskId}`;
    const cached = await cache.get(cacheKey);
    if (cached) {
      return NextResponse.json(successResponse(cached));
    }

    const stages = await prisma.taskStage.findMany({
      where: { taskId },
      select: { id: true, stage: true, movedBy: true, notes: true, createdAt: true },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: 100,
    });

    const currentStage = stages.length > 0 ? stages[0]?.stage ?? TaskStage.DRAFT : TaskStage.DRAFT;

    const response = { currentStage, history: stages };

    await cache.set(cacheKey, response, 300);

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

    const sanitizedNotes = data.notes ? sanitizeText(data.notes, { maxLength: 500, allowNewlines: true }) : null;

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

    if (currentStage && currentStage.stage === data.stage) {
      return NextResponse.json(successResponse({
        stage: currentStage,
        message: 'Task already in this stage',
      }));
    }

    const newStage = await prisma.taskStage.create({
      data: { taskId, stage: data.stage, movedBy: user.id, notes: sanitizedNotes },
      select: { id: true, stage: true, movedBy: true, notes: true, createdAt: true },
    });

    await cache.invalidate(`${CACHE_PREFIXES.TASK}stage:${taskId}`);
    await cache.invalidate(`${CACHE_PREFIXES.TASK}detail:${taskId}`);
    await invalidateTaskListCache(taskId);
    await cache.invalidate(`${CACHE_PREFIXES.TASK}kanban`);

    return NextResponse.json(successResponse({
      stage: newStage,
      message: 'Task stage updated successfully',
    }));
  },
});
