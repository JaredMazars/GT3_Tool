/**
 * Page Permissions API Routes
 * GET: List all page permissions
 * POST: Create a new page permission
 */

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { successResponse } from '@/lib/utils/apiUtils';
import { secureRoute, Feature } from '@/lib/api/secureRoute';
import {
  getAllPagePermissions,
  createPagePermission,
  getMergedPagePermissions,
} from '@/lib/services/admin/pagePermissionService';
import { PagePermissionSchema } from '@/lib/validation/schemas';
import { PageAccessLevel } from '@/types/pagePermissions';
import { AppError, ErrorCodes } from '@/lib/utils/errorHandler';

// Query parameter validation schema
const PagePermissionQuerySchema = z.object({
  merged: z.enum(['true', 'false']).optional(),
  pathname: z.string().max(500).optional(),
  role: z.string().max(50).optional(),
  active: z.enum(['true', 'false']).optional(),
});

// Default limit for list endpoints
const DEFAULT_LIMIT = 500;

/**
 * GET /api/admin/page-permissions
 * List all page permissions (merged with defaults)
 */
export const GET = secureRoute.query({
  feature: Feature.ACCESS_ADMIN,
  handler: async (request, { user }) => {
    const { searchParams } = new URL(request.url);
    
    // Validate query parameters
    const queryResult = PagePermissionQuerySchema.safeParse({
      merged: searchParams.get('merged') ?? undefined,
      pathname: searchParams.get('pathname') ?? undefined,
      role: searchParams.get('role') ?? undefined,
      active: searchParams.get('active') ?? undefined,
    });
    
    if (!queryResult.success) {
      throw new AppError(
        400,
        'Invalid query parameters',
        ErrorCodes.VALIDATION_ERROR,
        { errors: queryResult.error.flatten().fieldErrors }
      );
    }
    
    const { merged, pathname, role, active } = queryResult.data;
    const showMerged = merged === 'true';
    const activeOnly = active !== 'false';

    let permissions;
    
    if (showMerged) {
      // getMergedPagePermissions is bounded by number of pages in registry
      permissions = await getMergedPagePermissions();
    } else {
      permissions = await getAllPagePermissions({
        pathname,
        role,
        active: activeOnly ? true : undefined,
        take: DEFAULT_LIMIT,
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
