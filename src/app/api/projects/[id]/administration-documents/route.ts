import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, checkProjectAccess } from '@/lib/services/auth/auth';
import { prisma } from '@/lib/db/prisma';
import { handleApiError } from '@/lib/utils/errorHandler';
import { successResponse } from '@/lib/utils/apiUtils';
import { toProjectId } from '@/types/branded';
import { sanitizeFilename, sanitizeText } from '@/lib/utils/sanitization';
import { z } from 'zod';

const CreateAdminDocumentSchema = z.object({
  fileName: z.string().min(1).max(255),
  fileType: z.string().min(1).max(50),
  fileSize: z.number().int().positive(),
  filePath: z.string().min(1),
  category: z.string().max(100).optional(),
  description: z.string().optional(),
  version: z.number().int().positive().optional(),
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
    
    const documents = await prisma.administrationDocument.findMany({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(successResponse(documents));
  } catch (error) {
    return handleApiError(error, 'GET /api/projects/[id]/administration-documents');
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
    const validated = CreateAdminDocumentSchema.parse(body);

    const document = await prisma.administrationDocument.create({
      data: {
        projectId,
        fileName: sanitizeFilename(validated.fileName),
        fileType: validated.fileType,
        fileSize: validated.fileSize,
        filePath: validated.filePath,
        category: validated.category || 'General',
        description: validated.description ? sanitizeText(validated.description, { allowNewlines: true }) : undefined,
        version: validated.version || 1,
        uploadedBy: user.id,
      },
    });

    return NextResponse.json(successResponse(document), { status: 201 });
  } catch (error) {
    return handleApiError(error, 'POST /api/projects/[id]/administration-documents');
  }
}

