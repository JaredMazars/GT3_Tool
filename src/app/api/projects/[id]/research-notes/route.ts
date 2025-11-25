import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, checkProjectAccess } from '@/lib/services/auth/auth';
import { prisma } from '@/lib/db/prisma';
import { handleApiError } from '@/lib/utils/errorHandler';
import { successResponse } from '@/lib/utils/apiUtils';
import { toProjectId } from '@/types/branded';
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
    const projectId = toProjectId(params.id);

    // Check project access
    const hasAccess = await checkProjectAccess(user.id, projectId);
    if (!hasAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    const notes = await prisma.researchNote.findMany({
      where: { projectId },
      orderBy: { updatedAt: 'desc' },
    });

    return NextResponse.json(successResponse(notes));
  } catch (error) {
    return handleApiError(error, 'GET /api/projects/[id]/research-notes');
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
    const projectId = toProjectId(params.id);

    // Check project access (requires EDITOR role or higher)
    const hasAccess = await checkProjectAccess(user.id, projectId, 'EDITOR');
    if (!hasAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const validated = CreateResearchNoteSchema.parse(body);

    const note = await prisma.researchNote.create({
      data: {
        projectId,
        title: sanitizeText(validated.title, { maxLength: 200 }),
        content: sanitizeText(validated.content, { allowHTML: false, allowNewlines: true }),
        tags: validated.tags,
        category: validated.category,
        createdBy: user.id,
      },
    });

    return NextResponse.json(successResponse(note), { status: 201 });
  } catch (error) {
    return handleApiError(error, 'POST /api/projects/[id]/research-notes');
  }
}

