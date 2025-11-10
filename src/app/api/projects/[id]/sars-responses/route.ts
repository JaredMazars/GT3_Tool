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
    
    const responses = await prisma.sarsResponse.findMany({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ success: true, data: responses });
  } catch (error) {
    console.error('Error fetching SARS responses:', error);
    return NextResponse.json(
      { error: 'Failed to fetch SARS responses' },
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

    const response = await prisma.sarsResponse.create({
      data: {
        projectId,
        referenceNumber: body.referenceNumber,
        subject: body.subject,
        content: body.content,
        status: body.status || 'PENDING',
        responseType: body.responseType,
        deadline: body.deadline ? new Date(body.deadline) : null,
        createdBy: session.user.email,
      },
    });

    return NextResponse.json({ success: true, data: response });
  } catch (error) {
    console.error('Error creating SARS response:', error);
    return NextResponse.json(
      { error: 'Failed to create SARS response' },
      { status: 500 }
    );
  }
}

