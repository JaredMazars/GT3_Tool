import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { WordExporter } from '@/lib/exporters/wordExporter';
import { logger } from '@/lib/logger';

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
        client: true,
      },
    });

    if (format === 'docx') {
      // Export as Word document
      const buffer = await WordExporter.exportOpinion(draft.title, sections, {
        projectName: project?.name,
        clientName: project?.client?.name,
      });

      return new NextResponse(buffer, {
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
      const pdfDoc = await generateOpinionPDF(
        draft.title,
        sections,
        {
          projectName: project?.name,
          clientName: project?.client?.name,
        }
      );

      return new NextResponse(pdfDoc, {
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
  const { jsPDF } = await import('jspdf');
  await import('jspdf-autotable');

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  let yPos = 20;
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  const contentWidth = pageWidth - 2 * margin;

  // Title Page
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.text('TAX OPINION', pageWidth / 2, yPos, { align: 'center' });

  yPos += 15;
  doc.setFontSize(16);
  doc.text(title, pageWidth / 2, yPos, { align: 'center' });

  yPos += 12;
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');

  if (metadata?.clientName) {
    doc.text(`Client: ${metadata.clientName}`, pageWidth / 2, yPos, {
      align: 'center',
    });
    yPos += 8;
  }

  if (metadata?.projectName) {
    doc.text(`Project: ${metadata.projectName}`, pageWidth / 2, yPos, {
      align: 'center',
    });
    yPos += 8;
  }

  yPos += 10;
  doc.text(
    new Date().toLocaleDateString('en-ZA', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }),
    pageWidth / 2,
    yPos,
    { align: 'center' }
  );

  // New page for TOC
  doc.addPage();
  yPos = 20;

  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('TABLE OF CONTENTS', margin, yPos);

  yPos += 12;
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');

  sections.forEach((section, index) => {
    if (yPos > pageHeight - 30) {
      doc.addPage();
      yPos = 20;
    }
    doc.text(`${index + 1}. ${section.title}`, margin, yPos);
    yPos += 7;
  });

  // Sections
  sections.forEach((section, index) => {
    doc.addPage();
    yPos = 20;

    // Section Title
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    const sectionTitle = `${index + 1}. ${section.title.toUpperCase()}`;
    doc.text(sectionTitle, margin, yPos);

    // Underline
    yPos += 2;
    doc.setLineWidth(0.5);
    doc.setDrawColor(46, 90, 172); // Forvis blue
    doc.line(margin, yPos, pageWidth - margin, yPos);

    yPos += 10;

    // Section Content
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0, 0, 0);

    const paragraphs = section.content.split('\n\n');
    paragraphs.forEach((para: string) => {
      if (para.trim()) {
        const lines = doc.splitTextToSize(para.trim(), contentWidth);
        lines.forEach((line: string) => {
          if (yPos > pageHeight - 30) {
            doc.addPage();
            yPos = 20;
          }
          doc.text(line, margin, yPos);
          yPos += 6;
        });
        yPos += 4; // Space between paragraphs
      }
    });
  });

  // Footer on last page
  doc.addPage();
  yPos = pageHeight / 2;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(128, 128, 128);
  doc.text(
    `Generated on ${new Date().toLocaleDateString('en-ZA')}`,
    pageWidth / 2,
    yPos,
    { align: 'center' }
  );

  return Buffer.from(doc.output('arraybuffer'));
}

