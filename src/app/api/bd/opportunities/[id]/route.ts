/**
 * BD Opportunity by ID API Routes
 * GET /api/bd/opportunities/[id] - Get opportunity details
 * PUT /api/bd/opportunities/[id] - Update opportunity
 * DELETE /api/bd/opportunities/[id] - Delete opportunity
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/services/auth/auth';
import { successResponse } from '@/lib/utils/apiUtils';
import { handleApiError } from '@/lib/utils/errorHandler';
import { UpdateBDOpportunitySchema } from '@/lib/validation/schemas';
import {
  getOpportunityById,
  updateOpportunity,
  deleteOpportunity,
} from '@/lib/services/bd/opportunityService';

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
    const opportunityId = parseInt(id);

    const opportunity = await getOpportunityById(opportunityId);

    if (!opportunity) {
      return NextResponse.json({ error: 'Opportunity not found' }, { status: 404 });
    }

    return NextResponse.json(successResponse(opportunity));
  } catch (error) {
    return handleApiError(error, 'GET /api/bd/opportunities/[id]');
  }
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await context.params;
    const opportunityId = parseInt(id);

    const body = await request.json();
    const validated = UpdateBDOpportunitySchema.parse(body);

    const opportunity = await updateOpportunity(opportunityId, validated);

    return NextResponse.json(successResponse(opportunity));
  } catch (error) {
    return handleApiError(error, 'PUT /api/bd/opportunities/[id]');
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await context.params;
    const opportunityId = parseInt(id);

    await deleteOpportunity(opportunityId);

    return NextResponse.json(successResponse({ deleted: true }));
  } catch (error) {
    return handleApiError(error, 'DELETE /api/bd/opportunities/[id]');
  }
}

