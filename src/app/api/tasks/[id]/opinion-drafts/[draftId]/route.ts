/**
 * Opinion Draft Detail API Routes
 * GET /api/tasks/[id]/opinion-drafts/[draftId] - Get draft details
 * PUT /api/tasks/[id]/opinion-drafts/[draftId] - Update draft
 * DELETE /api/tasks/[id]/opinion-drafts/[draftId] - Delete draft
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { secureRoute, Feature } from '@/lib/api/secureRoute';
import { UpdateOpinionDraftSchema } from '@/lib/validation/schemas';
import { successResponse, parseTaskId, parseNumericId } from '@/lib/utils/apiUtils';
import { AppError, ErrorCodes } from '@/lib/utils/errorHandler';
import { logger } from '@/lib/utils/logger';

/**
 * Helper: Verify draft belongs to the task (IDOR protection)
 */
async function verifyDraftBelongsToTask(
  draftId: number,
  taskId: number
): Promise<void> {
  const draft = await prisma.opinionDraft.findFirst({
    where: { id: draftId, taskId },
    select: { id: true },
  });

  if (!draft) {
    throw new AppError(
      404,
      'Opinion draft not found or does not belong to this task',
      ErrorCodes.NOT_FOUND,
      { draftId, taskId }
    );
  }
}

/**
 * GET /api/tasks/[id]/opinion-drafts/[draftId]
 * Get a specific opinion draft
 */
export const GET = secureRoute.queryWithParams({
  feature: Feature.ACCESS_TASKS,
  taskIdParam: 'id',
  handler: async (request, { user, params }) => {
    const taskId = parseTaskId(params.id);
    const draftId = parseNumericId(params.draftId, 'draftId');

    // IDOR protection: verify draft belongs to this task
    await verifyDraftBelongsToTask(draftId, taskId);

    const draft = await prisma.opinionDraft.findUnique({
      where: { id: draftId },
      select: {
        id: true,
        taskId: true,
        title: true,
        content: true,
        status: true,
        version: true,
        createdBy: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!draft) {
      throw new AppError(404, 'Opinion draft not found', ErrorCodes.NOT_FOUND);
    }

    return NextResponse.json(successResponse(draft), {
      headers: { 'Cache-Control': 'no-store' },
    });
  },
});

/**
 * PUT /api/tasks/[id]/opinion-drafts/[draftId]
 * Update an opinion draft
 */
export const PUT = secureRoute.mutationWithParams({
  feature: Feature.MANAGE_TASKS,
  taskIdParam: 'id',
  schema: UpdateOpinionDraftSchema,
  handler: async (request, { user, data, params }) => {
    const taskId = parseTaskId(params.id);
    const draftId = parseNumericId(params.draftId, 'draftId');

    // IDOR protection: verify draft belongs to this task
    await verifyDraftBelongsToTask(draftId, taskId);

    // Build update data with only provided fields
    const updateData: {
      title?: string;
      content?: string;
      status?: string;
    } = {};

    if (data.title !== undefined) updateData.title = data.title;
    if (data.content !== undefined) updateData.content = data.content;
    if (data.status !== undefined) updateData.status = data.status;

    const draft = await prisma.opinionDraft.update({
      where: { id: draftId },
      data: updateData,
      select: {
        id: true,
        taskId: true,
        title: true,
        content: true,
        status: true,
        version: true,
        createdBy: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    logger.info('Updated opinion draft', {
      userId: user.id,
      taskId,
      draftId,
      updatedFields: Object.keys(updateData),
    });

    return NextResponse.json(successResponse(draft));
  },
});

/**
 * DELETE /api/tasks/[id]/opinion-drafts/[draftId]
 * Delete an opinion draft
 */
export const DELETE = secureRoute.mutationWithParams({
  feature: Feature.MANAGE_TASKS,
  taskIdParam: 'id',
  handler: async (request, { user, params }) => {
    const taskId = parseTaskId(params.id);
    const draftId = parseNumericId(params.draftId, 'draftId');

    // IDOR protection: verify draft belongs to this task
    await verifyDraftBelongsToTask(draftId, taskId);

    await prisma.opinionDraft.delete({
      where: { id: draftId },
    });

    logger.info('Deleted opinion draft', {
      userId: user.id,
      taskId,
      draftId,
    });

    return NextResponse.json(successResponse({ deleted: true }));
  },
});
