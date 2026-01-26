import { NextRequest, NextResponse } from 'next/server';
import { secureRoute, Feature } from '@/lib/api/secureRoute';
import { prisma } from '@/lib/db/prisma';
import { successResponse, parseNumericId } from '@/lib/utils/apiUtils';
import { AppError, ErrorCodes } from '@/lib/utils/errorHandler';
import { toTaskId } from '@/types/branded';
import { z } from 'zod';

const UpdateResearchNoteSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  content: z.string().min(1).optional(),
  tags: z.array(z.string()).optional(),
  category: z.string().optional(),
}).strict();

/**
 * PUT /api/tasks/[id]/research-notes/[noteId]
 * Update a research note
 */
export const PUT = secureRoute.mutationWithParams({
  feature: Feature.MANAGE_TASKS,
  taskIdParam: 'id',
  schema: UpdateResearchNoteSchema,
  handler: async (request: NextRequest, { user, params, data }) => {
    const taskId = toTaskId(params.id);
    const noteId = parseNumericId(params.noteId, 'Note');

    // IDOR protection: verify note belongs to task
    const existingNote = await prisma.researchNote.findUnique({
      where: { id: noteId },
      select: { taskId: true },
    });

    if (!existingNote) {
      throw new AppError(404, 'Research note not found', ErrorCodes.NOT_FOUND);
    }

    if (existingNote.taskId !== taskId) {
      throw new AppError(403, 'Note does not belong to this task', ErrorCodes.FORBIDDEN);
    }

    // Build update data
    const updateData: {
      title?: string;
      content?: string;
      tags?: string | null;
      category?: string | null;
    } = {};
    if (data.title !== undefined) {
      updateData.title = data.title;
    }
    if (data.content !== undefined) {
      updateData.content = data.content;
    }
    if (data.tags !== undefined) updateData.tags = JSON.stringify(data.tags);
    if (data.category !== undefined) updateData.category = data.category;

    const note = await prisma.researchNote.update({
      where: { id: noteId },
      data: updateData,
      select: {
        id: true,
        taskId: true,
        title: true,
        content: true,
        tags: true,
        category: true,
        createdBy: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json(successResponse(note));
  },
});

/**
 * DELETE /api/tasks/[id]/research-notes/[noteId]
 * Delete a research note
 */
export const DELETE = secureRoute.mutationWithParams({
  feature: Feature.MANAGE_TASKS,
  taskIdParam: 'id',
  handler: async (request: NextRequest, { user, params }) => {
    const taskId = toTaskId(params.id);
    const noteId = parseNumericId(params.noteId, 'Note');

    // IDOR protection: verify note belongs to task
    const existingNote = await prisma.researchNote.findUnique({
      where: { id: noteId },
      select: { taskId: true },
    });

    if (!existingNote) {
      throw new AppError(404, 'Research note not found', ErrorCodes.NOT_FOUND);
    }

    if (existingNote.taskId !== taskId) {
      throw new AppError(403, 'Note does not belong to this task', ErrorCodes.FORBIDDEN);
    }

    await prisma.researchNote.delete({
      where: { id: noteId },
    });

    return NextResponse.json(successResponse({ message: 'Research note deleted successfully' }));
  },
});

