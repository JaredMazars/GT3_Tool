import { NextResponse } from 'next/server';
import { successResponse } from '@/lib/utils/apiUtils';
import { secureRoute, Feature } from '@/lib/api/secureRoute';
import { prisma } from '@/lib/db/prisma';
import { z } from 'zod';

const bulkMappingSchema = z.object({
  externalIds: z.array(z.number()).min(1, 'At least one external ID is required'),
  masterCode: z.string(),
});

/**
 * POST /api/admin/service-line-mapping/bulk
 * Bulk update service line mappings
 */
export const POST = secureRoute.mutation({
  feature: Feature.MANAGE_SERVICE_LINES,
  schema: bulkMappingSchema,
  handler: async (request, { user, data }) => {
    const result = await prisma.serviceLineExternal.updateMany({
      where: {
        id: {
          in: data.externalIds,
        },
      },
      data: {
        masterCode: data.masterCode,
      },
    });

    return NextResponse.json(
      successResponse({
        updated: result.count,
        masterCode: data.masterCode,
      })
    );
  },
});
