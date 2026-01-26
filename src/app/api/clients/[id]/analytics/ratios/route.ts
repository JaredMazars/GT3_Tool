import { NextResponse } from 'next/server';
import { checkClientAccess } from '@/lib/services/auth/auth';
import { prisma } from '@/lib/db/prisma';
import { successResponse } from '@/lib/utils/apiUtils';
import { AppError, ErrorCodes } from '@/lib/utils/errorHandler';
import { parseFinancialRatios } from '@/lib/utils/jsonValidation';
import { logger } from '@/lib/utils/logger';
import { GSClientIDSchema } from '@/lib/validation/schemas';
import { secureRoute, Feature } from '@/lib/api/secureRoute';

/**
 * GET /api/clients/[id]/analytics/ratios
 * Fetch latest calculated financial ratios for a client
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
      logger.warn('Unauthorized ratios access attempt', {
        userId: user.id,
        GSClientID,
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

    // Get the most recent rating for this client (using numeric id)
    const latestRating = await prisma.clientCreditRating.findFirst({
      where: { clientId: client.id },
      orderBy: { ratingDate: 'desc' },
      select: {
        id: true,
        financialRatios: true,
        ratingDate: true,
        ratingScore: true,
        ratingGrade: true,
      },
    });

    if (!latestRating) {
      return NextResponse.json(
        successResponse({
          ratios: null,
          message: 'No credit ratings found for this client',
        })
      );
    }

    // SAFE PARSING: Use validated JSON parsing
    const ratios = parseFinancialRatios(latestRating.financialRatios);

    logger.info('Financial ratios retrieved', {
      clientId: client.id,
      ratingId: latestRating.id,
      ratingDate: latestRating.ratingDate,
    });

    return NextResponse.json(
      successResponse({
        ratios,
        ratingDate: latestRating.ratingDate,
        ratingScore: latestRating.ratingScore,
        ratingGrade: latestRating.ratingGrade,
      })
    );
  },
});















































