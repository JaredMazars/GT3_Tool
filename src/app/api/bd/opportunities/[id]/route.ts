/**
 * BD Opportunity by ID API Routes
 * GET /api/bd/opportunities/[id] - Get opportunity details
 * PUT /api/bd/opportunities/[id] - Update opportunity
 * DELETE /api/bd/opportunities/[id] - Delete opportunity
 */

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { successResponse } from '@/lib/utils/apiUtils';
import { secureRoute, Feature } from '@/lib/api/secureRoute';
import { UpdateBDOpportunitySchema } from '@/lib/validation/schemas';
import {
  getOpportunityById,
  updateOpportunity,
  deleteOpportunity,
} from '@/lib/services/bd/opportunityService';

/**
 * GET /api/bd/opportunities/[id]
 * Get opportunity details
 */
export const GET = secureRoute.queryWithParams<{ id: string }>({
  feature: Feature.ACCESS_BD,
  handler: async (request, { user, params }) => {
    const opportunityId = Number.parseInt(params.id, 10);

    const opportunity = await getOpportunityById(opportunityId);

    if (!opportunity) {
      return NextResponse.json({ success: false, error: 'Opportunity not found' }, { status: 404 });
    }

    return NextResponse.json(successResponse(opportunity));
  },
});

/**
 * PUT /api/bd/opportunities/[id]
 * Update opportunity
 */
export const PUT = secureRoute.mutationWithParams<typeof UpdateBDOpportunitySchema, { id: string }>({
  feature: Feature.ACCESS_BD,
  schema: UpdateBDOpportunitySchema,
  handler: async (request, { user, data, params }) => {
    const opportunityId = Number.parseInt(params.id, 10);

    const opportunity = await updateOpportunity(opportunityId, data);

    return NextResponse.json(successResponse(opportunity));
  },
});

/**
 * DELETE /api/bd/opportunities/[id]
 * Delete opportunity
 */
export const DELETE = secureRoute.mutationWithParams<z.ZodAny, { id: string }>({
  feature: Feature.ACCESS_BD,
  handler: async (request, { user, params }) => {
    const opportunityId = Number.parseInt(params.id, 10);

    await deleteOpportunity(opportunityId);

    return NextResponse.json(successResponse({ deleted: true }));
  },
});
