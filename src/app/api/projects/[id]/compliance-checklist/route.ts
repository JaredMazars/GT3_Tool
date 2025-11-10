import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/lib/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const projectId = parseInt(params.id);
    
    const items = await prisma.complianceChecklist.findMany({
      where: { projectId },
      orderBy: [
        { status: 'asc' },
        { dueDate: 'asc' },
      ],
    });

    return NextResponse.json({ success: true, data: items });
  } catch (error) {
    console.error('Error fetching compliance checklist:', error);
    return NextResponse.json(
      { error: 'Failed to fetch compliance checklist' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const projectId = parseInt(params.id);
    const body = await request.json();

    const item = await prisma.complianceChecklist.create({
      data: {
        projectId,
        title: body.title,
        description: body.description,
        dueDate: body.dueDate ? new Date(body.dueDate) : null,
        priority: body.priority || 'MEDIUM',
        status: body.status || 'PENDING',
        assignedTo: body.assignedTo,
        createdBy: session.user.email,
      },
    });

    return NextResponse.json({ success: true, data: item });
  } catch (error) {
    console.error('Error creating compliance checklist item:', error);
    return NextResponse.json(
      { error: 'Failed to create compliance checklist item' },
      { status: 500 }
    );
  }
}

