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
    
    const documents = await prisma.administrationDocument.findMany({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ success: true, data: documents });
  } catch (error) {
    console.error('Error fetching administration documents:', error);
    return NextResponse.json(
      { error: 'Failed to fetch administration documents' },
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

    const document = await prisma.administrationDocument.create({
      data: {
        projectId,
        fileName: body.fileName,
        fileType: body.fileType,
        fileSize: body.fileSize,
        filePath: body.filePath,
        category: body.category,
        description: body.description,
        version: body.version || 1,
        uploadedBy: session.user.email,
      },
    });

    return NextResponse.json({ success: true, data: document });
  } catch (error) {
    console.error('Error creating administration document:', error);
    return NextResponse.json(
      { error: 'Failed to create administration document' },
      { status: 500 }
    );
  }
}

