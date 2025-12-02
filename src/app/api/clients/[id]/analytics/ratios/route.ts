import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, checkClientAccess } from '@/lib/services/auth/auth';
import { prisma } from '@/lib/db/prisma';
import { successResponse } from '@/lib/utils/apiUtils';
import { handleApiError } from '@/lib/utils/errorHandler';
import { parseFinancialRatios } from '@/lib/utils/jsonValidation';
import { logger } from '@/lib/utils/logger';

/**
 * GET /api/clients/[id]/analytics/ratios
 * Fetch latest calculated financial ratios for a client
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
      logger.warn('Unauthorized ratios access attempt', {
        userId: user.id,
        userEmail: user.email,
        clientId,
      });
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get the most recent rating for this client
    const latestRating = await prisma.clientCreditRating.findFirst({
      where: { clientId },
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
      clientId,
      ratingId: latestRating.id,
      ratingDate: latestRating.ratingDate,
      ratiosCount: Object.keys(ratios).filter(key => ratios[key as keyof typeof ratios] !== undefined).length,
    });

    return NextResponse.json(
      successResponse({
        ratios,
        ratingDate: latestRating.ratingDate,
        ratingScore: latestRating.ratingScore,
        ratingGrade: latestRating.ratingGrade,
      })
    );
  } catch (error) {
    return handleApiError(error, 'GET /api/clients/[id]/analytics/ratios');
  }
}














