/**
 * Page Registry API Route
 * GET: Get all pages in the registry (auto-discovered)
 */

import { NextResponse } from 'next/server';
import { successResponse } from '@/lib/utils/apiUtils';
import { secureRoute, Feature } from '@/lib/api/secureRoute';
import { getPageRegistry } from '@/lib/services/admin/pagePermissionService';

/**
 * GET /api/admin/page-permissions/registry
 * Get all pages in the registry
 */
export const GET = secureRoute.query({
  feature: Feature.ACCESS_ADMIN,
  handler: async (request, { user }) => {
    const { searchParams } = new URL(request.url);
    const activeOnly = searchParams.get('active') !== 'false';
    const category = searchParams.get('category') || undefined;

    const registry = await getPageRegistry({
      active: activeOnly ? true : undefined,
      category,
    });

    return NextResponse.json(successResponse(registry));
  },
});
