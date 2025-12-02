import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { DocumentExtractor } from '@/lib/services/documents/documentExtractor';
import { enforceRateLimit, RateLimitPresets } from '@/lib/utils/rateLimit';
import { handleApiError } from '@/lib/utils/errorHandler';
import { logger } from '@/lib/utils/logger';

const MAX_FILE_SIZE = parseInt(process.env.MAX_FILE_UPLOAD_SIZE || '10485760'); // 10MB default

/**
 * POST /api/projects/[id]/tax-adjustments/[adjustmentId]/documents
 * Upload document for a tax adjustment
 */
export async function POST(
  request: NextRequest,
  routeContext: { params: Promise<{ id: string; adjustmentId: string }> }
) {
  try {
    // Apply rate limiting for file uploads
    enforceRateLimit(request, RateLimitPresets.FILE_UPLOADS);
    
    const params = await routeContext.params;
    const projectId = parseInt(params.id);
    const adjustmentId = parseInt(params.adjustmentId);

    // Parse multipart form data
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const uploadedBy = formData.get('uploadedBy') as string;
    const context = formData.get('context') as string;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `File size exceeds maximum of ${MAX_FILE_SIZE / 1024 / 1024}MB` },
        { status: 400 }
      );
    }

    // Validate file type
    const allowedTypes = [
      'application/pdf',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/csv',
    ];

    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Only PDF, Excel, and CSV files are allowed.' },
        { status: 400 }
      );
    }

    // Save file to disk
    const buffer = Buffer.from(await file.arrayBuffer());
    const filePath = await DocumentExtractor.saveFile(buffer, file.name, projectId);

    // Determine file type
    let fileType = 'UNKNOWN';
    if (file.type.includes('pdf')) fileType = 'PDF';
    else if (file.type.includes('sheet') || file.type.includes('excel')) fileType = 'EXCEL';
    else if (file.type.includes('csv')) fileType = 'CSV';

    // Create document record
    const document = await prisma.adjustmentDocument.create({
      data: {
        projectId,
        taxAdjustmentId: adjustmentId,
        fileName: file.name,
        fileType,
        fileSize: file.size,
        filePath,
        uploadedBy,
        extractionStatus: 'PENDING',
      },
    });

    // Start extraction process asynchronously
    // In production, this should be a background job
    extractDocumentAsync(document.id, filePath, fileType, context);

    return NextResponse.json({
      document,
      message: 'Document uploaded successfully. Extraction in progress.',
    }, { status: 201 });
  } catch (error) {
    return handleApiError(error, 'POST /api/projects/[id]/tax-adjustments/[adjustmentId]/documents');
  }
}

/**
 * GET /api/projects/[id]/tax-adjustments/[adjustmentId]/documents
 * Get all documents for a tax adjustment
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string; adjustmentId: string }> }
) {
  try {
    const params = await context.params;
    const adjustmentId = parseInt(params.adjustmentId);

    const documents = await prisma.adjustmentDocument.findMany({
      where: { taxAdjustmentId: adjustmentId },
      orderBy: { createdAt: 'desc' },
    });

    // Parse extracted data
    const documentsWithParsedData = documents.map((doc) => ({
      ...doc,
      extractedData: doc.extractedData ? JSON.parse(doc.extractedData) : null,
    }));

    return NextResponse.json(documentsWithParsedData);
  } catch (error) {
    return handleApiError(error, 'GET /api/projects/[id]/tax-adjustments/[adjustmentId]/documents');
  }
}

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
      include: { TaxAdjustment: true },
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
    logger.error('Extraction error', error);
    
    await prisma.adjustmentDocument.update({
      where: { id: documentId },
      data: {
        extractionStatus: 'FAILED',
        extractionError: error instanceof Error ? error.message : 'Unknown error',
      },
    });
  }
}

