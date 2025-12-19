/**
 * Page Permission Individual API Routes
 * PUT: Update a page permission
 * DELETE: Delete a page permission
 */

import { NextResponse } from 'next/server';
import { successResponse } from '@/lib/utils/apiUtils';
import { secureRoute, Feature } from '@/lib/api/secureRoute';
import {
  updatePagePermission,
  deletePagePermission,
} from '@/lib/services/admin/pagePermissionService';
import { UpdatePagePermissionSchema } from '@/lib/validation/schemas';
import { PageAccessLevel } from '@/types/pagePermissions';
import { z } from 'zod';

/**
 * PUT /api/admin/page-permissions/[id]
 * Update a page permission
 */
export const PUT = secureRoute.mutationWithParams<typeof UpdatePagePermissionSchema, { id: string }>({
  feature: Feature.ACCESS_ADMIN,
  schema: UpdatePagePermissionSchema,
  handler: async (request, { user, data, params }) => {
    const id = parseInt(params.id, 10);
    if (isNaN(id)) {
      return NextResponse.json({ success: false, error: 'Invalid ID' }, { status: 400 });
    }

    const permission = await updatePagePermission(id, {
      accessLevel: data.accessLevel as PageAccessLevel | undefined,
      description: data.description ?? undefined,
      active: data.active,
    });

    return NextResponse.json(successResponse(permission));
  },
});

/**
 * DELETE /api/admin/page-permissions/[id]
 * Delete a page permission (reverts to defaults)
 */
export const DELETE = secureRoute.mutationWithParams<z.ZodAny, { id: string }>({
  feature: Feature.ACCESS_ADMIN,
  handler: async (request, { user, params }) => {
    const id = parseInt(params.id, 10);
    if (isNaN(id)) {
      return NextResponse.json({ success: false, error: 'Invalid ID' }, { status: 400 });
    }

    await deletePagePermission(id);

    return NextResponse.json(successResponse({ message: 'Page permission deleted successfully' }));
  },
});
