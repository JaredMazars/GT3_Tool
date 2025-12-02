import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { getCurrentUser } from '@/lib/services/auth/auth';
import { successResponse } from '@/lib/utils/apiUtils';
import { handleApiError, AcceptanceErrorCodes } from '@/lib/utils/errorHandler';
import { toProjectId } from '@/types/branded';
import { uploadAcceptanceDocument, getAcceptanceDocuments, deleteAcceptanceDocument } from '@/lib/services/acceptance/documentService';
import { validateAcceptanceAccess } from '@/lib/api/acceptanceMiddleware';
import { sanitizeFilename } from '@/lib/utils/sanitization';
import { logDocumentUploaded, logDocumentDeleted } from '@/lib/services/acceptance/auditLog';

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

/**
 * POST /api/projects/[id]/acceptance/documents
 * Upload a supporting document with enhanced validation
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await context.params;
    const projectId = toProjectId(id);

    // Validate user has access to project
    const hasAccess = await validateAcceptanceAccess(projectId, user.id);
    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Forbidden', code: AcceptanceErrorCodes.INSUFFICIENT_PERMISSIONS },
        { status: 403 }
      );
    }

    // Get the active questionnaire response for this project
    const response = await prisma.clientAcceptanceResponse.findFirst({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        reviewedAt: true,
      },
    });

    if (!response) {
      return NextResponse.json(
        { error: 'Questionnaire not initialized', code: AcceptanceErrorCodes.QUESTIONNAIRE_NOT_INITIALIZED },
        { status: 404 }
      );
    }

    // Check if questionnaire is locked (reviewed)
    if (response.reviewedAt) {
      return NextResponse.json(
        { error: 'Cannot upload documents after review', code: AcceptanceErrorCodes.CANNOT_MODIFY_AFTER_REVIEW },
        { status: 403 }
      );
    }

    // Parse multipart form data
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const documentType = (formData.get('documentType') as string) || 'OTHER';

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `File size exceeds ${MAX_FILE_SIZE / 1024 / 1024}MB limit`, code: AcceptanceErrorCodes.FILE_TOO_LARGE },
        { status: 400 }
      );
    }

    // Validate MIME type
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: 'File type not allowed. Allowed types: PDF, Word, Excel, PNG, JPEG', code: AcceptanceErrorCodes.INVALID_DOCUMENT_TYPE },
        { status: 400 }
      );
    }

    // Validate document type
    const validTypes = ['WECHECK', 'PONG', 'OTHER'];
    if (!validTypes.includes(documentType)) {
      return NextResponse.json(
        { error: 'Invalid document type', code: AcceptanceErrorCodes.INVALID_DOCUMENT_TYPE },
        { status: 400 }
      );
    }

    // Sanitize filename
    const sanitizedFilename = sanitizeFilename(file.name);

    // Convert file to buffer
    const buffer = Buffer.from(await file.arrayBuffer());

    // Upload document
    const document = await uploadAcceptanceDocument({
      responseId: response.id,
      documentType: documentType as any,
      file: {
        name: sanitizedFilename,
        data: buffer,
        size: file.size,
      },
      uploadedBy: user.email || user.id,
    });

    // Audit log
    await logDocumentUploaded(projectId, user.id, document.id, sanitizedFilename, documentType);

    return NextResponse.json(successResponse(document), { status: 201 });
  } catch (error) {
    return handleApiError(error, 'POST /api/projects/[id]/acceptance/documents');
  }
}

/**
 * GET /api/projects/[id]/acceptance/documents
 * Get all documents for the questionnaire
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await context.params;
    const projectId = toProjectId(id);

    // Validate user has access to project
    const hasAccess = await validateAcceptanceAccess(projectId, user.id);
    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Forbidden', code: AcceptanceErrorCodes.INSUFFICIENT_PERMISSIONS },
        { status: 403 }
      );
    }

    // Get the active questionnaire response for this project
    const response = await prisma.clientAcceptanceResponse.findFirst({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
      },
    });

    if (!response) {
      return NextResponse.json(
        { error: 'Questionnaire not initialized', code: AcceptanceErrorCodes.QUESTIONNAIRE_NOT_INITIALIZED },
        { status: 404 }
      );
    }

    const documents = await getAcceptanceDocuments(response.id);

    return NextResponse.json(successResponse(documents));
  } catch (error) {
    return handleApiError(error, 'GET /api/projects/[id]/acceptance/documents');
  }
}

/**
 * DELETE /api/projects/[id]/acceptance/documents/[documentId]
 * Delete a document with authorization and audit
 */
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await context.params;
    const projectId = toProjectId(id);

    const { searchParams } = new URL(request.url);
    const documentId = searchParams.get('documentId');

    if (!documentId) {
      return NextResponse.json({ error: 'Document ID required' }, { status: 400 });
    }

    // Validate user has access to project
    const hasAccess = await validateAcceptanceAccess(projectId, user.id);
    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Forbidden', code: AcceptanceErrorCodes.INSUFFICIENT_PERMISSIONS },
        { status: 403 }
      );
    }

    // Get document details for audit log
    const document = await prisma.acceptanceDocument.findUnique({
      where: { id: parseInt(documentId) },
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
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    // Check if questionnaire is locked
    if (document.ClientAcceptanceResponse.reviewedAt) {
      return NextResponse.json(
        { error: 'Cannot delete documents after review', code: AcceptanceErrorCodes.CANNOT_MODIFY_AFTER_REVIEW },
        { status: 403 }
      );
    }

    // Delete document
    await deleteAcceptanceDocument(parseInt(documentId));

    // Audit log
    await logDocumentDeleted(projectId, user.id, parseInt(documentId), document.fileName);

    return NextResponse.json(successResponse({ deleted: true }));
  } catch (error) {
    return handleApiError(error, 'DELETE /api/projects/[id]/acceptance/documents');
  }
}


