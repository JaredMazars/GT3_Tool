import { NextRequest, NextResponse } from 'next/server';
import { checkClientAccess } from '@/lib/services/auth/auth';
import { prisma } from '@/lib/db/prisma';
import { successResponse } from '@/lib/utils/apiUtils';
import { AppError, ErrorCodes } from '@/lib/utils/errorHandler';
import { CreditRatingAnalyzer } from '@/lib/services/analytics/creditRatingAnalyzer';
import { logger } from '@/lib/utils/logger';
import { CreditRatingQuerySchema, GenerateCreditRatingSchema, GSClientIDSchema } from '@/lib/validation/schemas';
import { parseCreditAnalysisReport, parseFinancialRatios, safeStringifyJSON } from '@/lib/utils/jsonValidation';
import { CreditAnalysisReportSchema, FinancialRatiosSchema } from '@/lib/validation/schemas';
import { secureRoute, Feature } from '@/lib/api/secureRoute';

/**
 * GET /api/clients/[id]/analytics/rating
 * Fetch credit rating history for a client
 */
export const GET = secureRoute.queryWithParams<{ id: string }>({
  feature: Feature.ACCESS_CLIENTS,
  handler: async (request, { user, params }) => {
    const GSClientID = params.id;

    // Validate GSClientID is a valid GUID
    const validationResult = GSClientIDSchema.safeParse(GSClientID);
    if (!validationResult.success) {
      throw new AppError(400, 'Invalid client ID format. Expected GUID.', ErrorCodes.VALIDATION_ERROR);
    }

    // SECURITY: Check authorization
    const hasAccess = await checkClientAccess(user.id, GSClientID);
    if (!hasAccess) {
      logger.warn('Unauthorized rating access attempt', {
        userId: user.id,
        GSClientID,
      });
      throw new AppError(403, 'Forbidden', ErrorCodes.FORBIDDEN);
    }

    // VALIDATION: Validate and parse query parameters
    const { searchParams } = new URL(request.url);
    const queryParams: Record<string, string | null> = {};
    
    if (searchParams.has('limit')) {
      queryParams.limit = searchParams.get('limit');
    }
    if (searchParams.has('startDate')) {
      queryParams.startDate = searchParams.get('startDate');
    }
    if (searchParams.has('endDate')) {
      queryParams.endDate = searchParams.get('endDate');
    }
    
    const queryValidation = CreditRatingQuerySchema.safeParse(queryParams);

    if (!queryValidation.success) {
      logger.warn('Credit rating query validation failed', {
        GSClientID,
        queryParams,
        errors: queryValidation.error.errors,
      });
      throw new AppError(400, 'Invalid query parameters', ErrorCodes.VALIDATION_ERROR, {
        details: queryValidation.error.errors,
      });
    }

    const { limit, startDate, endDate } = queryValidation.data;

    // Get client by GSClientID to get numeric id
    const client = await prisma.client.findUnique({
      where: { GSClientID: GSClientID },
      select: { id: true },
    });

    if (!client) {
      throw new AppError(404, 'Client not found', ErrorCodes.NOT_FOUND);
    }

    // Build type-safe where clause
    interface WhereClause {
      clientId: number; // Internal ID field
      ratingDate?: {
        gte?: Date;
        lte?: Date;
      };
    }
    const where: WhereClause = { clientId: client.id };
    if (startDate || endDate) {
      where.ratingDate = {
        ...(startDate && { gte: startDate }),
        ...(endDate && { lte: endDate }),
      };
    }

    // Fetch ratings with explicit select
    const ratings = await prisma.clientCreditRating.findMany({
      where,
      orderBy: [
        { ratingDate: 'desc' },
        { id: 'desc' }, // Deterministic secondary sort
      ],
      take: limit,
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
              },
            },
          },
        },
      },
    });

    logger.info('Fetched credit ratings', {
      GSClientID,
      clientDbId: client.id,
      ratingsFound: ratings.length,
      limit,
    });

    // Transform the data with safe JSON parsing
    const transformedRatings = ratings.map((rating) => {
      try {
        return {
          ...rating,
          analysisReport: parseCreditAnalysisReport(rating.analysisReport),
          financialRatios: parseFinancialRatios(rating.financialRatios),
          documents: rating.CreditRatingDocument.map((d) => d.ClientAnalyticsDocument),
          CreditRatingDocument: undefined, // Remove from response
        };
      } catch (error) {
        logger.error('Error transforming rating', {
          ratingId: rating.id,
          error: error instanceof Error ? error.message : String(error),
        });
        throw error;
      }
    });

    return NextResponse.json(
      successResponse({
        ratings: transformedRatings,
        totalCount: transformedRatings.length,
      })
    );
  },
});

/**
 * POST /api/clients/[id]/analytics/rating
 * Generate a new credit rating (AI endpoint - strict rate limiting)
 */
export const POST = secureRoute.aiWithParams<
  typeof GenerateCreditRatingSchema,
  { id: string }
