import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, checkProjectAccess } from '@/lib/services/auth/auth';
import { prisma } from '@/lib/db/prisma';
import { handleApiError } from '@/lib/utils/errorHandler';
import { successResponse } from '@/lib/utils/apiUtils';
import { toProjectId } from '@/types/branded';
import { sanitizeText } from '@/lib/utils/sanitization';
import { z } from 'zod';

const CreateSarsResponseSchema = z.object({
  referenceNumber: z.string().min(1).max(100),
  subject: z.string().min(1).max(500),
  content: z.string().min(1),
  status: z.enum(['PENDING', 'IN_PROGRESS', 'SUBMITTED', 'ACCEPTED', 'OBJECTION_FILED']).optional(),
  responseType: z.string().max(100).optional(),
  deadline: z.string().datetime().optional(),
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
    
    const responses = await prisma.sarsResponse.findMany({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(successResponse(responses));
  } catch (error) {
    return handleApiError(error, 'GET /api/projects/[id]/sars-responses');
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
    const validated = CreateSarsResponseSchema.parse(body);

    const response = await prisma.sarsResponse.create({
      data: {
        projectId,
        referenceNumber: sanitizeText(validated.referenceNumber, { maxLength: 100 }),
        subject: sanitizeText(validated.subject, { maxLength: 500 }),
        content: sanitizeText(validated.content, { allowHTML: false, allowNewlines: true }),
        status: validated.status || 'PENDING',
        responseType: validated.responseType,
        deadline: validated.deadline ? new Date(validated.deadline) : null,
        createdBy: user.id,
      },
    });

    return NextResponse.json(successResponse(response), { status: 201 });
  } catch (error) {
    return handleApiError(error, 'POST /api/projects/[id]/sars-responses');
  }
}

