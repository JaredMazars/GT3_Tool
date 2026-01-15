import { NextRequest, NextResponse } from 'next/server';
import { secureRoute } from '@/lib/api/secureRoute';
import { Feature } from '@/lib/permissions/features';
import { UpdateVaultCategorySchema } from '@/lib/validation/schemas';
import { prisma } from '@/lib/db/prisma';
import { successResponse } from '@/lib/utils/apiUtils';
import { SystemRole } from '@/types';
import { invalidateCategoriesCache } from '@/lib/services/document-vault/documentVaultCache';

/**
 * PATCH /api/admin/document-vault/categories/[id]
 * Update category (SYSTEM_ADMIN only)
 */
export const PATCH = secureRoute.mutation({
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
      },
    });

    // Invalidate cache
    await invalidateCategoriesCache();

    return NextResponse.json(successResponse(updated));
  },
});

/**
 * DELETE /api/admin/document-vault/categories/[id]
 * Delete category (SYSTEM_ADMIN only)
 * Only allows deletion if no documents use this category
 */
export const DELETE = secureRoute.mutation({
  feature: Feature.MANAGE_VAULT_DOCUMENTS,
  schema: undefined,
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
