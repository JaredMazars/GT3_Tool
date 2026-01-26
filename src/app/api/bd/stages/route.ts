/**
 * BD Stages API Route
 * GET /api/bd/stages - List all active stages
 */

export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { successResponse } from '@/lib/utils/apiUtils';
import { secureRoute, Feature } from '@/lib/api/secureRoute';
import { AppError, ErrorCodes } from '@/lib/utils/errorHandler';
import { prisma } from '@/lib/db/prisma';

/**
 * Query params schema for listing stages
 */
const StagesQuerySchema = z.object({
  serviceLine: z.string().max(50).optional(),
}).strict();

/**
 * GET /api/bd/stages
 * List all active stages
 */
export const GET = secureRoute.query({
  feature: Feature.ACCESS_BD,
  handler: async (request, { user }) => {
    const { searchParams } = new URL(request.url);

    // Validate query params
    const queryResult = StagesQuerySchema.safeParse({
      serviceLine: searchParams.get('serviceLine') || undefined,
    });

    if (!queryResult.success) {
      throw new AppError(400, 'Invalid query parameters', ErrorCodes.VALIDATION_ERROR, {
        errors: queryResult.error.flatten().fieldErrors,
      });
    }

    const { serviceLine } = queryResult.data;

    const stages = await prisma.bDStage.findMany({
      where: {
        isActive: true,
        ...(serviceLine && { OR: [{ serviceLine }, { serviceLine: null }] }),
      },
      select: {
        id: true,
        name: true,
        description: true,
        order: true,
        probability: true,
        serviceLine: true,
        isActive: true,
        isDefault: true,
        color: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: [{ order: 'asc' }, { id: 'asc' }],
      take: 100,
    });

    return NextResponse.json(successResponse(stages));
  },
});
