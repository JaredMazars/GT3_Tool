/**
 * BD Analytics - Pipeline Metrics
 * GET /api/bd/analytics/pipeline - Get pipeline metrics by stage
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/services/auth/auth';
import { successResponse } from '@/lib/utils/apiUtils';
import { handleApiError } from '@/lib/utils/errorHandler';
import { getPipelineMetrics } from '@/lib/services/bd/analyticsService';

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

    const metrics = await getPipelineMetrics(filters);

    return NextResponse.json(successResponse(metrics));
  } catch (error) {
    return handleApiError(error, 'GET /api/bd/analytics/pipeline');
  }
}

