import { NextResponse } from 'next/server';
import { checkServiceLineAccess, getServiceLineStats } from '@/lib/services/service-lines/serviceLineService';
import { successResponse } from '@/lib/utils/apiUtils';
import { isValidServiceLine } from '@/lib/utils/serviceLineUtils';
import { secureRoute } from '@/lib/api/secureRoute';

/**
 * GET /api/service-lines/[serviceLine]
 * Get statistics for a specific service line
 */
export const GET = secureRoute.queryWithParams<{ serviceLine: string }>({
  handler: async (request, { user, params }) => {
    const { serviceLine } = params;

    // Validate service line
    if (!isValidServiceLine(serviceLine)) {
      return NextResponse.json({ success: false, error: 'Invalid service line' }, { status: 400 });
    }

    // Check access
    const hasAccess = await checkServiceLineAccess(user.id, serviceLine);
    if (!hasAccess) {
      return NextResponse.json({ success: false, error: 'Access denied to this service line' }, { status: 403 });
    }

    const stats = await getServiceLineStats(serviceLine);

    return NextResponse.json(successResponse(stats));
  },
});
