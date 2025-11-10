import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/lib/auth';

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string; itemId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const itemId = parseInt(params.itemId);
    const body = await request.json();

    const updateData: any = {
      status: body.status,
    };

    if (body.status === 'COMPLETED' && body.completedAt) {
      updateData.completedAt = new Date(body.completedAt);
      updateData.completedBy = session.user.email;
    }

    const item = await prisma.complianceChecklist.update({
      where: { id: itemId },
      data: updateData,
    });

    return NextResponse.json({ success: true, data: item });
  } catch (error) {
    console.error('Error updating compliance checklist item:', error);
    return NextResponse.json(
      { error: 'Failed to update compliance checklist item' },
      { status: 500 }
    );
  }
}

