/**
 * Individual Review Category API Routes
 * PUT - Update category
 * DELETE - Deactivate category
 */

import { NextResponse } from 'next/server';
import { secureRoute, Feature } from '@/lib/api/secureRoute';
import { UpdateReviewCategorySchema } from '@/lib/validation/schemas';
import { successResponse, parseNumericId } from '@/lib/utils/apiUtils';
import { AppError, ErrorCodes } from '@/lib/utils/errorHandler';
import { prisma } from '@/lib/db/prisma';
import { hasPartnerAccess } from '@/lib/utils/roleHierarchy';

/**
 * PUT /api/tasks/[taskId]/review-notes/categories/[categoryId]
 * Update a review category (PARTNER+ only)
 */
export const PUT = secureRoute.mutationWithParams({
  feature: Feature.MANAGE_TASKS,
  schema: UpdateReviewCategorySchema,
  handler: async (request, { user, data, params }) => {
    // Business logic authorization: Only partners and above can update categories
    if (!hasPartnerAccess(user.role)) {
      throw new AppError(403, 'Only partners and above can update categories', ErrorCodes.FORBIDDEN);
    }

    const categoryId = parseNumericId(params.categoryId, 'Category ID');

    // Check if category exists
    const existingCategory = await prisma.reviewCategory.findUnique({
      where: { id: categoryId },
      select: { id: true },
    });

    if (!existingCategory) {
      throw new AppError(404, 'Category not found', ErrorCodes.NOT_FOUND);
    }

    // Update category
    const category = await prisma.reviewCategory.update({
      where: { id: categoryId },
      data,
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

    return NextResponse.json(successResponse(category));
  },
});

/**
 * DELETE /api/tasks/[taskId]/review-notes/categories/[categoryId]
 * Deactivate a review category (PARTNER+ only)
 * Note: We don't actually delete to preserve data integrity
 */
export const DELETE = secureRoute.mutationWithParams({
  feature: Feature.MANAGE_TASKS,
  handler: async (request, { user, params }) => {
    // Business logic authorization: Only partners and above can deactivate categories
    if (!hasPartnerAccess(user.role)) {
      throw new AppError(403, 'Only partners and above can deactivate categories', ErrorCodes.FORBIDDEN);
    }

    const categoryId = parseNumericId(params.categoryId, 'Category ID');

    // Check if category exists
    const existingCategory = await prisma.reviewCategory.findUnique({
      where: { id: categoryId },
      select: { id: true },
    });

    if (!existingCategory) {
      throw new AppError(404, 'Category not found', ErrorCodes.NOT_FOUND);
    }

    // Deactivate category (soft delete)
    await prisma.reviewCategory.update({
      where: { id: categoryId },
      data: { active: false },
    });

    return NextResponse.json(successResponse({ message: 'Category deactivated successfully' }));
  },
});

