import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, checkClientAccess } from '@/lib/services/auth/auth';
import { prisma } from '@/lib/db/prisma';
import { successResponse } from '@/lib/utils/apiUtils';
import { handleApiError } from '@/lib/utils/errorHandler';
import { parseFinancialRatios } from '@/lib/utils/jsonValidation';
import { logger } from '@/lib/utils/logger';
import { GSClientIDSchema } from '@/lib/validation/schemas';

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
    const GSClientID = id;

    // Validate GSClientID is a valid GUID
    const validationResult = GSClientIDSchema.safeParse(GSClientID);
    if (!validationResult.success) {
      return NextResponse.json({ error: 'Invalid client ID format. Expected GUID.' }, { status: 400 });
    }

    // SECURITY: Check authorization
    const hasAccess = await checkClientAccess(user.id, GSClientID);
    if (!hasAccess) {
      logger.warn('Unauthorized ratios access attempt', {
        userId: user.id,
        userEmail: user.email,
        GSClientID,
      });
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get client by GSClientID to get numeric id
    const client = await prisma.client.findUnique({
      where: { GSClientID: GSClientID },
      select: { id: true },
    });

    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
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

















