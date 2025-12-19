/**
 * Page Permissions Bulk API Route
 * POST: Bulk create/update permissions for a pathname (all roles at once)
 */

import { NextResponse } from 'next/server';
import { successResponse } from '@/lib/utils/apiUtils';
import { secureRoute, Feature } from '@/lib/api/secureRoute';
import { bulkUpsertPagePermissions } from '@/lib/services/admin/pagePermissionService';
import { PagePermissionBulkSchema } from '@/lib/validation/schemas';
import { PageAccessLevel } from '@/types/pagePermissions';

/**
 * POST /api/admin/page-permissions/bulk
 * Bulk upsert permissions for a pathname (all roles)
 */
export const POST = secureRoute.mutation({
  feature: Feature.ACCESS_ADMIN,
  schema: PagePermissionBulkSchema,
  handler: async (request, { user, data }) => {
    const permissions = await bulkUpsertPagePermissions(
      data.pathname,
      data.permissions as Record<string, PageAccessLevel>,
      data.description ?? undefined,
      user.id
    );

    return NextResponse.json(successResponse(permissions));
  },
});
