/**
 * Page Discovery API Route
 * POST: Trigger page discovery scan
 */

import { NextResponse } from 'next/server';
import { successResponse } from '@/lib/utils/apiUtils';
import { secureRoute, Feature } from '@/lib/api/secureRoute';
import { syncPageRegistry } from '@/lib/services/admin/pagePermissionService';

/**
 * POST /api/admin/page-permissions/discover
 * Trigger page discovery scan to find all dashboard pages
 */
export const POST = secureRoute.mutation({
  feature: Feature.ACCESS_ADMIN,
  handler: async (request, { user }) => {
    const result = await syncPageRegistry();

    return NextResponse.json(successResponse({
      message: 'Page discovery completed',
      ...result,
    }));
  },
});
