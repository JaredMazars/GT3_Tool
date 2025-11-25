import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, checkClientAccess } from '@/lib/services/auth/auth';
import { prisma } from '@/lib/db/prisma';
import { successResponse } from '@/lib/utils/apiUtils';
import { handleApiError } from '@/lib/utils/errorHandler';
import { logger } from '@/lib/utils/logger';
import fs from 'fs/promises';

/**
 * DELETE /api/clients/[id]/analytics/documents/[documentId]
 * Delete a specific analytics document
 */
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string; documentId: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id, documentId } = await context.params;
    const clientId = parseInt(id);
    const docId = parseInt(documentId);

    if (isNaN(clientId) || isNaN(docId)) {
      return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
    }

    // SECURITY: Check authorization
    const hasAccess = await checkClientAccess(user.id, clientId);
    if (!hasAccess) {
      logger.warn('Unauthorized document deletion attempt', {
        userId: user.id,
        userEmail: user.email,
        clientId,
        documentId: docId,
      });
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Find the document
    const document = await prisma.clientAnalyticsDocument.findFirst({
      where: {
        id: docId,
        clientId,
      },
    });

    if (!document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    // Check if document is being used in any credit ratings
    const ratingsUsingDoc = await prisma.creditRatingDocument.findMany({
      where: { analyticsDocumentId: docId },
      include: {
        CreditRating: {
          select: {
            id: true,
            ratingDate: true,
            ratingGrade: true,
            ratingScore: true,
            confidence: true,
          },
        },
      },
    });

    if (ratingsUsingDoc.length > 0) {
      return NextResponse.json(
        {
          error: 'Cannot delete document',
          message: `This document is being used in ${ratingsUsingDoc.length} credit rating(s). Please delete those ratings first.`,
          ratingsAffected: ratingsUsingDoc.map((r: any) => r.CreditRating),
        },
        { status: 409 }
      );
    }

    // Delete the file from disk
    try {
      await fs.unlink(document.filePath);
    } catch (fileError) {
      logger.warn('Failed to delete file from disk', {
        error: fileError,
        filePath: document.filePath,
      });
      // Continue with database deletion even if file deletion fails
    }

    // Delete from database
    await prisma.clientAnalyticsDocument.delete({
      where: { id: docId },
    });

    logger.info('Analytics document deleted', {
      documentId: docId,
      clientId,
      fileName: document.fileName,
      deletedBy: user.email,
    });

    return NextResponse.json(
      successResponse({
        message: 'Document deleted successfully',
        documentId: docId,
      })
    );
  } catch (error) {
    return handleApiError(error, 'DELETE /api/clients/[id]/analytics/documents/[documentId]');
  }
}

/**
 * GET /api/clients/[id]/analytics/documents/[documentId]
 * Get a specific analytics document
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

    const { id, documentId } = await context.params;
    const clientId = parseInt(id);
    const docId = parseInt(documentId);

    if (isNaN(clientId) || isNaN(docId)) {
      return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
    }

    // SECURITY: Check authorization
    const hasAccess = await checkClientAccess(user.id, clientId);
    if (!hasAccess) {
      logger.warn('Unauthorized document access attempt', {
        userId: user.id,
        userEmail: user.email,
        clientId,
        documentId: docId,
      });
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Find the document
    const document = await prisma.clientAnalyticsDocument.findFirst({
      where: {
        id: docId,
        clientId,
      },
    });

    if (!document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    return NextResponse.json(successResponse(document));
  } catch (error) {
    return handleApiError(error, 'GET /api/clients/[id]/analytics/documents/[documentId]');
  }
}

