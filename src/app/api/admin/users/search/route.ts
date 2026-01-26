export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { secureRoute } from '@/lib/api/secureRoute';
import { Feature } from '@/lib/permissions/features';
import { prisma } from '@/lib/db/prisma';
import { successResponse } from '@/lib/utils/apiUtils';
import { AppError, ErrorCodes } from '@/lib/utils/errorHandler';

/**
 * GET /api/admin/users/search
 * Search users by name or email (for admin functions like assigning approvers)
 */
export const GET = secureRoute.query({
  feature: Feature.MANAGE_VAULT_DOCUMENTS,
  handler: async (request, { user }) => {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');
    const limit = parseInt(searchParams.get('limit') || '10');

    if (!query || query.length < 2) {
      throw new AppError(400, 'Search query must be at least 2 characters', ErrorCodes.VALIDATION_ERROR);
    }

    // Search users by name or email
    const users = await prisma.user.findMany({
      where: {
        OR: [
          { name: { contains: query } },
          { email: { contains: query } },
        ],
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
      take: Math.min(limit, 20), // Max 20 results
      orderBy: [
        { name: 'asc' },
        { email: 'asc' },
      ],
    });

    return NextResponse.json(successResponse({ users }));
  },
});
