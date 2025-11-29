import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, checkClientAccess } from '@/lib/services/auth/auth';
import { prisma } from '@/lib/db/prisma';
import { successResponse } from '@/lib/utils/apiUtils';
import { handleApiError, AppError, ErrorCodes } from '@/lib/utils/errorHandler';
import { CreditRatingAnalyzer } from '@/lib/services/analytics/creditRatingAnalyzer';
import { logger } from '@/lib/utils/logger';
import { CreditRatingQuerySchema, GenerateCreditRatingSchema } from '@/lib/validation/schemas';
import { parseCreditAnalysisReport, parseFinancialRatios, safeStringifyJSON } from '@/lib/utils/jsonValidation';
import { CreditAnalysisReportSchema, FinancialRatiosSchema } from '@/lib/validation/schemas';
import type { Prisma } from '@prisma/client';

/**
 * GET /api/clients/[id]/analytics/rating
 * Fetch credit rating history for a client
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
    const clientId = parseInt(id);

    if (isNaN(clientId)) {
      return NextResponse.json({ error: 'Invalid client ID' }, { status: 400 });
    }

    // SECURITY: Check authorization
    const hasAccess = await checkClientAccess(user.id, clientId);
    if (!hasAccess) {
      logger.warn('Unauthorized rating access attempt', {
        userId: user.id,
        userEmail: user.email,
        clientId,
      });
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
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
        clientId,
        queryParams,
        errors: queryValidation.error.errors,
      });
      return NextResponse.json(
        { error: 'Invalid query parameters', details: queryValidation.error.errors },
        { status: 400 }
      );
    }

    const { limit, startDate, endDate } = queryValidation.data;

    // Build type-safe where clause
    interface WhereClause {
      clientId: number;
      ratingDate?: {
        gte?: Date;
        lte?: Date;
      };
    }
    const where: WhereClause = { clientId };
    if (startDate || endDate) {
      where.ratingDate = {
        ...(startDate && { gte: startDate }),
        ...(endDate && { lte: endDate }),
      };
    }

    // Fetch ratings with documents
    const ratings = await prisma.clientCreditRating.findMany({
      where,
      orderBy: { ratingDate: 'desc' },
      take: limit,
      include: {
        CreditRatingDocument: {
          include: {
            ClientAnalyticsDocument: true,
          },
        },
      },
    });

    logger.info('Fetched credit ratings', {
      clientId,
      ratingsFound: ratings.length,
      limit,
      whereClause: JSON.stringify(where),
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

    logger.info('Transformed credit ratings', {
      clientId,
      transformedCount: transformedRatings.length,
    });

    return NextResponse.json(
      successResponse({
        ratings: transformedRatings,
        totalCount: transformedRatings.length,
      })
    );
  } catch (error) {
    return handleApiError(error, 'GET /api/clients/[id]/analytics/rating');
  }
}

/**
 * POST /api/clients/[id]/analytics/rating
 * Generate a new credit rating
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
    const clientId = parseInt(id);

    if (isNaN(clientId)) {
      return NextResponse.json({ error: 'Invalid client ID' }, { status: 400 });
    }

    // SECURITY: Check authorization
    const hasAccess = await checkClientAccess(user.id, clientId);
    if (!hasAccess) {
      logger.warn('Unauthorized rating generation attempt', {
        userId: user.id,
        userEmail: user.email,
        clientId,
      });
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // VALIDATION: Parse and validate request body
    const body = await request.json();
    const validation = GenerateCreditRatingSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: validation.error.errors },
        { status: 400 }
      );
    }

    const { documentIds } = validation.data;

    // Verify client exists
    const client = await prisma.client.findUnique({
      where: { id: clientId },
      select: {
        id: true,
        clientNameFull: true,
        clientCode: true,
        industry: true,
        sector: true,
      },
    });

    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }

    // Fetch documents
    const documents = await prisma.clientAnalyticsDocument.findMany({
      where: {
        id: { in: documentIds },
        clientId,
      },
    });

    if (documents.length === 0) {
      return NextResponse.json(
        { error: 'No valid documents found for the provided IDs' },
        { status: 404 }
      );
    }

    if (documents.length !== documentIds.length) {
      return NextResponse.json(
        {
          error: 'Some document IDs are invalid',
          found: documents.length,
          requested: documentIds.length,
        },
        { status: 400 }
      );
    }

    logger.info('Starting credit rating generation', {
      clientId,
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
      clientId,
      ratingGrade: result.ratingGrade,
      ratingScore: result.ratingScore,
      confidence: result.confidence,
      hasAnalysisReport: !!result.analysisReport,
      hasFinancialRatios: !!result.financialRatios,
      analysisReportFields: result.analysisReport ? Object.keys(result.analysisReport) : [],
      ratiosCalculated: result.financialRatios ? Object.keys(result.financialRatios).filter(k => result.financialRatios[k as keyof typeof result.financialRatios] !== undefined) : [],
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

      // Create rating
      const rating = await tx.clientCreditRating.create({
        data: {
          clientId,
          ratingScore: result.ratingScore,
          ratingGrade: result.ratingGrade,
          analysisReport: analysisReportJson,
          financialRatios: financialRatiosJson,
          confidence: result.confidence,
          analyzedBy: user.email!,
        },
      });

      // Create junction table entries linking rating to documents
      await tx.creditRatingDocument.createMany({
        data: documentIds.map((docId: number) => ({
          creditRatingId: rating.id,
          analyticsDocumentId: docId,
        })),
      });

      // Fetch complete rating with documents
      const complete = await tx.clientCreditRating.findUnique({
        where: { id: rating.id },
        include: {
          CreditRatingDocument: {
            include: {
              ClientAnalyticsDocument: true,
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
      clientId,
      ratingGrade: completeRating.ratingGrade,
      ratingScore: completeRating.ratingScore,
      confidence: completeRating.confidence,
      analyzedBy: completeRating.analyzedBy,
      documentsLinked: completeRating.CreditRatingDocument.length,
      analysisReportSize: completeRating.analysisReport.length,
      financialRatiosSize: completeRating.financialRatios.length,
      parsedAnalysisFields: Object.keys(transformedRating.analysisReport),
      parsedRatiosCount: Object.keys(transformedRating.financialRatios).filter(k => transformedRating.financialRatios[k as keyof typeof transformedRating.financialRatios] !== undefined).length,
    });

    return NextResponse.json(successResponse(transformedRating), { status: 201 });
  } catch (error) {
    return handleApiError(error, 'POST /api/clients/[id]/analytics/rating');
  }
}

