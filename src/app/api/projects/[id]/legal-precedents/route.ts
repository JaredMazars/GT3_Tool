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
    
    const precedents = await prisma.legalPrecedent.findMany({
      where: { projectId },
      orderBy: { year: 'desc' },
    });

    return NextResponse.json({ success: true, data: precedents });
  } catch (error) {
    console.error('Error fetching legal precedents:', error);
    return NextResponse.json(
      { error: 'Failed to fetch legal precedents' },
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

    const precedent = await prisma.legalPrecedent.create({
      data: {
        projectId,
        caseName: body.caseName,
        citation: body.citation,
        court: body.court,
        year: body.year,
        summary: body.summary,
        relevance: body.relevance,
        link: body.link,
        createdBy: session.user.email,
      },
    });

    return NextResponse.json({ success: true, data: precedent });
  } catch (error) {
    console.error('Error creating legal precedent:', error);
    return NextResponse.json(
      { error: 'Failed to create legal precedent' },
      { status: 500 }
    );
  }
}

