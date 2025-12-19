import { NextResponse } from 'next/server';
import { z } from 'zod';
import { checkClientAccess } from '@/lib/services/auth/auth';
import { prisma } from '@/lib/db/prisma';
import { successResponse, parseNumericId } from '@/lib/utils/apiUtils';
import { AppError, ErrorCodes } from '@/lib/utils/errorHandler';
import { parseCreditAnalysisReport, parseFinancialRatios } from '@/lib/utils/jsonValidation';
import { logger } from '@/lib/utils/logger';
import { GSClientIDSchema } from '@/lib/validation/schemas';
import { secureRoute, Feature } from '@/lib/api/secureRoute';

/**
 * GET /api/clients/[id]/analytics/rating/[ratingId]
 * Fetch a specific credit rating with full details
 */
export const GET = secureRoute.queryWithParams<{ id: string; ratingId: string }>({
  feature: Feature.ACCESS_CLIENTS,
  handler: async (request, { user, params }) => {
    const GSClientID = params.id;
    const ratId = parseNumericId(params.ratingId, 'Rating');

    // Validate GSClientID is a valid GUID
    const validationResult = GSClientIDSchema.safeParse(GSClientID);
    if (!validationResult.success) {
      throw new AppError(400, 'Invalid client ID format. Expected GUID.', ErrorCodes.VALIDATION_ERROR);
    }

    // SECURITY: Check authorization
    const hasAccess = await checkClientAccess(user.id, GSClientID);
    if (!hasAccess) {
      logger.warn('Unauthorized rating detail access attempt', {
        userId: user.id,
        GSClientID,
        ratingId: ratId,
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

    // Fetch rating with explicit select
    const rating = await prisma.clientCreditRating.findFirst({
      where: {
        id: ratId,
        clientId: client.id,
      },
      select: {
        id: true,
        clientId: true,
        ratingScore: true,
        ratingGrade: true,
        analysisReport: true,
        financialRatios: true,
        confidence: true,
        analyzedBy: true,
        ratingDate: true,
        createdAt: true,
        updatedAt: true,
        CreditRatingDocument: {
          select: {
            id: true,
            ClientAnalyticsDocument: {
              select: {
                id: true,
                documentType: true,
                fileName: true,
                fileSize: true,
                uploadedBy: true,
                uploadedAt: true,
                extractedData: true,
              },
            },
          },
        },
        Client: {
          select: {
            id: true,
            GSClientID: true,
            clientCode: true,
            clientNameFull: true,
            industry: true,
            sector: true,
          },
        },
      },
    });

    if (!rating) {
      throw new AppError(404, 'Rating not found', ErrorCodes.NOT_FOUND);
    }

    // Transform response with safe JSON parsing
    const transformedRating = {
      ...rating,
      analysisReport: parseCreditAnalysisReport(rating.analysisReport),
      financialRatios: parseFinancialRatios(rating.financialRatios),
      documents: rating.CreditRatingDocument.map((d) => d.ClientAnalyticsDocument),
      CreditRatingDocument: undefined, // Remove from response
    };

    return NextResponse.json(successResponse(transformedRating));
  },
});

/**
 * DELETE /api/clients/[id]/analytics/rating/[ratingId]
 * Delete a specific credit rating
 */
export const DELETE = secureRoute.mutationWithParams<
  z.ZodUndefined,
  { id: string; ratingId: string }
>({
  feature: Feature.MANAGE_CLIENTS,
  handler: async (request, { user, params }) => {
    const GSClientID = params.id;
    const ratId = parseNumericId(params.ratingId, 'Rating');

    // Validate GSClientID is a valid GUID
    const validationResult = GSClientIDSchema.safeParse(GSClientID);
    if (!validationResult.success) {
      throw new AppError(400, 'Invalid client ID format. Expected GUID.', ErrorCodes.VALIDATION_ERROR);
    }

    // SECURITY: Check authorization
    const hasAccess = await checkClientAccess(user.id, GSClientID);
    if (!hasAccess) {
      logger.warn('Unauthorized rating deletion attempt', {
        userId: user.id,
        GSClientID,
        ratingId: ratId,
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

    // Verify rating exists and belongs to client
    const rating = await prisma.clientCreditRating.findFirst({
      where: {
        id: ratId,
        clientId: client.id,
      },
      select: {
        id: true,
        ratingGrade: true,
      },
    });

    if (!rating) {
      throw new AppError(404, 'Rating not found', ErrorCodes.NOT_FOUND);
    }

    // Delete rating (junction table entries will cascade)
    await prisma.clientCreditRating.delete({
      where: { id: ratId },
    });

    // Audit logging for sensitive operation
    logger.info('Credit rating deleted', {
      ratingId: ratId,
      ratingGrade: rating.ratingGrade,
      GSClientID,
      clientDbId: client.id,
      deletedBy: user.email,
      userId: user.id,
    });

    return NextResponse.json(
      successResponse({
        message: 'Rating deleted successfully',
        ratingId: ratId,
      })
    );
  },
});

