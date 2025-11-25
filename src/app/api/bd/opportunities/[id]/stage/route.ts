/**
 * BD Opportunity Stage Management API Route
 * PUT /api/bd/opportunities/[id]/stage - Move opportunity to different stage
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/services/auth/auth';
import { successResponse } from '@/lib/utils/apiUtils';
import { handleApiError } from '@/lib/utils/errorHandler';
import { MoveBDOpportunityStageSchema } from '@/lib/validation/schemas';
import { moveToStage } from '@/lib/services/bd/opportunityService';

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
    const validated = MoveBDOpportunityStageSchema.parse(body);

    const opportunity = await moveToStage(opportunityId, validated.stageId);

    return NextResponse.json(successResponse(opportunity));
  } catch (error) {
    return handleApiError(error, 'PUT /api/bd/opportunities/[id]/stage');
  }
}

