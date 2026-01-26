import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db/prisma';
import { successResponse, parseTaskId, parseNumericId } from '@/lib/utils/apiUtils';
import { AppError, ErrorCodes, AcceptanceErrorCodes } from '@/lib/utils/errorHandler';
import { uploadAcceptanceDocument, getAcceptanceDocuments, deleteAcceptanceDocument } from '@/lib/services/acceptance/documentService';
import { validateAcceptanceAccess } from '@/lib/api/acceptanceMiddleware';
import { sanitizeFilename } from '@/lib/utils/sanitization';
import { logDocumentUploaded, logDocumentDeleted } from '@/lib/services/acceptance/auditLog';
import { secureRoute, Feature } from '@/lib/api/secureRoute';

// File upload constants
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'image/png',
  'image/jpeg',
  'text/plain',
];

const VALID_DOCUMENT_TYPES = ['WECHECK', 'PONG', 'OTHER'] as const;

// Zod schema for DELETE query params
const DeleteDocumentQuerySchema = z.object({
  documentId: z.string().min(1, 'Document ID is required'),
});

/**
 * POST /api/tasks/[id]/acceptance/documents
 * Upload a supporting document with enhanced validation
 */
export const POST = secureRoute.fileUploadWithParams({
  feature: Feature.MANAGE_TASKS,
  taskIdParam: 'id',
  taskRole: 'EDITOR',
  handler: async (request, { user, params }) => {
    const taskId = parseTaskId(params.id);

    // Validate user has access to project
    const hasAccess = await validateAcceptanceAccess(taskId, user.id);
    if (!hasAccess) {
      throw new AppError(
        403,
        'Forbidden',
        AcceptanceErrorCodes.INSUFFICIENT_PERMISSIONS
      );
    }

    // Get the active questionnaire response for this project
    const response = await prisma.clientAcceptanceResponse.findFirst({
      where: { taskId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        reviewedAt: true,
      },
    });

    if (!response) {
      throw new AppError(
        404,
        'Questionnaire not initialized',
        AcceptanceErrorCodes.QUESTIONNAIRE_NOT_INITIALIZED
      );
    }

    // Check if questionnaire is locked (reviewed)
    if (response.reviewedAt) {
      throw new AppError(
        403,
        'Cannot upload documents after review',
        AcceptanceErrorCodes.CANNOT_MODIFY_AFTER_REVIEW
      );
    }

    // Parse multipart form data
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const documentType = (formData.get('documentType') as string) || 'OTHER';

    if (!file) {
      throw new AppError(400, 'No file provided', ErrorCodes.VALIDATION_ERROR);
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      throw new AppError(
        400,
        `File size exceeds ${MAX_FILE_SIZE / 1024 / 1024}MB limit`,
        AcceptanceErrorCodes.FILE_TOO_LARGE
      );
    }

    // Validate MIME type
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      throw new AppError(
        400,
        'File type not allowed. Allowed types: PDF, Word, Excel, PNG, JPEG',
        AcceptanceErrorCodes.INVALID_DOCUMENT_TYPE
      );
    }

    // Validate document type
    if (!VALID_DOCUMENT_TYPES.includes(documentType as typeof VALID_DOCUMENT_TYPES[number])) {
      throw new AppError(
        400,
        'Invalid document type',
        AcceptanceErrorCodes.INVALID_DOCUMENT_TYPE
      );
    }

    // Sanitize filename
    const sanitizedFilename = sanitizeFilename(file.name);

    // Convert file to buffer
    const buffer = Buffer.from(await file.arrayBuffer());

    // Upload document
    const document = await uploadAcceptanceDocument({
      responseId: response.id,
      documentType: documentType as typeof VALID_DOCUMENT_TYPES[number],
      file: {
        name: sanitizedFilename,
        data: buffer,
        size: file.size,
      },
      uploadedBy: user.email || user.id,
    });

    // Audit log
    await logDocumentUploaded(taskId, user.id, document.id, sanitizedFilename, documentType);

    return NextResponse.json(successResponse(document), { status: 201 });
  },
});

/**
 * GET /api/tasks/[id]/acceptance/documents
 * Get all documents for the questionnaire
 */
export const GET = secureRoute.queryWithParams({
  feature: Feature.ACCESS_TASKS,
  taskIdParam: 'id',
  taskRole: 'VIEWER',
  handler: async (request, { user, params }) => {
    const taskId = parseTaskId(params.id);

    // Validate user has access to task
    const hasAccess = await validateAcceptanceAccess(taskId, user.id);
    if (!hasAccess) {
      throw new AppError(
        403,
        'Forbidden',
        AcceptanceErrorCodes.INSUFFICIENT_PERMISSIONS
      );
    }

    // Get the active questionnaire response for this task
    const response = await prisma.clientAcceptanceResponse.findFirst({
      where: { taskId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
      },
    });

    if (!response) {
      throw new AppError(
        404,
        'Questionnaire not initialized',
        AcceptanceErrorCodes.QUESTIONNAIRE_NOT_INITIALIZED
      );
    }

    const documents = await getAcceptanceDocuments(response.id);

    return NextResponse.json(successResponse(documents), {
      headers: {
        'Cache-Control': 'no-store',
      },
    });
  },
});

/**
 * DELETE /api/tasks/[id]/acceptance/documents
 * Delete a document with authorization and audit
 * Note: documentId passed as query param
 */
export const DELETE = secureRoute.mutationWithParams({
  feature: Feature.MANAGE_TASKS,
  taskIdParam: 'id',
  taskRole: 'EDITOR',
  handler: async (request, { user, params }) => {
    const taskId = parseTaskId(params.id);

    const { searchParams } = new URL(request.url);
    const queryResult = DeleteDocumentQuerySchema.safeParse({
      documentId: searchParams.get('documentId'),
    });

    if (!queryResult.success) {
      throw new AppError(
        400,
        'Document ID required',
        ErrorCodes.VALIDATION_ERROR
      );
    }

    const documentId = parseNumericId(queryResult.data.documentId, 'Document');

    // Validate user has access to task
    const hasAccess = await validateAcceptanceAccess(taskId, user.id);
    if (!hasAccess) {
      throw new AppError(
        403,
        'Forbidden',
        AcceptanceErrorCodes.INSUFFICIENT_PERMISSIONS
      );
    }

    // Get document details for audit log
    const document = await prisma.acceptanceDocument.findUnique({
      where: { id: documentId },
      select: {
        id: true,
        fileName: true,
        ClientAcceptanceResponse: {
          select: {
            reviewedAt: true,
          },
        },
      },
    });

    if (!document) {
      throw new AppError(404, 'Document not found', ErrorCodes.NOT_FOUND);
    }

    // Check if questionnaire is locked
    if (document.ClientAcceptanceResponse.reviewedAt) {
      throw new AppError(
        403,
        'Cannot delete documents after review',
        AcceptanceErrorCodes.CANNOT_MODIFY_AFTER_REVIEW
      );
    }

    // Delete document
    await deleteAcceptanceDocument(documentId);

    // Audit log
    await logDocumentDeleted(taskId, user.id, documentId, document.fileName);

    return NextResponse.json(successResponse({ deleted: true }));
  },
});
