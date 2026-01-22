export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { secureRoute, Feature } from '@/lib/api/secureRoute';
import { successResponse } from '@/lib/utils/apiUtils';
import { prisma } from '@/lib/db/prisma';

/**
 * GET /api/service-lines/user-roles
 * Fetch all service line roles for the current user
 */
export const GET = secureRoute.query({
  feature: Feature.ACCESS_DASHBOARD,
  handler: async (request, { user }) => {
    const serviceLineRoles = await prisma.serviceLineUser.findMany({
      where: { userId: user.id },
      select: { role: true },
    });

    return NextResponse.json(successResponse(serviceLineRoles));
  },
});
