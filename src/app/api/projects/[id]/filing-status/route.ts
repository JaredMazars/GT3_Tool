import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

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
    
    const filings = await prisma.filingStatus.findMany({
      where: { projectId },
      orderBy: [
        { status: 'asc' },
        { deadline: 'asc' },
      ],
    });

    return NextResponse.json({ success: true, data: filings });
  } catch (error) {
    console.error('Error fetching filing status:', error);
    return NextResponse.json(
      { error: 'Failed to fetch filing status' },
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

    const filing = await prisma.filingStatus.create({
      data: {
        projectId,
        filingType: body.filingType,
        description: body.description,
        status: body.status || 'PENDING',
        deadline: body.deadline ? new Date(body.deadline) : null,
        referenceNumber: body.referenceNumber,
        notes: body.notes,
        createdBy: session.user.email,
      },
    });

    return NextResponse.json({ success: true, data: filing });
  } catch (error) {
    console.error('Error creating filing status:', error);
    return NextResponse.json(
      { error: 'Failed to create filing status' },
      { status: 500 }
    );
  }
}

