import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/services/auth/auth';
import { prisma } from '@/lib/db/prisma';
import { WordExporter } from '@/lib/services/export/wordExporter';
import { logger } from '@/lib/utils/logger';
import React from 'react';
import { pdf } from '@react-pdf/renderer';
import { OpinionPDF } from '@/components/pdf/OpinionPDF';

/**
 * POST /api/projects/[id]/opinion-drafts/[draftId]/export
 * Export opinion as PDF or Word document
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string; draftId: string } }
) {
  try {
    const session = await getSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const draftId = parseInt(params.draftId);
    const projectId = parseInt(params.id);
    const body = await request.json();
    const { format = 'pdf' } = body;

    // Get draft with sections
    const draft = await prisma.opinionDraft.findFirst({
      where: {
        id: draftId,
        projectId,
      },
    });

    if (!draft) {
      return NextResponse.json(
        { error: 'Opinion draft not found' },
        { status: 404 }
      );
    }

    // Get sections
    const sections = await prisma.opinionSection.findMany({
      where: { opinionDraftId: draftId },
      orderBy: { order: 'asc' },
    });

    if (sections.length === 0) {
      return NextResponse.json(
        { error: 'No sections found. Generate sections before exporting.' },
        { status: 400 }
      );
    }

    // Get project details for metadata
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        Client: true,
      },
    });

    if (format === 'docx') {
      // Export as Word document
      const buffer = await WordExporter.exportOpinion(draft.title, sections, {
        projectName: project?.name,
        clientName: project?.Client?.clientNameFull || project?.Client?.clientCode,
      });

      return new NextResponse(new Uint8Array(buffer), {
        headers: {
          'Content-Type':
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'Content-Disposition': `attachment; filename="${draft.title.replace(
            /\s+/g,
            '_'
          )}.docx"`,
        },
      });
    } else {
      // Export as PDF
      const pdfBuffer = await generateOpinionPDF(
        draft.title,
        sections,
        {
          projectName: project?.name,
          clientName: project?.Client?.clientNameFull || project?.Client?.clientCode,
        }
      );

      return new NextResponse(new Uint8Array(pdfBuffer), {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="${draft.title.replace(
            /\s+/g,
            '_'
          )}.pdf"`,
        },
      });
    }
  } catch (error) {
    logger.error('Error exporting opinion:', error);
    return NextResponse.json(
      { error: 'Failed to export opinion' },
      { status: 500 }
    );
  }
}

/**
 * Generate PDF from opinion sections
 */
async function generateOpinionPDF(
  title: string,
  sections: any[],
  metadata?: { projectName?: string; clientName?: string }
): Promise<Buffer> {
  const blob = await pdf(
    React.createElement(OpinionPDF, { title, sections, metadata }) as any
  ).toBlob();
  return Buffer.from(await blob.arrayBuffer());
}
