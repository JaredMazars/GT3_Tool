/**
 * Review Categories API Routes
 * GET - List review categories
 * POST - Create new category
 */

import { NextResponse } from 'next/server';
import { secureRoute, Feature } from '@/lib/api/secureRoute';
import { CreateReviewCategorySchema } from '@/lib/validation/schemas';
import { successResponse } from '@/lib/utils/apiUtils';
import { AppError, ErrorCodes } from '@/lib/utils/errorHandler';
import { prisma } from '@/lib/db/prisma';
import { Prisma } from '@prisma/client';
import { hasPartnerAccess } from '@/lib/utils/roleHierarchy';

/**
 * GET /api/tasks/[taskId]/review-notes/categories
 * Get all active review categories
 */
export const GET = secureRoute.query({
  feature: Feature.ACCESS_TASKS,
  handler: async (request, { user }) => {
    // Get query parameters
    const { searchParams } = new URL(request.url);
    const serviceLine = searchParams.get('serviceLine');

    // Build where clause
    const where: Prisma.ReviewCategoryWhereInput = {
      active: true,
    };

    // Filter by service line if provided
    if (serviceLine) {
      where.OR = [
        { serviceLine },
        { serviceLine: null }, // Include global categories
      ];
    }

    // Get categories
    const categories = await prisma.reviewCategory.findMany({
      where,
      select: {
        id: true,
        name: true,
        description: true,
        serviceLine: true,
        sortOrder: true,
      },
      orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
      take: 100,
    });

    const response = NextResponse.json(successResponse(categories));
    response.headers.set('Cache-Control', 'private, max-age=300'); // Cache 5 min
    return response;
  },
});

/**
 * POST /api/tasks/[taskId]/review-notes/categories
 * Create a new review category (PARTNER+ only)
 */
export const POST = secureRoute.mutation({
  feature: Feature.MANAGE_TASKS,
  schema: CreateReviewCategorySchema,
  handler: async (request, { user, data }) => {
    // Business logic authorization: Only partners and above can create categories
    if (!hasPartnerAccess(user.role)) {
      throw new AppError(403, 'Only partners and above can create categories', ErrorCodes.FORBIDDEN);
    }

    // Create category
    const category = await prisma.reviewCategory.create({
      data: {
        ...data,
        updatedAt: new Date(),
      },
      select: {
        id: true,
        name: true,
        description: true,
        serviceLine: true,
        active: true,
        sortOrder: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json(successResponse(category), { status: 201 });
  },
});

