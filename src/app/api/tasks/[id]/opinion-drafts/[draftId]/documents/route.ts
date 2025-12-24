import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { uploadFile, deleteFile } from '@/lib/services/documents/blobStorage';
import { ragEngine } from '@/lib/tools/tax-opinion/services/ragEngine';
import { logger } from '@/lib/utils/logger';
import { secureRoute, Feature } from '@/lib/api/secureRoute';
import { parseTaskId, parseNumericId, successResponse } from '@/lib/utils/apiUtils';
import { AppError, ErrorCodes } from '@/lib/utils/errorHandler';

// Maximum file size: 50MB
const MAX_FILE_SIZE = 50 * 1024 * 1024;

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
 * GET /api/tasks/[id]/opinion-drafts/[draftId]/documents
 * List all documents for an opinion draft
 */
export const GET = secureRoute.queryWithParams({
  feature: Feature.ACCESS_TASKS,
  taskIdParam: 'id',
  handler: async (request, { user, params }) => {
    const taskId = parseTaskId(params.id);
    const draftId = parseNumericId(params.draftId, 'Draft ID');

    // Verify IDOR protection
    await verifyDraftBelongsToTask(draftId, taskId);

    const documents = await prisma.opinionDocument.findMany({
      where: { opinionDraftId: draftId },
      select: {
        id: true,
        opinionDraftId: true,
        fileName: true,
        fileType: true,
        fileSize: true,
        filePath: true,
        category: true,
        vectorized: true,
        extractedText: true,
        uploadedBy: true,
        createdAt: true,
      },
      orderBy: [
        { createdAt: 'desc' },
        { id: 'desc' },
      ],
      take: 100,
    });

    logger.info('Opinion documents fetched', { userId: user.id, taskId, draftId, count: documents.length });

    return NextResponse.json(successResponse(documents), {
      headers: {
        'Cache-Control': 'no-store',
      },
    });
  },
});

/**
 * POST /api/tasks/[id]/opinion-drafts/[draftId]/documents
 * Upload a new document
 */
export const POST = secureRoute.fileUploadWithParams({
  feature: Feature.MANAGE_TASKS,
  taskIdParam: 'id',
  handler: async (request, { user, params }) => {
    const taskId = parseTaskId(params.id);
    const draftId = parseNumericId(params.draftId, 'Draft ID');

    // Verify IDOR protection
    await verifyDraftBelongsToTask(draftId, taskId);

    // Parse multipart form data
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const category = (formData.get('category') as string) || 'Other';

    if (!file) {
      throw new AppError(400, 'No file provided', ErrorCodes.VALIDATION_ERROR);
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      throw new AppError(
        400,
        `File size exceeds maximum allowed size of ${MAX_FILE_SIZE / 1024 / 1024}MB`,
        ErrorCodes.VALIDATION_ERROR
      );
    }

    // Validate file type (MIME type allowlist)
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
    ];

    if (!allowedTypes.includes(file.type)) {
      throw new AppError(
        400,
        'Invalid file type. Only PDF, Word, and text files are allowed.',
        ErrorCodes.VALIDATION_ERROR
      );
    }

    // Convert file to buffer
    const buffer = Buffer.from(await file.arrayBuffer());

    // Upload to blob storage
    const filePath = await uploadFile(buffer, file.name, taskId);

    // Get file extension
    const fileType = file.name.split('.').pop() || 'unknown';

    // Create document record with explicit field mapping
    const document = await prisma.opinionDocument.create({
      data: {
        opinionDraftId: draftId,
        fileName: file.name,
        fileType,
        fileSize: file.size,
        filePath,
        category,
        vectorized: false,
        uploadedBy: user.email,
      },
      select: {
        id: true,
        opinionDraftId: true,
        fileName: true,
        fileType: true,
        fileSize: true,
        filePath: true,
        category: true,
        vectorized: true,
        uploadedBy: true,
        createdAt: true,
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
          logger.info('Document indexed successfully', { 
            userId: user.id, 
            taskId, 
            draftId, 
            documentId: document.id, 
            fileName: file.name 
          });
        })
        .catch((error) => {
          logger.error('Failed to index document', { 
            error, 
            userId: user.id, 
            taskId, 
            draftId, 
            documentId: document.id, 
            fileName: file.name 
          });
        });
    } else {
      // RAG not configured - document uploaded but won't be searchable
      logger.warn('Document uploaded but Azure AI Search not configured', { 
        userId: user.id, 
        taskId, 
        draftId, 
        documentId: document.id, 
        fileName: file.name 
      });
      warning = 'Azure AI Search is not configured. Document uploaded but AI won\'t be able to search it. Configure AZURE_SEARCH_ENDPOINT and AZURE_SEARCH_API_KEY to enable document search.';
    }

    logger.info('Document uploaded', { 
      userId: user.id, 
      taskId, 
      draftId, 
      documentId: document.id, 
      fileName: file.name, 
      fileSize: file.size,
      ragEnabled: isRagReady 
    });

    return NextResponse.json(
      successResponse({
        ...document,
        message: responseMessage,
        warning,
        ragEnabled: isRagReady,
      })
    );
  },
});

/**
 * DELETE /api/tasks/[id]/opinion-drafts/[draftId]/documents
 * Delete a document
 */
export const DELETE = secureRoute.mutationWithParams({
  feature: Feature.MANAGE_TASKS,
  taskIdParam: 'id',
  handler: async (request, { user, params }) => {
    const taskId = parseTaskId(params.id);
    const draftId = parseNumericId(params.draftId, 'Draft ID');

    // Verify IDOR protection
    await verifyDraftBelongsToTask(draftId, taskId);

    // Validate query parameter
    const { searchParams } = new URL(request.url);
    const documentIdParam = searchParams.get('documentId');

    if (!documentIdParam) {
      throw new AppError(400, 'Document ID required', ErrorCodes.VALIDATION_ERROR);
    }

    const docId = parseNumericId(documentIdParam, 'Document ID');

    // Get document with IDOR check
    const document = await prisma.opinionDocument.findUnique({
      where: { id: docId },
      select: {
        id: true,
        opinionDraftId: true,
        fileName: true,
        filePath: true,
      },
    });

    if (!document) {
      throw new AppError(404, 'Document not found', ErrorCodes.NOT_FOUND);
    }

    // Verify document belongs to the draft (IDOR protection)
    if (document.opinionDraftId !== draftId) {
      throw new AppError(403, 'Document does not belong to this draft', ErrorCodes.FORBIDDEN);
    }

    // Delete from blob storage
    try {
      await deleteFile(document.filePath);
    } catch (error) {
      logger.warn('Failed to delete file from blob storage', { 
        error, 
        userId: user.id, 
        taskId, 
        draftId, 
        documentId: docId 
      });
      // Continue with database deletion even if blob deletion fails
    }

    // Delete from vector index if RAG is configured
    if (ragEngine && typeof ragEngine.deleteDocument === 'function') {
      try {
        await ragEngine.deleteDocument(docId);
      } catch (error) {
        logger.warn('Failed to delete document from vector index', { 
          error, 
          userId: user.id, 
          taskId, 
          draftId, 
          documentId: docId 
        });
      }
    }

    // Delete from database
    await prisma.opinionDocument.delete({
      where: { id: docId },
    });

    logger.info('Document deleted', { 
      userId: user.id, 
      taskId, 
      draftId, 
      documentId: docId, 
      fileName: document.fileName 
    });

    return NextResponse.json(successResponse({ success: true, message: 'Document deleted successfully' }));
  },
});

