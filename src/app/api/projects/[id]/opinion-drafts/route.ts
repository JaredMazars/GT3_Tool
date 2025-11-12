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
    
    const drafts = await prisma.opinionDraft.findMany({
      where: { projectId },
      orderBy: { updatedAt: 'desc' },
    });

    return NextResponse.json({ success: true, data: drafts });
  } catch (error) {
    console.error('Error fetching opinion drafts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch opinion drafts' },
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

    const draft = await prisma.opinionDraft.create({
      data: {
        projectId,
        title: body.title,
        content: body.content || '',
        status: body.status || 'DRAFT',
        createdBy: session.user.email,
        version: 1,
      },
    });

    return NextResponse.json({ success: true, data: draft });
  } catch (error) {
    console.error('Error creating opinion draft:', error);
    return NextResponse.json(
      { error: 'Failed to create opinion draft' },
      { status: 500 }
    );
  }
}

