import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/services/auth/auth';
import { prisma } from '@/lib/db/prisma';
import { handleApiError } from '@/lib/utils/errorHandler';

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string; draftId: string } }
) {
  try {
    const session = await getSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const draftId = parseInt(params.draftId);
    const body = await request.json();

    const draft = await prisma.opinionDraft.update({
      where: { id: draftId },
      data: {
        title: body.title,
        content: body.content,
        status: body.status,
      },
    });

    return NextResponse.json({ success: true, data: draft });
  } catch (error) {
    return handleApiError(error, 'PUT /api/projects/[id]/opinion-drafts/[draftId]');
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; draftId: string } }
) {
  try {
    const session = await getSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const draftId = parseInt(params.draftId);

    await prisma.opinionDraft.delete({
      where: { id: draftId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error, 'DELETE /api/projects/[id]/opinion-drafts/[draftId]');
  }
}

