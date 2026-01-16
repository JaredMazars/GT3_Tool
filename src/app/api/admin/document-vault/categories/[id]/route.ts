import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { secureRoute } from '@/lib/api/secureRoute';
import { Feature } from '@/lib/permissions/features';
import { UpdateVaultCategorySchema } from '@/lib/validation/schemas';
import { prisma } from '@/lib/db/prisma';
import { successResponse } from '@/lib/utils/apiUtils';
import { SystemRole } from '@/types';
import { invalidateCategoriesCache } from '@/lib/services/document-vault/documentVaultCache';
import { AppError, ErrorCodes } from '@/lib/utils/errorHandler';

/**
 * GET /api/admin/document-vault/categories/[id]
 * Get single category with approver information
 */
export const GET = secureRoute.queryWithParams<{ id: string }>({
  feature: Feature.MANAGE_VAULT_DOCUMENTS,
  handler: async (request, { user, params }) => {
    const categoryId = parseInt(params.id);

    if (isNaN(categoryId)) {
      throw new AppError(400, 'Invalid category ID', ErrorCodes.VALIDATION_ERROR);
    }

    // Only SYSTEM_ADMIN can view category details
    const userRecord = await prisma.user.findUnique({
      where: { id: user.id },
      select: { role: true },
    });

    if (userRecord?.role !== SystemRole.SYSTEM_ADMIN) {
      return NextResponse.json(
        { error: 'Only system administrators can manage categories' },
        { status: 403 }
      );
    }

    const category = await prisma.vaultDocumentCategory.findUnique({
      where: { id: categoryId },
      select: {
        id: true,
        name: true,
        description: true,
        icon: true,
        color: true,
        documentType: true,
        active: true,
        sortOrder: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            VaultDocument: true,
            CategoryApprover: true,
          },
        },
        CategoryApprover: {
          select: {
            id: true,
            userId: true,
            stepOrder: true,
            createdAt: true,
            User_CategoryApprover_userIdToUser: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
          orderBy: { stepOrder: 'asc' },
        },
      },
    });

    if (!category) {
      throw new AppError(404, 'Category not found', ErrorCodes.NOT_FOUND);
    }

    const result = {
      ...category,
      documentCount: category._count.VaultDocument,
      approverCount: category._count.CategoryApprover,
      approvers: category.CategoryApprover.map(a => ({
        id: a.id,
        userId: a.userId,
        stepOrder: a.stepOrder,
        createdAt: a.createdAt,
        user: a.User_CategoryApprover_userIdToUser,
      })),
      _count: undefined,
      CategoryApprover: undefined,
    };

    return NextResponse.json(successResponse(result));
  },
});

/**
 * PATCH /api/admin/document-vault/categories/[id]
 * Update category (SYSTEM_ADMIN only)
 */
export const PATCH = secureRoute.mutationWithParams<typeof UpdateVaultCategorySchema, { id: string }>({
  feature: Feature.MANAGE_VAULT_DOCUMENTS,
  schema: UpdateVaultCategorySchema,
  handler: async (request, { user, params, data }) => {
    const categoryId = parseInt(params.id);

    if (isNaN(categoryId)) {
      return NextResponse.json(
        { error: 'Invalid category ID' },
        { status: 400 }
      );
    }

    // Only SYSTEM_ADMIN can update categories
    const userRecord = await prisma.user.findUnique({
      where: { id: user.id },
      select: { role: true },
    });

    if (userRecord?.role !== SystemRole.SYSTEM_ADMIN) {
      return NextResponse.json(
        { error: 'Only system administrators can update categories' },
        { status: 403 }
      );
    }

    // Check if category exists
    const existing = await prisma.vaultDocumentCategory.findUnique({
      where: { id: categoryId },
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Category not found' },
        { status: 404 }
      );
    }

    // Build update data
    const updateData: any = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.icon !== undefined) updateData.icon = data.icon;
    if (data.color !== undefined) updateData.color = data.color;
    if (data.documentType !== undefined) updateData.documentType = data.documentType;
    if (data.active !== undefined) updateData.active = data.active;
    if (data.sortOrder !== undefined) updateData.sortOrder = data.sortOrder;

    // Update category
    const updated = await prisma.vaultDocumentCategory.update({
      where: { id: categoryId },
      data: updateData,
      select: {
        id: true,
        name: true,
        description: true,
        icon: true,
        color: true,
        documentType: true,
        active: true,
        sortOrder: true,
        _count: {
          select: {
            CategoryApprover: true,
          },
        },
      },
    });

    const result = {
      ...updated,
      approverCount: updated._count.CategoryApprover,
      _count: undefined,
    };

    // Invalidate cache
    await invalidateCategoriesCache();

    return NextResponse.json(successResponse(result));
  },
});

/**
 * DELETE /api/admin/document-vault/categories/[id]
 * Delete category (SYSTEM_ADMIN only)
 * Only allows deletion if no documents use this category
 */
export const DELETE = secureRoute.mutationWithParams<z.ZodVoid, { id: string }>({
  feature: Feature.MANAGE_VAULT_DOCUMENTS,
  handler: async (request, { user, params }) => {
    const categoryId = parseInt(params.id);

    if (isNaN(categoryId)) {
      return NextResponse.json(
        { error: 'Invalid category ID' },
        { status: 400 }
      );
    }

    // Only SYSTEM_ADMIN can delete categories
    const userRecord = await prisma.user.findUnique({
      where: { id: user.id },
      select: { role: true },
    });

    if (userRecord?.role !== SystemRole.SYSTEM_ADMIN) {
      return NextResponse.json(
        { error: 'Only system administrators can delete categories' },
        { status: 403 }
      );
    }

    // Check if category has documents
    const documentCount = await prisma.vaultDocument.count({
      where: { categoryId },
    });

    if (documentCount > 0) {
      return NextResponse.json(
        { error: `Cannot delete category with ${documentCount} associated documents` },
        { status: 400 }
      );
    }

    // Delete category
    await prisma.vaultDocumentCategory.delete({
      where: { id: categoryId },
    });

    // Invalidate cache
    await invalidateCategoriesCache();

    return NextResponse.json(successResponse({ deleted: true }));
  },
});
