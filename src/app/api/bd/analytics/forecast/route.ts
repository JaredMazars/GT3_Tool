/**
 * BD Analytics - Forecast Metrics
 * GET /api/bd/analytics/forecast - Get revenue forecast
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/services/auth/auth';
import { successResponse } from '@/lib/utils/apiUtils';
import { handleApiError } from '@/lib/utils/errorHandler';
import { getForecastMetrics } from '@/lib/services/bd/analyticsService';

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

    const forecast = await getForecastMetrics(filters);

    return NextResponse.json(successResponse(forecast));
  } catch (error) {
    return handleApiError(error, 'GET /api/bd/analytics/forecast');
  }
}

