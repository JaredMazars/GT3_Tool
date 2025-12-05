import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, checkTaskAccess } from '@/lib/services/tasks/taskAuthorization';
import { prisma } from '@/lib/db/prisma';
import { handleApiError } from '@/lib/utils/errorHandler';
import { successResponse } from '@/lib/utils/apiUtils';
import { toTaskId } from '@/types/branded';
import { sanitizeText } from '@/lib/utils/sanitization';
import { z } from 'zod';

const CreateResearchNoteSchema = z.object({
  title: z.string().min(1).max(200),
  content: z.string().min(1),
  tags: z.array(z.string()).optional(),
  category: z.string().optional(),
});

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const params = await context.params;
    const taskId = toTaskId(params.id);

    // Check project access
    const hasAccess = await checkTaskAccess(user.id, taskId);
    if (!hasAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    const notes = await prisma.researchNote.findMany({
      where: { taskId },
      orderBy: { updatedAt: 'desc' },
    });

    return NextResponse.json(successResponse(notes));
  } catch (error) {
    return handleApiError(error, 'GET /api/tasks/[id]/research-notes');
  }
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const params = await context.params;
    const taskId = toTaskId(params.id);

    // Check project access (requires EDITOR role or higher)
    const hasAccess = await checkTaskAccess(user.id, taskId, 'EDITOR');
    if (!hasAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const validated = CreateResearchNoteSchema.parse(body);

    const note = await prisma.researchNote.create({
      data: {
        taskId,
        title: sanitizeText(validated.title, { maxLength: 200 }) || validated.title,
        content: sanitizeText(validated.content, { allowHTML: false, allowNewlines: true }) || validated.content,
        tags: validated.tags ? JSON.stringify(validated.tags) : null,
        category: validated.category,
        createdBy: user.id,
      },
    });

    return NextResponse.json(successResponse(note), { status: 201 });
  } catch (error) {
    return handleApiError(error, 'POST /api/tasks/[id]/research-notes');
  }
}

