import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { DocumentExtractor } from '@/lib/documentExtractor';

const MAX_FILE_SIZE = parseInt(process.env.MAX_FILE_UPLOAD_SIZE || '10485760'); // 10MB default

/**
 * POST /api/projects/[id]/tax-adjustments/[adjustmentId]/documents
 * Upload document for a tax adjustment
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string; adjustmentId: string } }
) {
  try {
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
    console.error('Error uploading document:', error);
    return NextResponse.json(
      { error: 'Failed to upload document' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/projects/[id]/tax-adjustments/[adjustmentId]/documents
 * Get all documents for a tax adjustment
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string; adjustmentId: string } }
) {
  try {
    const adjustmentId = parseInt(params.adjustmentId);

    const documents = await prisma.adjustmentDocument.findMany({
      where: { taxAdjustmentId: adjustmentId },
      orderBy: { createdAt: 'desc' },
    });

    // Parse extracted data
    const documentsWithParsedData = documents.map((doc: any) => ({
      ...doc,
      extractedData: doc.extractedData ? JSON.parse(doc.extractedData) : null,
    }));

    return NextResponse.json(documentsWithParsedData);
  } catch (error) {
    console.error('Error fetching documents:', error);
    return NextResponse.json(
      { error: 'Failed to fetch documents' },
      { status: 500 }
    );
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
      include: { taxAdjustment: true },
    });

    if (document?.taxAdjustment) {
      const currentExtractedData = document.taxAdjustment.extractedData
        ? JSON.parse(document.taxAdjustment.extractedData)
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
    console.error('Extraction error:', error);
    
    await prisma.adjustmentDocument.update({
      where: { id: documentId },
      data: {
        extractionStatus: 'FAILED',
        extractionError: error instanceof Error ? error.message : 'Unknown error',
      },
    });
  }
}

