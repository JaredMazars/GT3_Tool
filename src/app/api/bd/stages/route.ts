/**
 * BD Stages API Route
 * GET /api/bd/stages - List all active stages
 */

import { NextResponse } from 'next/server';
import { successResponse } from '@/lib/utils/apiUtils';
import { secureRoute, Feature } from '@/lib/api/secureRoute';
import { prisma } from '@/lib/db/prisma';

/**
 * GET /api/bd/stages
 * List all active stages
 */
export const GET = secureRoute.query({
  feature: Feature.ACCESS_BD,
  handler: async (request, { user }) => {
    const { searchParams } = new URL(request.url);
    const serviceLine = searchParams.get('serviceLine');

    const stages = await prisma.bDStage.findMany({
      where: {
        isActive: true,
        ...(serviceLine && { OR: [{ serviceLine }, { serviceLine: null }] }),
      },
      orderBy: { order: 'asc' },
    });

    return NextResponse.json(successResponse(stages));
  },
});
