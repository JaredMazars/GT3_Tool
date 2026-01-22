/**
 * Page Registry API Route
 * GET: Get all pages in the registry (auto-discovered)
 */

export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { successResponse } from '@/lib/utils/apiUtils';
import { secureRoute, Feature } from '@/lib/api/secureRoute';
import { getPageRegistry } from '@/lib/services/admin/pagePermissionService';
import { AppError, ErrorCodes } from '@/lib/utils/errorHandler';

// Query parameter validation schema
const RegistryQuerySchema = z.object({
  active: z.enum(['true', 'false']).optional(),
  category: z.string().max(100).optional(),
});

/**
 * GET /api/admin/page-permissions/registry
 * Get all pages in the registry
 */
export const GET = secureRoute.query({
  feature: Feature.ACCESS_ADMIN,
  handler: async (request, { user }) => {
    const { searchParams } = new URL(request.url);

    // Validate query parameters
    const queryResult = RegistryQuerySchema.safeParse({
      active: searchParams.get('active') ?? undefined,
      category: searchParams.get('category') ?? undefined,
    });

    if (!queryResult.success) {
      throw new AppError(
        400,
        'Invalid query parameters',
        ErrorCodes.VALIDATION_ERROR,
        { errors: queryResult.error.flatten().fieldErrors }
      );
    }

    const { active, category } = queryResult.data;
    const activeOnly = active !== 'false';

    const registry = await getPageRegistry({
      active: activeOnly ? true : undefined,
      category,
    });

    return NextResponse.json(successResponse(registry));
  },
});
