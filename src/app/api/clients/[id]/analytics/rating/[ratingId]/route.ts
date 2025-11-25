import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, checkClientAccess } from '@/lib/services/auth/auth';
import { prisma } from '@/lib/db/prisma';
import { successResponse } from '@/lib/utils/apiUtils';
import { handleApiError } from '@/lib/utils/errorHandler';
import { parseCreditAnalysisReport, parseFinancialRatios } from '@/lib/utils/jsonValidation';
import { logger } from '@/lib/utils/logger';

/**
 * GET /api/clients/[id]/analytics/rating/[ratingId]
 * Fetch a specific credit rating with full details
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string; ratingId: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id, ratingId } = await context.params;
    const clientId = parseInt(id);
    const ratId = parseInt(ratingId);

    if (isNaN(clientId) || isNaN(ratId)) {
      return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
    }

    // SECURITY: Check authorization
    const hasAccess = await checkClientAccess(user.id, clientId);
    if (!hasAccess) {
      logger.warn('Unauthorized rating detail access attempt', {
        userId: user.id,
        userEmail: user.email,
        clientId,
        ratingId: ratId,
      });
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Fetch rating with documents
    const rating = await prisma.clientCreditRating.findFirst({
      where: {
        id: ratId,
        clientId,
      },
      include: {
        Documents: {
          include: {
            AnalyticsDocument: true,
          },
        },
        Client: {
          select: {
            id: true,
            clientCode: true,
            clientNameFull: true,
            industry: true,
            sector: true,
          },
        },
      },
    });

    if (!rating) {
      return NextResponse.json({ error: 'Rating not found' }, { status: 404 });
    }

    // Transform response with safe JSON parsing
    const transformedRating = {
      ...rating,
      analysisReport: parseCreditAnalysisReport(rating.analysisReport),
      financialRatios: parseFinancialRatios(rating.financialRatios),
      documents: rating.Documents.map((d) => d.AnalyticsDocument),
    };

    return NextResponse.json(successResponse(transformedRating));
  } catch (error) {
    return handleApiError(error, 'GET /api/clients/[id]/analytics/rating/[ratingId]');
  }
}

/**
 * DELETE /api/clients/[id]/analytics/rating/[ratingId]
 * Delete a specific credit rating
 */
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string; ratingId: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id, ratingId } = await context.params;
    const clientId = parseInt(id);
    const ratId = parseInt(ratingId);

    if (isNaN(clientId) || isNaN(ratId)) {
      return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
    }

    // SECURITY: Check authorization
    const hasAccess = await checkClientAccess(user.id, clientId);
    if (!hasAccess) {
      logger.warn('Unauthorized rating deletion attempt', {
        userId: user.id,
        userEmail: user.email,
        clientId,
        ratingId: ratId,
      });
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Verify rating exists and belongs to client
    const rating = await prisma.clientCreditRating.findFirst({
      where: {
        id: ratId,
        clientId,
      },
    });

    if (!rating) {
      return NextResponse.json({ error: 'Rating not found' }, { status: 404 });
    }

    // Delete rating (junction table entries will cascade)
    await prisma.clientCreditRating.delete({
      where: { id: ratId },
    });

    return NextResponse.json(
      successResponse({
        message: 'Rating deleted successfully',
        ratingId: ratId,
      })
    );
  } catch (error) {
    return handleApiError(error, 'DELETE /api/clients/[id]/analytics/rating/[ratingId]');
  }
}

