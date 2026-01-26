import { NextResponse } from 'next/server';
import { successResponse } from '@/lib/utils/apiUtils';
import { secureRoute, Feature, RateLimitPresets } from '@/lib/api/secureRoute';
import { prisma } from '@/lib/db/prisma';
import { z } from 'zod';
import { AppError, ErrorCodes } from '@/lib/utils/errorHandler';

const bulkMappingSchema = z.object({
  externalIds: z.array(z.number()).min(1, 'At least one external ID is required').max(100, 'Maximum 100 IDs per request'),
  masterCode: z.string().min(1, 'Master code is required'),
}).strict();

/**
 * POST /api/admin/service-line-mapping/bulk
 * Bulk update service line mappings
 */
export const POST = secureRoute.mutation({
  feature: Feature.MANAGE_SERVICE_LINES,
  rateLimit: { ...RateLimitPresets.STANDARD, maxRequests: 10 },
  schema: bulkMappingSchema,
  handler: async (request, { user, data }) => {
    // Validate masterCode exists
    const masterExists = await prisma.serviceLineMaster.findUnique({
      where: { code: data.masterCode },
      select: { code: true },
    });

    if (!masterExists) {
      throw new AppError(
        400,
        `Master service line '${data.masterCode}' does not exist`,
        ErrorCodes.VALIDATION_ERROR
      );
    }

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
