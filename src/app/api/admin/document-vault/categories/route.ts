import { NextRequest, NextResponse } from 'next/server';
import { secureRoute } from '@/lib/api/secureRoute';
import { Feature } from '@/lib/permissions/features';
import { CreateVaultCategorySchema, UpdateVaultCategorySchema } from '@/lib/validation/schemas';
import { prisma } from '@/lib/db/prisma';
import { successResponse } from '@/lib/utils/apiUtils';
import { SystemRole } from '@/types';
import { invalidateCategoriesCache } from '@/lib/services/document-vault/documentVaultCache';

/**
 * POST /api/admin/document-vault/categories
 * Create new category (SYSTEM_ADMIN only)
 */
export const POST = secureRoute.mutation({
  feature: Feature.MANAGE_VAULT_DOCUMENTS,
  schema: CreateVaultCategorySchema,
  handler: async (request, { user, data }) => {
    // Only SYSTEM_ADMIN can create categories
    const userRecord = await prisma.user.findUnique({
      where: { id: user.id },
      select: { role: true },
    });

    if (userRecord?.role !== SystemRole.SYSTEM_ADMIN) {
      return NextResponse.json(
        { error: 'Only system administrators can create categories' },
        { status: 403 }
      );
    }

    // Create category
    const category = await prisma.vaultDocumentCategory.create({
      data: {
        name: data.name,
        description: data.description,
        icon: data.icon,
        color: data.color,
        documentType: data.documentType,
        sortOrder: data.sortOrder || 0,
      },
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

    return NextResponse.json(successResponse(category), { status: 201 });
  },
});

/**
 * GET /api/admin/document-vault/categories
 * Get all categories (including inactive)
 */
export const GET = secureRoute.query({
  feature: Feature.MANAGE_VAULT_DOCUMENTS,
  handler: async (request, { user }) => {
    // Only SYSTEM_ADMIN can view all categories
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

    const categories = await prisma.vaultDocumentCategory.findMany({
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
      orderBy: { sortOrder: 'asc' },
    });

    const result = categories.map(cat => ({
      ...cat,
      documentCount: cat._count.VaultDocument,
      approverCount: cat._count.CategoryApprover,
      approvers: cat.CategoryApprover.map(a => ({
        id: a.id,
        userId: a.userId,
        stepOrder: a.stepOrder,
        user: a.User_CategoryApprover_userIdToUser,
      })),
      _count: undefined,
      CategoryApprover: undefined,
    }));

    return NextResponse.json(successResponse(result));
  },
});