>({
  feature: Feature.MANAGE_CLIENTS,
  schema: GenerateCreditRatingSchema,
  handler: async (request, { user, params, data }) => {
    const GSClientID = params.id;

    // Validate GSClientID is a valid GUID
    const validationResult = GSClientIDSchema.safeParse(GSClientID);
    if (!validationResult.success) {
      throw new AppError(400, 'Invalid client ID format. Expected GUID.', ErrorCodes.VALIDATION_ERROR);
    }

    // SECURITY: Check authorization
    const hasAccess = await checkClientAccess(user.id, GSClientID);
    if (!hasAccess) {
      logger.warn('Unauthorized rating generation attempt', {
        userId: user.id,
        GSClientID,
      });
      throw new AppError(403, 'Forbidden', ErrorCodes.FORBIDDEN);
    }

    const { documentIds } = data;

    // Verify client exists
    const client = await prisma.client.findUnique({
      where: { GSClientID: GSClientID },
      select: {
        id: true,
        clientNameFull: true,
        clientCode: true,
        industry: true,
        sector: true,
      },
    });

    if (!client) {
      throw new AppError(404, 'Client not found', ErrorCodes.NOT_FOUND);
    }

    // Fetch documents with explicit select
    const documents = await prisma.clientAnalyticsDocument.findMany({
      where: {
        id: { in: documentIds },
        clientId: client.id,
      },
      select: {
        id: true,
        fileName: true,
        documentType: true,
        extractedData: true,
      },
    });

    if (documents.length === 0) {
      throw new AppError(404, 'No valid documents found for the provided IDs', ErrorCodes.NOT_FOUND);
    }

    if (documents.length !== documentIds.length) {
      throw new AppError(400, 'Some document IDs are invalid', ErrorCodes.VALIDATION_ERROR, {
        found: documents.length,
        requested: documentIds.length,
      });
    }

    logger.info('Starting credit rating generation', {
      GSClientID,
      clientDbId: client.id,
      clientName: client.clientNameFull || client.clientCode,
      documentCount: documents.length,
      userId: user.email,
    });

    // Generate credit rating using AI
    const result = await CreditRatingAnalyzer.analyzeCreditRating(
      {
        id: client.id,
        name: client.clientNameFull || client.clientCode,
        industry: client.industry || undefined,
        sector: client.sector || undefined,
      },
      documents.map((doc) => ({
        id: doc.id,
        fileName: doc.fileName,
        documentType: doc.documentType,
        extractedData: doc.extractedData,
      }))
    );

    // Log what we're about to save
    logger.info('Credit rating analysis completed', {
      GSClientID,
      clientDbId: client.id,
      ratingGrade: result.ratingGrade,
      ratingScore: result.ratingScore,
      confidence: result.confidence,
    });

    // DATA INTEGRITY: Save rating and document associations in a transaction
    const completeRating = await prisma.$transaction(async (tx) => {
      // Validate and stringify JSON data before saving
      const analysisReportJson = safeStringifyJSON(
        result.analysisReport,
        CreditAnalysisReportSchema,
        'analysisReport'
      );
      const financialRatiosJson = safeStringifyJSON(
        result.financialRatios,
        FinancialRatiosSchema,
        'financialRatios'
      );

      // Create rating with explicit field mapping
      const rating = await tx.clientCreditRating.create({
        data: {
          clientId: client.id,
          ratingScore: result.ratingScore,
          ratingGrade: result.ratingGrade,
          analysisReport: analysisReportJson,
          financialRatios: financialRatiosJson,
          confidence: result.confidence,
          analyzedBy: user.email!,
          updatedAt: new Date(),
        },
        select: { id: true },
      });

      // Create junction table entries linking rating to documents
      await tx.creditRatingDocument.createMany({
        data: documentIds.map((docId: number) => ({
          creditRatingId: rating.id,
          analyticsDocumentId: docId,
        })),
      });

      // Fetch complete rating with explicit select
      const complete = await tx.clientCreditRating.findUnique({
        where: { id: rating.id },
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
                },
              },
            },
          },
        },
      });

      if (!complete) {
        throw new AppError(500, 'Failed to fetch created rating', ErrorCodes.INTERNAL_ERROR);
      }

      return complete;
    });

    // Transform response with safe JSON parsing
    const transformedRating = {
      ...completeRating,
      analysisReport: parseCreditAnalysisReport(completeRating.analysisReport),
      financialRatios: parseFinancialRatios(completeRating.financialRatios),
      documents: completeRating.CreditRatingDocument.map((d) => d.ClientAnalyticsDocument),
      CreditRatingDocument: undefined, // Remove from response
    };

    // Verify data was saved correctly
    logger.info('Credit rating saved successfully to database', {
      ratingId: completeRating.id,
      GSClientID,
      clientDbId: client.id,
      ratingGrade: completeRating.ratingGrade,
      analyzedBy: completeRating.analyzedBy,
      documentsLinked: completeRating.CreditRatingDocument.length,
    });

    return NextResponse.json(successResponse(transformedRating), { status: 201 });
  },
});

