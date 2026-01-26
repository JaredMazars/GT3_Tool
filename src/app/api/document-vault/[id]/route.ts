import { NextRequest, NextResponse } from 'next/server';
import { secureRoute } from '@/lib/api/secureRoute';
import { Feature } from '@/lib/permissions/features';
import { prisma } from '@/lib/db/prisma';
import { successResponse } from '@/lib/utils/apiUtils';
import { canViewDocument } from '@/lib/services/document-vault/documentVaultAuthorization';
import { getCachedDocumentDetail, cacheDocumentDetail } from '@/lib/services/document-vault/documentVaultCache';

/**
 * GET /api/document-vault/[id]
 * Get document details including AI summary and version history
 */
export const GET = secureRoute.queryWithParams<{ id: string }>({
  feature: Feature.ACCESS_DOCUMENT_VAULT,
  handler: async (request, { user, params }) => {
    const documentId = parseInt(params.id);

    if (isNaN(documentId)) {
      return NextResponse.json(
        { error: 'Invalid document ID' },
        { status: 400 }
      );
    }

    // Check cache
    const cached = await getCachedDocumentDetail(documentId);
    if (cached) {
      // Still need to verify access
      const hasAccess = await canViewDocument(user.id, {
        scope: cached.scope,
        serviceLine: cached.serviceLine,
      });

      if (!hasAccess) {
        return NextResponse.json(
          { error: 'Access denied' },
          { status: 403 }
        );
      }

      return NextResponse.json(successResponse(cached));
    }

    // Fetch document
    const document = await prisma.vaultDocument.findUnique({
      where: { id: documentId },
      select: {
        id: true,
        title: true,
        description: true,
        documentType: true,
        fileName: true,
        fileSize: true,
        mimeType: true,
        scope: true,
        serviceLine: true,
        version: true,
        status: true,
        aiExtractionStatus: true,
        aiSummary: true,
        aiKeyPoints: true,
        tags: true,
        effectiveDate: true,
        expiryDate: true,
        publishedAt: true,
        createdAt: true,
        updatedAt: true,
        VaultDocumentCategory: {
          select: {
            id: true,
            name: true,
            description: true,
            icon: true,
            color: true,
            documentType: true,
          },
        },
        User: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        VaultDocumentVersion: {
          select: {
            id: true,
            version: true,
            fileName: true,
            fileSize: true,
            uploadedBy: true,
            uploadedAt: true,
            supersededAt: true,
            changeNotes: true,
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

    // Only published documents are accessible via public API
    if (document.status !== 'PUBLISHED') {
      return NextResponse.json(
        { error: 'Document not found' },
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

    // Parse JSON fields
    const result = {
      ...document,
      aiKeyPoints: document.aiKeyPoints ? JSON.parse(document.aiKeyPoints) : null,
      tags: document.tags ? JSON.parse(document.tags) : null,
      category: document.VaultDocumentCategory,
      uploader: document.User,
      versions: document.VaultDocumentVersion,
    };

    // Remove User field (we already have uploader)
    delete (result as any).User;
    delete (result as any).VaultDocumentVersion;
    delete (result as any).VaultDocumentCategory;

    // Cache result
    await cacheDocumentDetail(documentId, result);

    return NextResponse.json(successResponse(result));
  },
});
