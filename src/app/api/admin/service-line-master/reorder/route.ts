/**
 * Service Line Master Reorder API Route
 * POST /api/admin/service-line-master/reorder - Batch update sortOrder
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { successResponse } from '@/lib/utils/apiUtils';
import { secureRoute, Feature } from '@/lib/api/secureRoute';
import { ReorderServiceLineMasterSchema } from '@/lib/validation/schemas';

/**
 * POST /api/admin/service-line-master/reorder
 * Batch update sortOrder for service line masters
 */
export const POST = secureRoute.mutation({
  feature: Feature.MANAGE_SERVICE_LINES,
  schema: ReorderServiceLineMasterSchema,
  handler: async (request, { user, data }) => {
    // Update sortOrder in a transaction
    await prisma.$transaction(
      data.items.map((item) =>
        prisma.serviceLineMaster.update({
          where: { code: item.code },
          data: { sortOrder: item.sortOrder },
        })
      )
    );

    // Fetch updated list
    const serviceLineMasters = await prisma.serviceLineMaster.findMany({
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
