/**
 * API Route: Get Live Monitoring Metrics
 * Returns real-time database metrics
 */

export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { secureRoute, Feature } from '@/lib/api/secureRoute';
import { successResponse } from '@/lib/utils/apiUtils';
import { getLiveMetrics } from '@/lib/services/admin/databaseService';

// No caching for live metrics - always fresh data
export const GET = secureRoute.query({
  feature: Feature.MANAGE_DATABASE,
  handler: async () => {
    const metrics = await getLiveMetrics();
    return NextResponse.json(successResponse(metrics));
  },
});
