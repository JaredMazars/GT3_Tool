import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/services/auth/auth';
import { prisma } from '@/lib/db/prisma';
import { uploadFile, deleteFile } from '@/lib/services/documents/blobStorage';
import { ragEngine } from '@/lib/services/opinions/ragEngine';
import { logger } from '@/lib/utils/logger';

/**
 * GET /api/projects/[id]/opinion-drafts/[draftId]/documents
 * List all documents for an opinion draft
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string; draftId: string } }
) {
  try {
    const session = await getSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const draftId = parseInt(params.draftId);

    const documents = await prisma.opinionDocument.findMany({
      where: { opinionDraftId: draftId },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ success: true, data: documents });
  } catch (error) {
    logger.error('Error fetching opinion documents:', error);
    return NextResponse.json(
      { error: 'Failed to fetch documents' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/projects/[id]/opinion-drafts/[draftId]/documents
 * Upload a new document
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

    // Verify draft exists and belongs to project
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

    // Parse multipart form data
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const category = (formData.get('category') as string) || 'Other';

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate file type
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
    ];

    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Only PDF, Word, and text files are allowed.' },
        { status: 400 }
      );
    }

    // Convert file to buffer
    const buffer = Buffer.from(await file.arrayBuffer());

    // Upload to blob storage
    const filePath = await uploadFile(buffer, file.name, projectId);

    // Get file extension
    const fileType = file.name.split('.').pop() || 'unknown';

    // Create document record
    const document = await prisma.opinionDocument.create({
      data: {
        opinionDraftId: draftId,
        fileName: file.name,
        fileType,
        fileSize: file.size,
        filePath,
        category,
        vectorized: false,
        uploadedBy: session.user.email,
      },
    });

    // Check if RAG is configured and ready
    const isRagReady = ragEngine && ragEngine.isReady();
    let responseMessage = 'Document uploaded successfully.';
    let warning: string | undefined;

    // Index document asynchronously if RAG is configured
    if (isRagReady) {
      responseMessage = 'Document uploaded successfully. Indexing in progress...';
      
      // Start indexing in background
      ragEngine
        .indexDocument(
          document.id,
          draftId,
          file.name,
          category,
          filePath,
          fileType
        )
        .then(async (extractedText) => {
          // Update document with extracted text and vectorized status
          await prisma.opinionDocument.update({
            where: { id: document.id },
            data: {
              extractedText,
              vectorized: true,
            },
          });
          logger.info(`✅ Document ${document.id} (${file.name}) indexed successfully`);
        })
        .catch((error) => {
          logger.error(`❌ Failed to index document ${document.id} (${file.name}):`, error);
        });
    } else {
      // RAG not configured - document uploaded but won't be searchable
      logger.warn(`⚠️ Document ${document.id} (${file.name}) uploaded but Azure AI Search is not configured - document search disabled`);
      warning = 'Azure AI Search is not configured. Document uploaded but AI won\'t be able to search it. Configure AZURE_SEARCH_ENDPOINT and AZURE_SEARCH_API_KEY to enable document search.';
    }

    return NextResponse.json({
      success: true,
      data: document,
      message: responseMessage,
      warning,
      ragEnabled: isRagReady,
    });
  } catch (error) {
    logger.error('Error uploading document:', error);
    return NextResponse.json(
      { error: 'Failed to upload document' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/projects/[id]/opinion-drafts/[draftId]/documents
 * Delete a document
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; draftId: string } }
) {
  try {
    const session = await getSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const documentId = searchParams.get('documentId');

    if (!documentId) {
      return NextResponse.json(
        { error: 'Document ID required' },
        { status: 400 }
      );
    }

    const docId = parseInt(documentId);

    // Get document
    const document = await prisma.opinionDocument.findUnique({
      where: { id: docId },
    });

    if (!document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    // Delete from blob storage
    try {
      await deleteFile(document.filePath);
    } catch (error) {
      logger.warn('Failed to delete file from blob storage:', error);
      // Continue with database deletion even if blob deletion fails
    }

    // Delete from vector index if RAG is configured
    if (ragEngine && typeof ragEngine.deleteDocument === 'function') {
      try {
        await ragEngine.deleteDocument(docId);
      } catch (error) {
        logger.warn('Failed to delete document from vector index:', error);
      }
    }

    // Delete from database
    await prisma.opinionDocument.delete({
      where: { id: docId },
    });

    return NextResponse.json({
      success: true,
      message: 'Document deleted successfully',
    });
  } catch (error) {
    logger.error('Error deleting document:', error);
    return NextResponse.json(
      { error: 'Failed to delete document' },
      { status: 500 }
    );
  }
}

