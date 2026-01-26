import { NextResponse } from 'next/server';
import { getUserServiceLines } from '@/lib/services/service-lines/serviceLineService';
import { successResponse } from '@/lib/utils/apiUtils';
import { secureRoute, Feature } from '@/lib/api/secureRoute';

// Mark as dynamic since we use cookies for authentication
export const dynamic = 'force-dynamic';

/**
 * GET /api/service-lines
 * Get all service lines accessible to the current user
 */
export const GET = secureRoute.query({
  feature: Feature.ACCESS_DASHBOARD,
  handler: async (request, { user }) => {
    const serviceLines = await getUserServiceLines(user.id);
    return NextResponse.json(successResponse(serviceLines));
  },
});
