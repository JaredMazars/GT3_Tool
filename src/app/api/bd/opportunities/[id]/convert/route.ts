/**
 * BD Opportunity Conversion API Route
 * POST /api/bd/opportunities/[id]/convert - Convert opportunity to client (and optionally create a task)
 */

import { NextResponse } from 'next/server';
import { successResponse, parseNumericId } from '@/lib/utils/apiUtils';
import { AppError, ErrorCodes } from '@/lib/utils/errorHandler';
import { ConvertBDOpportunitySchema } from '@/lib/validation/schemas';
import { convertOpportunityToClient } from '@/lib/services/bd/conversionService';
import { prisma } from '@/lib/db/prisma';
import { secureRoute, Feature } from '@/lib/api/secureRoute';

/**
 * POST /api/bd/opportunities/[id]/convert
 * Convert opportunity to client (and optionally create a task)
 */
export const POST = secureRoute.mutationWithParams({
  feature: Feature.ACCESS_BD,
  schema: ConvertBDOpportunitySchema,
  handler: async (request, { user, params, data }) => {
    const opportunityId = parseNumericId(params.id, 'Opportunity');

    // Verify opportunity exists and is not already converted
    const existing = await prisma.bDOpportunity.findUnique({
      where: { id: opportunityId },
      select: { id: true, status: true, convertedAt: true },
    });

    if (!existing) {
      throw new AppError(404, 'Opportunity not found', ErrorCodes.NOT_FOUND);
    }

    if (existing.convertedAt) {
      throw new AppError(400, 'Opportunity has already been converted', ErrorCodes.VALIDATION_ERROR);
    }

    const result = await convertOpportunityToClient(opportunityId, user.id, {
      createTask: data.createTask,
      taskType: data.taskType,
      taskName: data.taskName,
      taskDescription: data.taskDescription,
    });

    return NextResponse.json(successResponse(result), { status: 201 });
  },
});
