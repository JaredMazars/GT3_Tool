import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { DocumentExtractor } from '@/lib/services/documents/documentExtractor';

const prisma = new PrismaClient();

/**
 * POST /api/projects/[id]/tax-adjustments/[adjustmentId]/extract
 * Manually trigger or retry extraction for a document
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; adjustmentId: string }> }
) {
  try {
    const resolvedParams = await params;
    const adjustmentId = parseInt(resolvedParams.adjustmentId);
    const body = await request.json();
    const { documentId, context } = body;

    if (!documentId) {
      return NextResponse.json(
        { error: 'documentId is required' },
        { status: 400 }
      );
    }

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
    console.error('Error in extraction process:', error);
    return NextResponse.json(
      { 
        error: 'Extraction failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/projects/[id]/tax-adjustments/[adjustmentId]/extract
 * Get extraction status for all documents of an adjustment
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
    console.error('Error fetching extraction status:', error);
    return NextResponse.json(
      { error: 'Failed to fetch extraction status' },
      { status: 500 }
    );
  }
}


