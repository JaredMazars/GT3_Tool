import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { DocumentExtractor } from '@/lib/services/documents/documentExtractor';
import { handleApiError } from '@/lib/utils/errorHandler';
import { getCurrentUser, checkTaskAccess } from '@/lib/services/tasks/taskAuthorization';
import { toTaskId } from '@/types/branded';
import { z } from 'zod';

const ExtractDocumentSchema = z.object({
  documentId: z.number().int().positive(),
  context: z.string().optional(),
});

/**
 * POST /api/tasks/[id]/tax-adjustments/[adjustmentId]/extract
 * Manually trigger or retry extraction for a document
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string; adjustmentId: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const params = await context.params;
    const taskId = toTaskId(params.id);
    const adjustmentId = Number.parseInt(params.adjustmentId);

    // Check project access (requires EDITOR role or higher)
    const hasAccess = await checkTaskAccess(user.id, taskId, 'EDITOR');
    if (!hasAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const validated = ExtractDocumentSchema.parse(body);
    const { documentId, context: extractContext } = validated;

    // Fetch the document
    const document = await prisma.adjustmentDocument.findUnique({
      where: { id: documentId },
    });

    if (!document) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      );
    }

    if (document.taxAdjustmentId !== adjustmentId) {
      return NextResponse.json(
        { error: 'Document does not belong to this adjustment' },
        { status: 400 }
      );
    }

    // Update status to PROCESSING
    await prisma.adjustmentDocument.update({
      where: { id: documentId },
      data: { 
        extractionStatus: 'PROCESSING',
        extractionError: null,
      },
    });

    try {
      // Perform extraction
      const extractedData = await DocumentExtractor.extractFromDocument(
        document.filePath,
        document.fileType,
        extractContext
      );

      // Update document with extracted data
      await prisma.adjustmentDocument.update({
        where: { id: documentId },
        data: {
          extractionStatus: 'COMPLETED',
          extractedData: JSON.stringify(extractedData),
        },
      });

      // Update the tax adjustment with extracted data
      const adjustment = await prisma.taxAdjustment.findUnique({
        where: { id: adjustmentId },
      });

      if (adjustment) {
        const currentExtractedData = adjustment.extractedData
          ? JSON.parse(adjustment.extractedData)
          : {};

        await prisma.taxAdjustment.update({
          where: { id: adjustmentId },
          data: {
            extractedData: JSON.stringify({
              ...currentExtractedData,
              [documentId]: extractedData,
            }),
          },
        });
      }

      return NextResponse.json({
        message: 'Extraction completed successfully',
        extractedData,
      });
    } catch (extractionError) {
      // Update document with error
      await prisma.adjustmentDocument.update({
        where: { id: documentId },
        data: {
          extractionStatus: 'FAILED',
          extractionError: extractionError instanceof Error 
            ? extractionError.message 
            : 'Unknown error',
        },
      });

      throw extractionError;
    }
  } catch (error) {
    return handleApiError(error, 'POST /api/tasks/[id]/tax-adjustments/[adjustmentId]/extract');
  }
}

/**
 * GET /api/tasks/[id]/tax-adjustments/[adjustmentId]/extract
 * Get extraction status for all documents of an adjustment
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string; adjustmentId: string }> }
) {
  try {
    const params = await context.params;
    const adjustmentId = Number.parseInt(params.adjustmentId);

    const documents = await prisma.adjustmentDocument.findMany({
      where: { taxAdjustmentId: adjustmentId },
      select: {
        id: true,
        fileName: true,
        extractionStatus: true,
        extractionError: true,
        updatedAt: true,
      },
    });

    const summary = {
      total: documents.length,
      pending: documents.filter(d => d.extractionStatus === 'PENDING').length,
      processing: documents.filter(d => d.extractionStatus === 'PROCESSING').length,
      completed: documents.filter(d => d.extractionStatus === 'COMPLETED').length,
      failed: documents.filter(d => d.extractionStatus === 'FAILED').length,
    };

    return NextResponse.json({
      documents,
      summary,
    });
  } catch (error) {
    return handleApiError(error, 'GET /api/tasks/[id]/tax-adjustments/[adjustmentId]/extract');
  }
}


