/**
 * BD Analytics - Conversion Metrics
 * GET /api/bd/analytics/conversion - Get conversion metrics (win/loss rates)
 */

export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { successResponse } from '@/lib/utils/apiUtils';
import { secureRoute, Feature } from '@/lib/api/secureRoute';
import { getConversionMetrics } from '@/lib/services/bd/analyticsService';
import { BDAnalyticsFiltersSchema } from '@/lib/validation/schemas';

/**
 * GET /api/bd/analytics/conversion
 * Get conversion metrics (win/loss rates)
 */
export const GET = secureRoute.query({
  feature: Feature.ACCESS_BD,
  handler: async (request, { user }) => {
    const { searchParams } = new URL(request.url);

    const filters = BDAnalyticsFiltersSchema.parse({
      serviceLine: searchParams.get('serviceLine') || undefined,
      assignedTo: searchParams.get('assignedTo') || undefined,
      fromDate: searchParams.get('fromDate')
        ? new Date(searchParams.get('fromDate')!)
        : undefined,
      toDate: searchParams.get('toDate')
        ? new Date(searchParams.get('toDate')!)
        : undefined,
    });

    const metrics = await getConversionMetrics(filters);

    return NextResponse.json(successResponse(metrics));
  },
});
