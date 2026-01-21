import { NextRequest, NextResponse } from 'next/server';
import { secureRoute } from '@/lib/api/secureRoute';
import { Feature } from '@/lib/permissions/features';
import { z } from 'zod';
import { prisma } from '@/lib/db/prisma';
import { successResponse, parseNumericId } from '@/lib/utils/apiUtils';
import { AppError, ErrorCodes } from '@/lib/utils/errorHandler';
import { invalidateCategoriesCache } from '@/lib/services/document-vault/documentVaultCache';

// Validation schema for approvers
const CategoryApproversSchema = z.object({
  approvers: z.array(z.string().min(1))
    .min(1, 'At least one approver is required')
    .max(10, 'Maximum 10 approvers allowed'),
}).strict();

/**
 * GET /api/admin/document-vault/categories/[id]/approvers
 * List all approvers for a category in order
 */
export const GET = secureRoute.queryWithParams<{ id: string }>({
  feature: Feature.MANAGE_VAULT_DOCUMENTS,
  handler: async (request, { user, params }) => {
    const categoryId = parseNumericId(params.id, 'Category');

    // Verify category exists
    const category = await prisma.vaultDocumentCategory.findUnique({
      where: { id: categoryId },
      select: { id: true, name: true },
    });

    if (!category) {
      throw new AppError(404, 'Category not found', ErrorCodes.NOT_FOUND);
    }

    // Get approvers with user details
    const approvers = await prisma.categoryApprover.findMany({
      where: { categoryId },
      select: {
        id: true,
        categoryId: true,
        userId: true,
        stepOrder: true,
        createdAt: true,
        createdBy: true,
        User_CategoryApprover_userIdToUser: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        User_CategoryApprover_createdByToUser: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: [
        { stepOrder: 'asc' },
        { id: 'asc' }, // Deterministic secondary sort
      ],
      take: 50,
    });

    // Transform to cleaner response format
    const formattedApprovers = approvers.map(approver => ({
      id: approver.id,
      categoryId: approver.categoryId,
      userId: approver.userId,
      stepOrder: approver.stepOrder,
      createdAt: approver.createdAt,
      createdBy: approver.createdBy,
      user: approver.User_CategoryApprover_userIdToUser,
      creator: approver.User_CategoryApprover_createdByToUser,
    }));

    return NextResponse.json(successResponse({
      category,
      approvers: formattedApprovers,
    }));
  },
});

/**
 * POST /api/admin/document-vault/categories/[id]/approvers
 * Replace all approvers for a category
 * Body: { approvers: string[] } - Array of user IDs in desired order
 */
export const POST = secureRoute.mutationWithParams<typeof CategoryApproversSchema, { id: string }>({
  feature: Feature.MANAGE_VAULT_DOCUMENTS,
  schema: CategoryApproversSchema,
  handler: async (request, { user, data, params }) => {
    const categoryId = parseNumericId(params.id, 'Category');

    // Verify category exists
    const category = await prisma.vaultDocumentCategory.findUnique({
      where: { id: categoryId },
      select: { id: true, name: true, active: true },
    });

    if (!category) {
      throw new AppError(404, 'Category not found', ErrorCodes.NOT_FOUND);
    }

    // Validate all users exist
    const users = await prisma.user.findMany({
      where: { id: { in: data.approvers } },
      select: { id: true, name: true, email: true },
    });

    if (users.length !== data.approvers.length) {
      const foundIds = users.map(u => u.id);
      const missingIds = data.approvers.filter(id => !foundIds.includes(id));
      throw new AppError(
        400, 
        `Invalid user IDs: ${missingIds.join(', ')}`, 
        ErrorCodes.VALIDATION_ERROR
      );
    }

    // Check for duplicates in input
    const uniqueApprovers = new Set(data.approvers);
    if (uniqueApprovers.size !== data.approvers.length) {
      throw new AppError(
        400,
        'Duplicate approvers are not allowed',
        ErrorCodes.VALIDATION_ERROR
      );
    }

    // Use transaction to replace approvers atomically
    const result = await prisma.$transaction(async (tx) => {
      // Delete existing approvers
      await tx.categoryApprover.deleteMany({
        where: { categoryId },
      });

      // Create new approvers with step order
      const newApprovers = await Promise.all(
        data.approvers.map((userId, index) =>
          tx.categoryApprover.create({
            data: {
              categoryId,
              userId,
              stepOrder: index + 1,
              createdBy: user.id,
            },
            select: {
              id: true,
              categoryId: true,
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
          })
        )
      );

      return newApprovers;
    });

    // Transform response
    const formattedApprovers = result.map(approver => ({
      id: approver.id,
      categoryId: approver.categoryId,
      userId: approver.userId,
      stepOrder: approver.stepOrder,
      createdAt: approver.createdAt,
      user: approver.User_CategoryApprover_userIdToUser,
    }));

    // Invalidate cache
    await invalidateCategoriesCache();

    return NextResponse.json(successResponse({
      message: `Successfully assigned ${data.approvers.length} approver(s) to category "${category.name}"`,
      category,
      approvers: formattedApprovers,
    }));
  },
});

/**
 * DELETE /api/admin/document-vault/categories/[id]/approvers
 * Remove all approvers from a category
 * WARNING: This will block document uploads to this category
 */
export const DELETE = secureRoute.mutationWithParams<z.ZodVoid, { id: string }>({
  feature: Feature.MANAGE_VAULT_DOCUMENTS,
  handler: async (request, { user, params }) => {
    const categoryId = parseNumericId(params.id, 'Category');

    // Verify category exists
    const category = await prisma.vaultDocumentCategory.findUnique({
      where: { id: categoryId },
      select: { id: true, name: true },
    });

    if (!category) {
      throw new AppError(404, 'Category not found', ErrorCodes.NOT_FOUND);
    }

    // Delete all approvers
    const deleted = await prisma.categoryApprover.deleteMany({
      where: { categoryId },
    });

    // Invalidate cache
    await invalidateCategoriesCache();

    return NextResponse.json(successResponse({
      message: `Removed ${deleted.count} approver(s) from category "${category.name}"`,
      deletedCount: deleted.count,
    }));
  },
});
