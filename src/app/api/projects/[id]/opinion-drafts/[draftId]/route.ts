import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

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
    console.error('Error updating opinion draft:', error);
    return NextResponse.json(
      { error: 'Failed to update opinion draft' },
      { status: 500 }
    );
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
    console.error('Error deleting opinion draft:', error);
    return NextResponse.json(
      { error: 'Failed to delete opinion draft' },
      { status: 500 }
    );
  }
}

