/**
 * Admin API: Review Category Detail
 * GET - Get category details
 * PUT - Update category
 * DELETE - Delete category (only if no notes)
 */

import { NextResponse } from 'next/server';
import { secureRoute, Feature } from '@/lib/api/secureRoute';
import { prisma } from '@/lib/db/prisma';
import { successResponse, parseNumericId } from '@/lib/utils/apiUtils';
import { UpdateReviewCategorySchema } from '@/lib/validation/schemas';
import { AppError, ErrorCodes } from '@/lib/utils/errorHandler';

/**
 * GET /api/admin/review-categories/[id]
 * Get category details
 */
export const GET = secureRoute.query({
  feature: Feature.MANAGE_TOOLS,
  handler: async (request, { user }) => {
    const url = new URL(request.url);
    const id = parseNumericId(url.pathname.split('/').pop() || '0', 'Category ID');

    const category = await prisma.reviewCategory.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        description: true,
        serviceLine: true,
        sortOrder: true,
        active: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            ReviewNote: true,
          },
        },
      },
    });

    if (!category) {
      throw new AppError(404, 'Category not found', ErrorCodes.NOT_FOUND);
    }

    return NextResponse.json(successResponse(category));
  },
});

/**
 * PUT /api/admin/review-categories/[id]
 * Update category
 */
export const PUT = secureRoute.mutation({
  feature: Feature.MANAGE_TOOLS,
  schema: UpdateReviewCategorySchema,
  handler: async (request, { user, data }) => {
    const url = new URL(request.url);
    const id = parseNumericId(url.pathname.split('/').pop() || '0', 'Category ID');

    // Verify category exists
    const existing = await prisma.reviewCategory.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        serviceLine: true,
      },
    });

    if (!existing) {
      throw new AppError(404, 'Category not found', ErrorCodes.NOT_FOUND);
    }

    // Check for duplicate name if name is being changed
    if (data.name && data.name !== existing.name) {
      const duplicate = await prisma.reviewCategory.findFirst({
        where: {
          name: data.name,
          serviceLine: data.serviceLine !== undefined ? data.serviceLine : existing.serviceLine,
          id: { not: id },
        },
        select: {
          id: true,
        },
      });

      if (duplicate) {
        throw new AppError(
          400,
          'A category with this name already exists',
          ErrorCodes.VALIDATION_ERROR
        );
      }
    }

    const category = await prisma.reviewCategory.update({
      where: { id },
      data: {
        name: data.name,
        description: data.description,
        serviceLine: data.serviceLine,
        sortOrder: data.sortOrder,
        active: data.active,
      },
      select: {
        id: true,
        name: true,
        description: true,
        serviceLine: true,
        sortOrder: true,
        active: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json(successResponse(category));
  },
});

/**
 * DELETE /api/admin/review-categories/[id]
 * Delete category (only if no associated notes)
 */
export const DELETE = secureRoute.mutation({
  feature: Feature.MANAGE_TOOLS,
  handler: async (request, { user }) => {
    const url = new URL(request.url);
    const id = parseNumericId(url.pathname.split('/').pop() || '0', 'Category ID');

    // Check if category has any notes
    const noteCount = await prisma.reviewNote.count({
      where: { categoryId: id },
    });

    if (noteCount > 0) {
      throw new AppError(
        400,
        `Cannot delete category with ${noteCount} associated notes. Deactivate it instead.`,
        ErrorCodes.VALIDATION_ERROR
      );
    }

    await prisma.reviewCategory.delete({
      where: { id },
    });

    return NextResponse.json(successResponse({ success: true }));
  },
});

