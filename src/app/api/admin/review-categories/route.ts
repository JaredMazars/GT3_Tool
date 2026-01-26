/**
 * Admin API: Review Categories
 * GET - List all categories (including inactive)
 * POST - Create new category
 */

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { secureRoute, Feature } from '@/lib/api/secureRoute';
import { prisma } from '@/lib/db/prisma';
import { successResponse } from '@/lib/utils/apiUtils';
import { AppError, ErrorCodes } from '@/lib/utils/errorHandler';
import { CreateReviewCategorySchema } from '@/lib/validation/schemas';

// Query params validation schema
const ListCategoriesQuerySchema = z.object({
  includeInactive: z.enum(['true', 'false']).optional().default('false'),
}).strict();

/**
 * GET /api/admin/review-categories
 * List all review categories with note counts
 */
export const GET = secureRoute.query({
  feature: Feature.MANAGE_TOOLS, // Using MANAGE_TOOLS as proxy for admin access
  handler: async (request, { user }) => {
    const { searchParams } = new URL(request.url);
    const { includeInactive } = ListCategoriesQuerySchema.parse({
      includeInactive: searchParams.get('includeInactive') || 'false',
    });

    const categories = await prisma.reviewCategory.findMany({
      where: includeInactive === 'true' ? {} : { active: true },
      select: {
        id: true,
        name: true,
        description: true,
        serviceLine: true,
        sortOrder: true,
        active: true,
        createdAt: true,
        _count: {
          select: {
            ReviewNote: true,
          },
        },
      },
      orderBy: [
        { sortOrder: 'asc' },
        { name: 'asc' },
        { id: 'asc' }, // Deterministic tertiary sort
      ],
      take: 200, // Reasonable limit for admin categories
    });

    return NextResponse.json(successResponse(categories));
  },
});

/**
 * POST /api/admin/review-categories
 * Create new review category
 */
export const POST = secureRoute.mutation({
  feature: Feature.MANAGE_TOOLS,
  schema: CreateReviewCategorySchema,
  handler: async (request, { user, data }) => {
    // Check for duplicate name
    const existing = await prisma.reviewCategory.findFirst({
      where: {
        name: data.name,
        serviceLine: data.serviceLine || null,
      },
      select: {
        id: true,
      },
    });

    if (existing) {
      throw new AppError(
        400,
        'A category with this name already exists',
        ErrorCodes.VALIDATION_ERROR
      );
    }

    const category = await prisma.reviewCategory.create({
      data: {
        name: data.name,
        description: data.description,
        serviceLine: data.serviceLine,
        sortOrder: data.sortOrder ?? 0,
        active: data.active ?? true,
        updatedAt: new Date(),
      },
      select: {
        id: true,
        name: true,
        description: true,
        serviceLine: true,
        sortOrder: true,
        active: true,
        createdAt: true,
      },
    });

    return NextResponse.json(successResponse(category), { status: 201 });
  },
});

