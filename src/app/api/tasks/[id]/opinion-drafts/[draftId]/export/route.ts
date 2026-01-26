import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { WordExporter } from '@/lib/services/export/wordExporter';
import { logger } from '@/lib/utils/logger';
import React from 'react';
import { pdf } from '@react-pdf/renderer';
import { OpinionPDF } from '@/components/pdf/OpinionPDF';
import { secureRoute, Feature } from '@/lib/api/secureRoute';
import { parseTaskId, parseNumericId } from '@/lib/utils/apiUtils';
import { AppError, ErrorCodes } from '@/lib/utils/errorHandler';
import { ExportOpinionSchema } from '@/lib/validation/schemas';

// Helper to verify draft belongs to task
async function verifyDraftBelongsToTask(draftId: number, taskId: number): Promise<void> {
  const draft = await prisma.opinionDraft.findFirst({
    where: { id: draftId, taskId },
    select: { id: true },
  });
  
  if (!draft) {
    throw new AppError(404, 'Opinion draft not found or does not belong to this task', ErrorCodes.NOT_FOUND);
  }
}

/**
 * POST /api/tasks/[id]/opinion-drafts/[draftId]/export
 * Export opinion as PDF or Word document
 */
export const POST = secureRoute.mutationWithParams({
  feature: Feature.MANAGE_TASKS,
  taskIdParam: 'id',
  schema: ExportOpinionSchema,
  handler: async (request, { user, params, data }) => {
    const taskId = parseTaskId(params.id);
    const draftId = parseNumericId(params.draftId, 'Draft ID');
    const { format } = data;

    // Verify IDOR protection
    await verifyDraftBelongsToTask(draftId, taskId);

    // Get draft with explicit select
    const draft = await prisma.opinionDraft.findUnique({
      where: { id: draftId },
      select: {
        id: true,
        title: true,
        taskId: true,
      },
    });

    if (!draft) {
      throw new AppError(404, 'Opinion draft not found', ErrorCodes.NOT_FOUND);
    }

    // Get sections with explicit select
    const sections = await prisma.opinionSection.findMany({
      where: { opinionDraftId: draftId },
      select: {
        id: true,
        opinionDraftId: true,
        sectionType: true,
        title: true,
        content: true,
        order: true,
        aiGenerated: true,
        reviewed: true,
        reviewedBy: true,
        reviewedAt: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { order: 'asc' },
    });

    if (sections.length === 0) {
      throw new AppError(
        400,
        'No sections found. Generate sections before exporting.',
        ErrorCodes.VALIDATION_ERROR
      );
    }

    // Get task details for metadata with explicit select
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      select: {
        id: true,
        TaskDesc: true,
        Client: {
          select: {
            clientCode: true,
            clientNameFull: true,
          },
        },
      },
    });

    // Sanitize filename (remove special characters)
    const sanitizedTitle = draft.title.replace(/[^a-z0-9_-]/gi, '_');

    logger.info('Exporting opinion draft', { 
      userId: user.id, 
      taskId, 
      draftId, 
      format, 
      sectionCount: sections.length 
    });

    if (format === 'docx') {
      // Export as Word document
      const buffer = await WordExporter.exportOpinion(draft.title, sections, {
        taskName: task?.TaskDesc,
        clientName: task?.Client?.clientNameFull || task?.Client?.clientCode,
      });

      return new NextResponse(new Uint8Array(buffer), {
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'Content-Disposition': `attachment; filename="${sanitizedTitle}.docx"`,
          'X-Content-Type-Options': 'nosniff',
        },
      });
    } else {
      // Export as PDF
      const pdfBuffer = await generateOpinionPDF(
        draft.title,
        sections,
        {
          taskName: task?.TaskDesc,
          clientName: task?.Client?.clientNameFull || task?.Client?.clientCode,
        }
      );

      return new NextResponse(new Uint8Array(pdfBuffer), {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="${sanitizedTitle}.pdf"`,
          'X-Content-Type-Options': 'nosniff',
        },
      });
    }
  },
});

/**
 * Generate PDF from opinion sections
 */
async function generateOpinionPDF(
  title: string,
  sections: any[],
  metadata?: { taskName?: string; clientName?: string }
): Promise<Buffer> {
  const blob = await pdf(
    React.createElement(OpinionPDF, { title, sections, metadata }) as any
  ).toBlob();
  return Buffer.from(await blob.arrayBuffer());
}
