import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, checkProjectAccess } from '@/lib/services/auth/auth';
import { prisma } from '@/lib/db/prisma';
import { handleApiError } from '@/lib/utils/errorHandler';
import { successResponse } from '@/lib/utils/apiUtils';
import { toProjectId } from '@/types/branded';
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
    const projectId = toProjectId(params.id);
    const noteId = parseInt(params.noteId);

    // Check project access (requires EDITOR role or higher)
    const hasAccess = await checkProjectAccess(user.id, projectId, 'EDITOR');
    if (!hasAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const validated = UpdateResearchNoteSchema.parse(body);

    interface UpdateData {
      title?: string;
      content?: string;
      tags?: string[];
      category?: string;
    }

    const updateData: UpdateData = {};
    if (validated.title !== undefined) {
      updateData.title = sanitizeText(validated.title, { maxLength: 200 });
    }
    if (validated.content !== undefined) {
      updateData.content = sanitizeText(validated.content, { allowHTML: false, allowNewlines: true });
    }
    if (validated.tags !== undefined) updateData.tags = validated.tags;
    if (validated.category !== undefined) updateData.category = validated.category;

    const note = await prisma.researchNote.update({
      where: { id: noteId },
      data: updateData,
    });

    return NextResponse.json(successResponse(note));
  } catch (error) {
    return handleApiError(error, 'PUT /api/projects/[id]/research-notes/[noteId]');
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
    const projectId = toProjectId(params.id);
    const noteId = parseInt(params.noteId);

    // Check project access (requires EDITOR role or higher)
    const hasAccess = await checkProjectAccess(user.id, projectId, 'EDITOR');
    if (!hasAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await prisma.researchNote.delete({
      where: { id: noteId },
    });

    return NextResponse.json(successResponse({ message: 'Research note deleted successfully' }));
  } catch (error) {
    return handleApiError(error, 'DELETE /api/projects/[id]/research-notes/[noteId]');
  }
}

