import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, checkTaskAccess } from '@/lib/services/tasks/taskAuthorization';
import { prisma } from '@/lib/db/prisma';
import { handleApiError } from '@/lib/utils/errorHandler';
import { successResponse } from '@/lib/utils/apiUtils';
import { toTaskId } from '@/types/branded';
import { sanitizeText } from '@/lib/utils/sanitization';
import { z } from 'zod';

const UpdateResearchNoteSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  content: z.string().min(1).optional(),
  tags: z.array(z.string()).optional(),
  category: z.string().optional(),
});

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string; noteId: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const params = await context.params;
    const taskId = toTaskId(params.id);
    const noteId = Number.parseInt(params.noteId);

    // Check project access (requires EDITOR role or higher)
    const hasAccess = await checkTaskAccess(user.id, taskId, 'EDITOR');
    if (!hasAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const validated = UpdateResearchNoteSchema.parse(body);

    interface UpdateData {
      title?: string;
      content?: string;
      tags?: string;
      category?: string;
    }

    const updateData: UpdateData = {};
    if (validated.title !== undefined) {
      updateData.title = sanitizeText(validated.title, { maxLength: 200 }) || validated.title;
    }
    if (validated.content !== undefined) {
      updateData.content = sanitizeText(validated.content, { allowHTML: false, allowNewlines: true }) || validated.content;
    }
    if (validated.tags !== undefined) updateData.tags = JSON.stringify(validated.tags);
    if (validated.category !== undefined) updateData.category = validated.category;

    const note = await prisma.researchNote.update({
      where: { id: noteId },
      data: updateData,
    });

    return NextResponse.json(successResponse(note));
  } catch (error) {
    return handleApiError(error, 'PUT /api/tasks/[id]/research-notes/[noteId]');
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string; noteId: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const params = await context.params;
    const taskId = toTaskId(params.id);
    const noteId = Number.parseInt(params.noteId);

    // Check project access (requires EDITOR role or higher)
    const hasAccess = await checkTaskAccess(user.id, taskId, 'EDITOR');
    if (!hasAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await prisma.researchNote.delete({
      where: { id: noteId },
    });

    return NextResponse.json(successResponse({ message: 'Research note deleted successfully' }));
  } catch (error) {
    return handleApiError(error, 'DELETE /api/tasks/[id]/research-notes/[noteId]');
  }
}

