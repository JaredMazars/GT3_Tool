/**
 * BD Opportunity Conversion API Route
 * POST /api/bd/opportunities/[id]/convert - Convert opportunity to client
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/services/auth/auth';
import { successResponse } from '@/lib/utils/apiUtils';
import { handleApiError } from '@/lib/utils/errorHandler';
import { ConvertBDOpportunitySchema } from '@/lib/validation/schemas';
import { convertOpportunityToClient } from '@/lib/services/bd/conversionService';

export async function POST(
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
    const validated = ConvertBDOpportunitySchema.parse(body);

    const result = await convertOpportunityToClient(opportunityId, user.id, {
      createProject: validated.createProject,
      projectType: validated.projectType,
    });

    return NextResponse.json(successResponse(result), { status: 201 });
  } catch (error) {
    return handleApiError(error, 'POST /api/bd/opportunities/[id]/convert');
  }
}

