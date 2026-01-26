import { NextResponse } from 'next/server';
import { parseNumericId } from '@/lib/utils/apiUtils';
import { AppError, ErrorCodes, AcceptanceErrorCodes, handleApiError } from '@/lib/utils/errorHandler';
import { getAcceptanceDocument, getDocumentBuffer } from '@/lib/services/acceptance/documentService';
import { validateDocumentAccess } from '@/lib/api/acceptanceMiddleware';
import { logDocumentViewed } from '@/lib/services/acceptance/auditLog';
import { secureRoute, Feature } from '@/lib/api/secureRoute';

/**
 * GET /api/tasks/[id]/acceptance/documents/[documentId]
 * Download a supporting document with authorization and audit
 */
export const GET = secureRoute.queryWithParams({
  feature: Feature.ACCESS_TASKS,
  handler: async (request, { user, params }) => {
    const docId = parseNumericId(params.documentId, 'Document');

    // Validate user has access to the document's task
    const { hasAccess, taskId } = await validateDocumentAccess(docId, user.id);

    if (!hasAccess || !taskId) {
      throw new AppError(
        403,
        'Forbidden',
        AcceptanceErrorCodes.INSUFFICIENT_PERMISSIONS
      );
    }

    // Get document metadata
    const document = await getAcceptanceDocument(docId);

    if (!document) {
      throw new AppError(404, 'Document not found', ErrorCodes.NOT_FOUND);
    }

    // Download file from blob storage
    const buffer = await getDocumentBuffer(document);

    // Audit log the document view
    await logDocumentViewed(taskId, user.id, docId, document.fileName);

    // Determine content type from file name
    const extension = document.fileName.split('.').pop()?.toLowerCase();
    const contentTypeMap: Record<string, string> = {
      pdf: 'application/pdf',
      doc: 'application/msword',
      docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      xls: 'application/vnd.ms-excel',
      xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      png: 'image/png',
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      txt: 'text/plain',
    };

    const contentType = contentTypeMap[extension || ''] || 'application/octet-stream';

    // Return file (convert Buffer to Uint8Array for NextResponse)
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `inline; filename="${document.fileName}"`,
        'Content-Length': buffer.length.toString(),
        'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  },
});
