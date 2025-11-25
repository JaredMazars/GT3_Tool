import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/services/auth/auth';
import { prisma } from '@/lib/db/prisma';
import { handleApiError } from '@/lib/utils/errorHandler';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const params = await context.params;
    const projectId = parseInt(params.id);
    
    const precedents = await prisma.legalPrecedent.findMany({
      where: { projectId },
      orderBy: { year: 'desc' },
    });

    return NextResponse.json({ success: true, data: precedents });
  } catch (error) {
    return handleApiError(error, 'GET /api/projects/[id]/legal-precedents');
  }
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const params = await context.params;
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
    return handleApiError(error, 'POST /api/projects/[id]/legal-precedents');
  }
}

