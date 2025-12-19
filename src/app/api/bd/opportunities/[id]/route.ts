/**
 * BD Opportunity by ID API Routes
 * GET /api/bd/opportunities/[id] - Get opportunity details
 * PUT /api/bd/opportunities/[id] - Update opportunity
 * DELETE /api/bd/opportunities/[id] - Delete opportunity
 */

import { NextResponse } from 'next/server';
import { successResponse, parseNumericId } from '@/lib/utils/apiUtils';
import { AppError, ErrorCodes } from '@/lib/utils/errorHandler';
import { secureRoute, Feature } from '@/lib/api/secureRoute';
import { UpdateBDOpportunitySchema } from '@/lib/validation/schemas';
import {
  getOpportunityById,
  updateOpportunity,
  deleteOpportunity,
} from '@/lib/services/bd/opportunityService';
import { prisma } from '@/lib/db/prisma';

/**
 * GET /api/bd/opportunities/[id]
 * Get opportunity details
 */
export const GET = secureRoute.queryWithParams({
  feature: Feature.ACCESS_BD,
  handler: async (request, { user, params }) => {
    const opportunityId = parseNumericId(params.id, 'Opportunity');

    const opportunity = await getOpportunityById(opportunityId);

    if (!opportunity) {
      throw new AppError(404, 'Opportunity not found', ErrorCodes.NOT_FOUND);
    }

    return NextResponse.json(successResponse(opportunity));
  },
});

/**
 * PUT /api/bd/opportunities/[id]
 * Update opportunity
 */
export const PUT = secureRoute.mutationWithParams({
  feature: Feature.ACCESS_BD,
  schema: UpdateBDOpportunitySchema,
  handler: async (request, { user, data, params }) => {
    const opportunityId = parseNumericId(params.id, 'Opportunity');

    // Verify opportunity exists
    const existing = await prisma.bDOpportunity.findUnique({
      where: { id: opportunityId },
      select: { id: true },
    });

    if (!existing) {
      throw new AppError(404, 'Opportunity not found', ErrorCodes.NOT_FOUND);
    }

    const opportunity = await updateOpportunity(opportunityId, {
      title: data.title,
      description: data.description,
      clientId: data.GSClientID,
      companyName: data.companyName,
      contactId: data.contactId,
      stageId: data.stageId,
      value: data.value,
      probability: data.probability,
      expectedCloseDate: data.expectedCloseDate,
      source: data.source,
      status: data.status,
      lostReason: data.lostReason,
      assignedTo: data.assignedTo,
    });

    return NextResponse.json(successResponse(opportunity));
  },
});

/**
 * DELETE /api/bd/opportunities/[id]
 * Delete opportunity
 */
export const DELETE = secureRoute.mutationWithParams({
  feature: Feature.ACCESS_BD,
  handler: async (request, { user, params }) => {
    const opportunityId = parseNumericId(params.id, 'Opportunity');

    // Verify opportunity exists
    const existing = await prisma.bDOpportunity.findUnique({
      where: { id: opportunityId },
      select: { id: true },
    });

    if (!existing) {
      throw new AppError(404, 'Opportunity not found', ErrorCodes.NOT_FOUND);
    }

    await deleteOpportunity(opportunityId);

    return NextResponse.json(successResponse({ deleted: true }));
  },
});
