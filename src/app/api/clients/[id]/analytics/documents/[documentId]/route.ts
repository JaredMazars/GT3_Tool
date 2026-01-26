import { NextResponse } from 'next/server';
import { z } from 'zod';
import { checkClientAccess } from '@/lib/services/auth/auth';
import { prisma } from '@/lib/db/prisma';
import { successResponse, parseNumericId } from '@/lib/utils/apiUtils';
import { AppError, ErrorCodes } from '@/lib/utils/errorHandler';
import { logger } from '@/lib/utils/logger';
import fs from 'fs/promises';
import { GSClientIDSchema } from '@/lib/validation/schemas';
import { secureRoute, Feature } from '@/lib/api/secureRoute';

/**
 * DELETE /api/clients/[id]/analytics/documents/[documentId]
 * Delete a specific analytics document
 */
export const DELETE = secureRoute.mutationWithParams<
  z.ZodUndefined,
  { id: string; documentId: string }
>({
  feature: Feature.MANAGE_CLIENTS,
  handler: async (request, { user, params }) => {
    const GSClientID = params.id;
    const docId = parseNumericId(params.documentId, 'Document');

    // Validate GSClientID is a valid GUID
    const validationResult = GSClientIDSchema.safeParse(GSClientID);
    if (!validationResult.success) {
      throw new AppError(400, 'Invalid client ID format. Expected GUID.', ErrorCodes.VALIDATION_ERROR);
    }

    // SECURITY: Check authorization
    const hasAccess = await checkClientAccess(user.id, GSClientID);
    if (!hasAccess) {
      logger.warn('Unauthorized document deletion attempt', {
        userId: user.id,
        GSClientID,
        documentId: docId,
      });
      throw new AppError(403, 'Forbidden', ErrorCodes.FORBIDDEN);
    }

    // Get client by GSClientID to get numeric id
    const client = await prisma.client.findUnique({
      where: { GSClientID: GSClientID },
      select: { id: true },
    });

    if (!client) {
      throw new AppError(404, 'Client not found', ErrorCodes.NOT_FOUND);
    }

    // Find the document with explicit select
    const document = await prisma.clientAnalyticsDocument.findFirst({
      where: {
        id: docId,
        clientId: client.id,
      },
      select: {
        id: true,
        fileName: true,
        filePath: true,
      },
    });

    if (!document) {
      throw new AppError(404, 'Document not found', ErrorCodes.NOT_FOUND);
    }

    // Check if document is being used in any credit ratings
    const ratingsUsingDoc = await prisma.creditRatingDocument.findMany({
      where: { analyticsDocumentId: docId },
      take: 10, // Limit for performance
      select: {
        id: true,
        ClientCreditRating: {
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
      throw new AppError(
        409,
        `This document is being used in ${ratingsUsingDoc.length} credit rating(s). Please delete those ratings first.`,
        ErrorCodes.CONFLICT,
        { ratingsAffected: ratingsUsingDoc.map((r) => r.ClientCreditRating) }
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
      GSClientID,
      clientDbId: client.id,
      fileName: document.fileName,
      deletedBy: user.email,
    });

    return NextResponse.json(
      successResponse({
        message: 'Document deleted successfully',
        documentId: docId,
      })
    );
  },
});

/**
 * GET /api/clients/[id]/analytics/documents/[documentId]
 * Get a specific analytics document
 */
export const GET = secureRoute.queryWithParams<{ id: string; documentId: string }>({
  feature: Feature.ACCESS_CLIENTS,
  handler: async (request, { user, params }) => {
    const GSClientID = params.id;
    const docId = parseNumericId(params.documentId, 'Document');

    // Validate GSClientID is a valid GUID
    const validationResult = GSClientIDSchema.safeParse(GSClientID);
    if (!validationResult.success) {
      throw new AppError(400, 'Invalid client ID format. Expected GUID.', ErrorCodes.VALIDATION_ERROR);
    }

    // SECURITY: Check authorization
    const hasAccess = await checkClientAccess(user.id, GSClientID);
    if (!hasAccess) {
      logger.warn('Unauthorized document access attempt', {
        userId: user.id,
        GSClientID,
        documentId: docId,
      });
      throw new AppError(403, 'Forbidden', ErrorCodes.FORBIDDEN);
    }

    // Get client by GSClientID to get numeric id
    const client = await prisma.client.findUnique({
      where: { GSClientID: GSClientID },
      select: { id: true },
    });

    if (!client) {
      throw new AppError(404, 'Client not found', ErrorCodes.NOT_FOUND);
    }

    // Find the document with explicit select
    const document = await prisma.clientAnalyticsDocument.findFirst({
      where: {
        id: docId,
        clientId: client.id,
      },
      select: {
        id: true,
        clientId: true,
        documentType: true,
        fileName: true,
        filePath: true,
        fileSize: true,
        uploadedBy: true,
        uploadedAt: true,
        extractedData: true,
        updatedAt: true,
      },
    });

    if (!document) {
      throw new AppError(404, 'Document not found', ErrorCodes.NOT_FOUND);
    }

    return NextResponse.json(successResponse(document));
  },
});

