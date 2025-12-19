/**
 * Page Permissions API Routes
 * GET: List all page permissions
 * POST: Create a new page permission
 */

import { NextResponse } from 'next/server';
import { successResponse } from '@/lib/utils/apiUtils';
import { secureRoute, Feature } from '@/lib/api/secureRoute';
import {
  getAllPagePermissions,
  createPagePermission,
  getMergedPagePermissions,
} from '@/lib/services/admin/pagePermissionService';
import { PagePermissionSchema } from '@/lib/validation/schemas';
import { PageAccessLevel } from '@/types/pagePermissions';

/**
 * GET /api/admin/page-permissions
 * List all page permissions (merged with defaults)
 */
export const GET = secureRoute.query({
  feature: Feature.ACCESS_ADMIN,
  handler: async (request, { user }) => {
    const { searchParams } = new URL(request.url);
    const showMerged = searchParams.get('merged') === 'true';
    const pathname = searchParams.get('pathname') || undefined;
    const role = searchParams.get('role') || undefined;
    const activeOnly = searchParams.get('active') !== 'false';

    let permissions;
    
    if (showMerged) {
      permissions = await getMergedPagePermissions();
    } else {
      permissions = await getAllPagePermissions({
        pathname,
        role,
        active: activeOnly ? true : undefined,
      });
    }

    return NextResponse.json(successResponse(permissions));
  },
});

/**
 * POST /api/admin/page-permissions
 * Create a new page permission override
 */
export const POST = secureRoute.mutation({
  feature: Feature.ACCESS_ADMIN,
  schema: PagePermissionSchema,
  handler: async (request, { user, data }) => {
    const permission = await createPagePermission({
      pathname: data.pathname,
      role: data.role,
      accessLevel: data.accessLevel as PageAccessLevel,
      description: data.description ?? undefined,
      createdBy: user.id,
    });

    return NextResponse.json(successResponse(permission), { status: 201 });
  },
});
