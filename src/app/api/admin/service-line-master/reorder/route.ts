/**
 * Service Line Master Reorder API Route
 * POST /api/admin/service-line-master/reorder - Batch update sortOrder
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { successResponse } from '@/lib/utils/apiUtils';
import { secureRoute, Feature } from '@/lib/api/secureRoute';
import { ReorderServiceLineMasterSchema } from '@/lib/validation/schemas';
import { AppError, ErrorCodes } from '@/lib/utils/errorHandler';
import { invalidateServiceLineCache } from '@/lib/services/cache/cacheInvalidation';
import { auditAdminAction } from '@/lib/utils/auditLog';

/**
 * POST /api/admin/service-line-master/reorder
 * Batch update sortOrder for service line masters
 */
export const POST = secureRoute.mutation({
  feature: Feature.MANAGE_SERVICE_LINES,
  schema: ReorderServiceLineMasterSchema,
  handler: async (request, { user, data }) => {
    const codes = data.items.map((item) => item.code);

    // Validate all codes exist before batch update
    const existingCount = await prisma.serviceLineMaster.count({
      where: { code: { in: codes } },
    });

    if (existingCount !== codes.length) {
      throw new AppError(
        400,
        'One or more service line codes do not exist',
        ErrorCodes.VALIDATION_ERROR
      );
    }

    // Update sortOrder in a transaction
    await prisma.$transaction(
      data.items.map((item) =>
        prisma.serviceLineMaster.update({
          where: { code: item.code },
          data: { sortOrder: item.sortOrder },
          select: { code: true },
        })
      )
    );

    // Invalidate service line cache
    await invalidateServiceLineCache();

    // Audit log the reorder action
    await auditAdminAction(
      user.id,
      'REORDER_SERVICE_LINE_MASTER',
      'serviceLineMaster',
      'batch',
      { itemCount: data.items.length, codes }
    );

    // Fetch updated list with limit
    const serviceLineMasters = await prisma.serviceLineMaster.findMany({
      take: 100,
      orderBy: { sortOrder: 'asc' },
      select: {
        code: true,
        name: true,
        description: true,
        active: true,
        sortOrder: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json(successResponse(serviceLineMasters));
  },
});








