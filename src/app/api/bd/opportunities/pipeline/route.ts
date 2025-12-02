/**
 * BD Pipeline View API Route
 * GET /api/bd/opportunities/pipeline - Get pipeline view grouped by stage
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/services/auth/auth';
import { successResponse } from '@/lib/utils/apiUtils';
import { handleApiError } from '@/lib/utils/errorHandler';
import { getPipelineView } from '@/lib/services/bd/opportunityService';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);

    const filters = {
      serviceLine: searchParams.get('serviceLine') || undefined,
      assignedTo: searchParams.get('assignedTo') || undefined,
    };

    const pipeline = await getPipelineView(filters);

    return NextResponse.json(successResponse(pipeline));
  } catch (error) {
    return handleApiError(error, 'GET /api/bd/opportunities/pipeline');
  }
}

