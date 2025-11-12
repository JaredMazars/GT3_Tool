import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/services/auth/auth';
import { prisma } from '@/lib/db/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const projectId = parseInt(params.id);
    
    const notes = await prisma.researchNote.findMany({
      where: { projectId },
      orderBy: { updatedAt: 'desc' },
    });

    return NextResponse.json({ success: true, data: notes });
  } catch (error) {
    console.error('Error fetching research notes:', error);
    return NextResponse.json(
      { error: 'Failed to fetch research notes' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const projectId = parseInt(params.id);
    const body = await request.json();

    const note = await prisma.researchNote.create({
      data: {
        projectId,
        title: body.title,
        content: body.content,
        tags: body.tags,
        category: body.category,
        createdBy: session.user.email,
      },
    });

    return NextResponse.json({ success: true, data: note });
  } catch (error) {
    console.error('Error creating research note:', error);
    return NextResponse.json(
      { error: 'Failed to create research note' },
      { status: 500 }
    );
  }
}

