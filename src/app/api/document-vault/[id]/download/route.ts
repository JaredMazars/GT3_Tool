import { NextRequest, NextResponse } from 'next/server';
import { secureRoute } from '@/lib/api/secureRoute';
import { Feature } from '@/lib/permissions/features';
import { prisma } from '@/lib/db/prisma';
import { successResponse } from '@/lib/utils/apiUtils';
import { canViewDocument } from '@/lib/services/document-vault/documentVaultAuthorization';
import { generateVaultDocumentSasUrl } from '@/lib/services/documents/blobStorage';
import { logger } from '@/lib/utils/logger';

/**
 * GET /api/document-vault/[id]/download
 * Generate secure download URL for document
 * Optional version query param to download specific version
 */
export const GET = secureRoute.queryWithParams<{ id: string }>({
  feature: Feature.ACCESS_DOCUMENT_VAULT,
  handler: async (request, { user, params }) => {
    const documentId = parseInt(params.id);
    const { searchParams } = new URL(request.url);
    const versionParam = searchParams.get('version');
    const requestedVersion = versionParam ? parseInt(versionParam) : null;

    if (isNaN(documentId)) {
      return NextResponse.json(
        { error: 'Invalid document ID' },
        { status: 400 }
      );
    }

    // Fetch document
    const document = await prisma.vaultDocument.findUnique({
      where: { id: documentId },
      select: {
        id: true,
        title: true,
        fileName: true,
        filePath: true,
        scope: true,
        serviceLine: true,
        status: true,
        version: true,
        VaultDocumentVersion: {
          select: {
            id: true,
            version: true,
            fileName: true,
            filePath: true,
          },
          orderBy: { version: 'desc' },
        },
      },
    });

    if (!document) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      );
    }

    // Only published documents are downloadable
    if (document.status !== 'PUBLISHED') {
      return NextResponse.json(
        { error: 'Document not available' },
        { status: 404 }
      );
    }

    // Check if user can view this document
    const hasAccess = await canViewDocument(user.id, {
      scope: document.scope as any,
      serviceLine: document.serviceLine,
    });

    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    // Determine which version to download
    let downloadPath: string;
    let downloadFileName: string;

    if (requestedVersion !== null) {
      // Download specific version
      const versionDoc = document.VaultDocumentVersion.find(
        v => v.version === requestedVersion
      );

      if (!versionDoc) {
        return NextResponse.json(
          { error: 'Version not found' },
          { status: 404 }
        );
      }

      downloadPath = versionDoc.filePath;
      downloadFileName = versionDoc.fileName;
    } else {
      // Download latest version (current document)
      downloadPath = document.filePath;
      downloadFileName = document.fileName;
    }

    // Generate SAS URL (valid for 1 hour)
    try {
      const sasUrl = await generateVaultDocumentSasUrl(downloadPath, 60);

      // Log download for audit
      logger.info('Document downloaded', {
        documentId,
        version: requestedVersion || document.version,
        userId: user.id,
        fileName: downloadFileName,
      });

      return NextResponse.json(
        successResponse({
          downloadUrl: sasUrl,
          fileName: downloadFileName,
          expiresIn: 3600, // seconds
        })
      );
    } catch (error) {
      logger.error('Failed to generate download URL', { error, documentId });
      return NextResponse.json(
        { error: 'Failed to generate download URL' },
        { status: 500 }
      );
    }
  },
});
