import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db/prisma';
import { DocumentExtractor } from '@/lib/services/documents/documentExtractor';
import { secureRoute, Feature } from '@/lib/api/secureRoute';
import {
  parseTaskId,
  parseAdjustmentId,
  successResponse,
  verifyAdjustmentBelongsToTask,
} from '@/lib/utils/apiUtils';
import { AppError, ErrorCodes } from '@/lib/utils/errorHandler';

const ExtractDocumentSchema = z.object({
  documentId: z.number().int().positive(),
  context: z.string().max(2000).optional(),
}).strict();

/**
 * POST /api/tasks/[id]/tax-adjustments/[adjustmentId]/extract
 * Manually trigger or retry extraction for a document
 */
export const POST = secureRoute.mutationWithParams({
  feature: Feature.MANAGE_TASKS,
  taskIdParam: 'id',
  taskRole: 'EDITOR',
  schema: ExtractDocumentSchema,
  handler: async (request, { params, data }) => {
    const taskId = parseTaskId(params.id);
    const adjustmentId = parseAdjustmentId(params.adjustmentId);
    const { documentId, context: extractContext } = data;

    // IDOR protection: verify adjustment belongs to task
    await verifyAdjustmentBelongsToTask(adjustmentId, taskId);

    // Fetch the document
    const document = await prisma.adjustmentDocument.findUnique({
      where: { id: documentId },
      select: {
        id: true,
        taxAdjustmentId: true,
        filePath: true,
        fileType: true,
      },
    });

    if (!document) {
      throw new AppError(
        404,
        'Document not found',
        ErrorCodes.NOT_FOUND,
        { documentId }
      );
    }

    // Verify document belongs to this adjustment
    if (document.taxAdjustmentId !== adjustmentId) {
      throw new AppError(
        400,
        'Document does not belong to this adjustment',
        ErrorCodes.VALIDATION_ERROR,
        { documentId, adjustmentId }
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
        select: { extractedData: true },
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

      return NextResponse.json(
        successResponse({ message: 'Extraction completed successfully', extractedData })
      );
    } catch (extractionError) {
      // Update document with error
      await prisma.adjustmentDocument.update({
        where: { id: documentId },
        data: {
          extractionStatus: 'FAILED',
          extractionError:
            extractionError instanceof Error
              ? extractionError.message
              : 'Unknown error',
        },
      });

      throw extractionError;
    }
  },
});

/**
 * GET /api/tasks/[id]/tax-adjustments/[adjustmentId]/extract
 * Get extraction status for all documents of an adjustment
 */
export const GET = secureRoute.queryWithParams({
  feature: Feature.ACCESS_TASKS,
  taskIdParam: 'id',
  handler: async (request, { params }) => {
    const taskId = parseTaskId(params.id);
    const adjustmentId = parseAdjustmentId(params.adjustmentId);

    // IDOR protection: verify adjustment belongs to task
    await verifyAdjustmentBelongsToTask(adjustmentId, taskId);

    const documents = await prisma.adjustmentDocument.findMany({
      where: { taxAdjustmentId: adjustmentId },
      select: {
        id: true,
        fileName: true,
        extractionStatus: true,
        extractionError: true,
        updatedAt: true,
      },
      orderBy: [
        { updatedAt: 'desc' },
        { id: 'desc' },
      ],
      take: 100,
    });

    const summary = {
      total: documents.length,
      pending: documents.filter((d) => d.extractionStatus === 'PENDING').length,
      processing: documents.filter((d) => d.extractionStatus === 'PROCESSING').length,
      completed: documents.filter((d) => d.extractionStatus === 'COMPLETED').length,
      failed: documents.filter((d) => d.extractionStatus === 'FAILED').length,
    };

    return NextResponse.json(successResponse({ documents, summary }));
  },
});
