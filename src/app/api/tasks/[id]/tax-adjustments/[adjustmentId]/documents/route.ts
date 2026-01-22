import { NextResponse } from 'next/server';
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
import { logger } from '@/lib/utils/logger';

const MAX_FILE_SIZE = Number.parseInt(process.env.MAX_FILE_UPLOAD_SIZE || '10485760'); // 10MB default

// Allowed MIME types for document uploads
const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/csv',
] as const;

// Select fields for document responses
const documentSelect = {
  id: true,
  taskId: true,
  taxAdjustmentId: true,
  fileName: true,
  fileType: true,
  fileSize: true,
  extractionStatus: true,
  extractionError: true,
  uploadedBy: true,
  createdAt: true,
  updatedAt: true,
};

/**
 * POST /api/tasks/[id]/tax-adjustments/[adjustmentId]/documents
 * Upload document for a tax adjustment
 */
export const POST = secureRoute.fileUploadWithParams({
  feature: Feature.MANAGE_TASKS,
  taskIdParam: 'id',
  taskRole: 'EDITOR',
  handler: async (request, { user, params }) => {
    const taskId = parseTaskId(params.id);
    const adjustmentId = parseAdjustmentId(params.adjustmentId);

    // IDOR protection: verify adjustment belongs to task
    await verifyAdjustmentBelongsToTask(adjustmentId, taskId);

    // Parse multipart form data
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const context = formData.get('context') as string | null;

    if (!file) {
      throw new AppError(
        400,
        'No file provided',
        ErrorCodes.VALIDATION_ERROR
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      throw new AppError(
        400,
        `File size exceeds maximum of ${MAX_FILE_SIZE / 1024 / 1024}MB`,
        ErrorCodes.VALIDATION_ERROR,
        { fileSize: file.size, maxSize: MAX_FILE_SIZE }
      );
    }

    // Validate file type against allowlist
    if (!ALLOWED_MIME_TYPES.includes(file.type as typeof ALLOWED_MIME_TYPES[number])) {
      throw new AppError(
        400,
        'Invalid file type. Only PDF, Excel, and CSV files are allowed.',
        ErrorCodes.VALIDATION_ERROR,
        { providedType: file.type }
      );
    }

    // Save file to disk
    const buffer = Buffer.from(await file.arrayBuffer());
    const filePath = await DocumentExtractor.saveFile(buffer, file.name, taskId);

    // Determine file type
    let fileType = 'UNKNOWN';
    if (file.type.includes('pdf')) fileType = 'PDF';
    else if (file.type.includes('sheet') || file.type.includes('excel')) fileType = 'EXCEL';
    else if (file.type.includes('csv')) fileType = 'CSV';

    // Create document record
    const document = await prisma.adjustmentDocument.create({
      data: {
        taskId,
        taxAdjustmentId: adjustmentId,
        fileName: file.name,
        fileType,
        fileSize: file.size,
        filePath,
        uploadedBy: user.id,
        extractionStatus: 'PENDING',
        updatedAt: new Date(),
      },
      select: documentSelect,
    });

    // Start extraction process asynchronously
    // In production, this should be a background job
    extractDocumentAsync(document.id, filePath, fileType, context || undefined);

    return NextResponse.json(
      successResponse(document, { message: 'Document uploaded successfully. Extraction in progress.' }),
      { status: 201 }
    );
  },
});

/**
 * GET /api/tasks/[id]/tax-adjustments/[adjustmentId]/documents
 * Get all documents for a tax adjustment
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
        ...documentSelect,
        extractedData: true,
      },
      orderBy: [
        { createdAt: 'desc' },
        { id: 'desc' }, // Secondary sort for deterministic ordering
      ],
      take: 100, // Limit results
    });

    // Parse extracted data
    const documentsWithParsedData = documents.map((doc) => ({
      ...doc,
      extractedData: doc.extractedData ? JSON.parse(doc.extractedData) : null,
    }));

    return NextResponse.json(successResponse(documentsWithParsedData));
  },
});

/**
 * Background extraction function
 */
async function extractDocumentAsync(
  documentId: number,
  filePath: string,
  fileType: string,
  context?: string
) {
  try {
    // Update status to PROCESSING
    await prisma.adjustmentDocument.update({
      where: { id: documentId },
      data: { extractionStatus: 'PROCESSING' },
    });

    // Extract data
    const extractedData = await DocumentExtractor.extractFromDocument(
      filePath,
      fileType,
      context
    );

    // Update document with extracted data
    await prisma.adjustmentDocument.update({
      where: { id: documentId },
      data: {
        extractionStatus: 'COMPLETED',
        extractedData: JSON.stringify(extractedData),
      },
    });

    // Update the associated tax adjustment with extracted data
    const document = await prisma.adjustmentDocument.findUnique({
      where: { id: documentId },
      select: {
        taxAdjustmentId: true,
        TaxAdjustment: {
          select: {
            id: true,
            extractedData: true,
          },
        },
      },
    });

    if (document?.TaxAdjustment) {
      const currentExtractedData = document.TaxAdjustment.extractedData
        ? JSON.parse(document.TaxAdjustment.extractedData)
        : {};

      await prisma.taxAdjustment.update({
        where: { id: document.taxAdjustmentId! },
        data: {
          extractedData: JSON.stringify({
            ...currentExtractedData,
            [documentId]: extractedData,
          }),
        },
      });
    }
  } catch (error) {
    logger.error('Document extraction error', error);

    await prisma.adjustmentDocument.update({
      where: { id: documentId },
      data: {
        extractionStatus: 'FAILED',
        extractionError: error instanceof Error ? error.message : 'Unknown error',
      },
    });
  }
}
