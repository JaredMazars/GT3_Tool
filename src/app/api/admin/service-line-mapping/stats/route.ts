export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { successResponse } from '@/lib/utils/apiUtils';
import { secureRoute, Feature } from '@/lib/api/secureRoute';
import { getMappingStatistics } from '@/lib/utils/serviceLineExternal';

/**
 * GET /api/admin/service-line-mapping/stats
 * Get service line mapping statistics
 */
export const GET = secureRoute.query({
  feature: Feature.MANAGE_SERVICE_LINES,
  handler: async (request, { user }) => {
    const stats = await getMappingStatistics();
    return NextResponse.json(successResponse(stats));
  },
});
