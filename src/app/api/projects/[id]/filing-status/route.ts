import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, checkProjectAccess } from '@/lib/services/auth/auth';
import { prisma } from '@/lib/db/prisma';
import { handleApiError } from '@/lib/utils/errorHandler';
import { successResponse } from '@/lib/utils/apiUtils';
import { toProjectId } from '@/types/branded';
import { sanitizeText } from '@/lib/utils/sanitization';
import { z } from 'zod';

const CreateFilingStatusSchema = z.object({
  filingType: z.string().min(1).max(100),
  description: z.string().optional(),
  status: z.enum(['PENDING', 'IN_PROGRESS', 'SUBMITTED', 'ACCEPTED', 'REJECTED']).optional(),
  deadline: z.string().datetime().optional(),
  referenceNumber: z.string().max(100).optional(),
  notes: z.string().optional(),
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
    
    const filings = await prisma.filingStatus.findMany({
      where: { projectId },
      orderBy: [
        { status: 'asc' },
        { deadline: 'asc' },
      ],
    });

    return NextResponse.json(successResponse(filings));
  } catch (error) {
    return handleApiError(error, 'GET /api/projects/[id]/filing-status');
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
    const validated = CreateFilingStatusSchema.parse(body);

    const filing = await prisma.filingStatus.create({
      data: {
        projectId,
        filingType: sanitizeText(validated.filingType, { maxLength: 100 }) || validated.filingType,
        description: validated.description ? sanitizeText(validated.description, { allowNewlines: true }) : undefined,
        status: validated.status || 'PENDING',
        deadline: validated.deadline ? new Date(validated.deadline) : null,
        referenceNumber: validated.referenceNumber,
        notes: validated.notes ? sanitizeText(validated.notes, { allowNewlines: true }) : undefined,
        createdBy: user.id,
      },
    });

    return NextResponse.json(successResponse(filing), { status: 201 });
  } catch (error) {
    return handleApiError(error, 'POST /api/projects/[id]/filing-status');
  }
}

