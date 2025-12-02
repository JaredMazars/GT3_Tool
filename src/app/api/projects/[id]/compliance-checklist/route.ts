import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/services/auth/auth';
import { prisma } from '@/lib/db/prisma';
import { handleApiError } from '@/lib/utils/errorHandler';

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
    
    const items = await prisma.complianceChecklist.findMany({
      where: { projectId },
      orderBy: [
        { status: 'asc' },
        { dueDate: 'asc' },
      ],
    });

    return NextResponse.json({ success: true, data: items });
  } catch (error) {
    return handleApiError(error, 'GET /api/projects/[id]/compliance-checklist');
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
    return handleApiError(error, 'POST /api/projects/[id]/compliance-checklist');
  }
}

