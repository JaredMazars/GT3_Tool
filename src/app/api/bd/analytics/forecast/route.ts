/**
 * BD Analytics - Forecast Metrics
 * GET /api/bd/analytics/forecast - Get revenue forecast
 */

export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { successResponse } from '@/lib/utils/apiUtils';
import { secureRoute, Feature } from '@/lib/api/secureRoute';
import { getForecastMetrics } from '@/lib/services/bd/analyticsService';
import { BDAnalyticsFiltersSchema } from '@/lib/validation/schemas';

/**
 * GET /api/bd/analytics/forecast
 * Get revenue forecast
 */
export const GET = secureRoute.query({
  feature: Feature.ACCESS_BD,
  handler: async (request, { user }) => {
    const { searchParams } = new URL(request.url);

    const filters = BDAnalyticsFiltersSchema.parse({
      serviceLine: searchParams.get('serviceLine') || undefined,
      assignedTo: searchParams.get('assignedTo') || undefined,
    });

    const forecast = await getForecastMetrics(filters);

    return NextResponse.json(successResponse(forecast));
  },
});
