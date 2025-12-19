/**
 * BD Opportunity Stage Management API Route
 * PUT /api/bd/opportunities/[id]/stage - Move opportunity to different stage
 */

import { NextResponse } from 'next/server';
import { successResponse, parseNumericId } from '@/lib/utils/apiUtils';
import { AppError, ErrorCodes } from '@/lib/utils/errorHandler';
import { MoveBDOpportunityStageSchema } from '@/lib/validation/schemas';
import { moveToStage } from '@/lib/services/bd/opportunityService';
import { prisma } from '@/lib/db/prisma';
import { secureRoute, Feature } from '@/lib/api/secureRoute';

/**
 * PUT /api/bd/opportunities/[id]/stage
 * Move opportunity to different stage
 */
export const PUT = secureRoute.mutationWithParams({
  feature: Feature.ACCESS_BD,
  schema: MoveBDOpportunityStageSchema,
  handler: async (request, { user, params, data }) => {
    const opportunityId = parseNumericId(params.id, 'Opportunity');

    // Verify opportunity exists
    const existing = await prisma.bDOpportunity.findUnique({
      where: { id: opportunityId },
      select: { id: true },
    });

    if (!existing) {
      throw new AppError(404, 'Opportunity not found', ErrorCodes.NOT_FOUND);
    }

    const opportunity = await moveToStage(opportunityId, data.stageId);

    return NextResponse.json(successResponse(opportunity));
  },
});
