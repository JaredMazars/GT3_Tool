import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/services/auth/auth';
import { handleApiError, AcceptanceErrorCodes } from '@/lib/utils/errorHandler';
import { getAcceptanceDocument, getDocumentBuffer } from '@/lib/services/acceptance/documentService';
import { validateDocumentAccess } from '@/lib/api/acceptanceMiddleware';
import { logDocumentViewed } from '@/lib/services/acceptance/auditLog';

/**
 * GET /api/projects/[id]/acceptance/documents/[documentId]
 * Download a supporting document with authorization and audit
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string; documentId: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { documentId } = await context.params;
    const docId = parseInt(documentId);

    // Validate user has access to the document's project
    const { hasAccess, projectId } = await validateDocumentAccess(docId, user.id);
    
    if (!hasAccess || !projectId) {
      return NextResponse.json(
        { error: 'Forbidden', code: AcceptanceErrorCodes.INSUFFICIENT_PERMISSIONS },
        { status: 403 }
      );
    }

    // Get document metadata
    const document = await getAcceptanceDocument(docId);

    if (!document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    // Download file from blob storage
    const buffer = await getDocumentBuffer(document);

    // Audit log the document view
    await logDocumentViewed(projectId, user.id, docId, document.fileName);

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
        'Cache-Control': 'private, max-age=3600', // Cache for 1 hour
      },
    });
  } catch (error) {
    return handleApiError(error, 'GET /api/projects/[id]/acceptance/documents/[documentId]');
  }
}

