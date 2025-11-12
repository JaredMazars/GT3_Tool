import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/services/auth/auth';
import { prisma } from '@/lib/db/prisma';

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string; noteId: string } }
) {
  try {
    const session = await getSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const noteId = parseInt(params.noteId);
    const body = await request.json();

    const note = await prisma.researchNote.update({
      where: { id: noteId },
      data: {
        title: body.title,
        content: body.content,
        tags: body.tags,
        category: body.category,
      },
    });

    return NextResponse.json({ success: true, data: note });
  } catch (error) {
    console.error('Error updating research note:', error);
    return NextResponse.json(
      { error: 'Failed to update research note' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; noteId: string } }
) {
  try {
    const session = await getSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const noteId = parseInt(params.noteId);

    await prisma.researchNote.delete({
      where: { id: noteId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting research note:', error);
    return NextResponse.json(
      { error: 'Failed to delete research note' },
      { status: 500 }
    );
  }
}

