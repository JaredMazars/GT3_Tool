import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { secureRoute } from '@/lib/api/secureRoute';
import { Feature } from '@/lib/permissions/features';
import { UpdateDocumentTypeSchema } from '@/lib/validation/schemas';
import { prisma } from '@/lib/db/prisma';
import { successResponse, parseNumericId } from '@/lib/utils/apiUtils';
import { AppError, ErrorCodes } from '@/lib/utils/errorHandler';
import { invalidateDocumentTypesCache } from '@/lib/services/document-vault/documentVaultCache';

/**
 * PATCH /api/admin/document-vault/types/[id]
 * Update document type (SYSTEM_ADMIN only via feature permission)
 */
export const PATCH = secureRoute.mutationWithParams<typeof UpdateDocumentTypeSchema, { id: string }>({
  feature: Feature.MANAGE_VAULT_DOCUMENTS,
  schema: UpdateDocumentTypeSchema,
  handler: async (request, { user, params, data }) => {
    const typeId = parseNumericId(params.id, 'Document type');

    // Feature permission handles authorization

    // Check if document type exists
    const existing = await prisma.vaultDocumentType.findUnique({
      where: { id: typeId },
      select: { id: true },
    });

    if (!existing) {
      throw new AppError(404, 'Document type not found', ErrorCodes.NOT_FOUND);
    }

    // Build update data with explicit typing (code is immutable)
    const updateData: {
      name?: string;
      description?: string | null;
      icon?: string | null;
      color?: string | null;
      active?: boolean;
      sortOrder?: number;
    } = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.icon !== undefined) updateData.icon = data.icon;
    if (data.color !== undefined) updateData.color = data.color;
    if (data.active !== undefined) updateData.active = data.active;
    if (data.sortOrder !== undefined) updateData.sortOrder = data.sortOrder;

    // Update document type
    const updated = await prisma.vaultDocumentType.update({
      where: { id: typeId },
      data: updateData,
      select: {
        id: true,
        code: true,
        name: true,
        description: true,
        icon: true,
        color: true,
        active: true,
        sortOrder: true,
      },
    });

    // Invalidate cache
    await invalidateDocumentTypesCache();

    return NextResponse.json(successResponse(updated));
  },
});

/**
 * DELETE /api/admin/document-vault/types/[id]
 * Delete document type (SYSTEM_ADMIN only via feature permission)
 * Only allows deletion if no documents or categories use this type
 */
export const DELETE = secureRoute.mutationWithParams<z.ZodVoid, { id: string }>({
  feature: Feature.MANAGE_VAULT_DOCUMENTS,
  handler: async (request, { user, params }) => {
    const typeId = parseNumericId(params.id, 'Document type');

    // Feature permission handles authorization

    // Get the document type
    const documentType = await prisma.vaultDocumentType.findUnique({
      where: { id: typeId },
      select: { code: true },
    });

    if (!documentType) {
      throw new AppError(404, 'Document type not found', ErrorCodes.NOT_FOUND);
    }

    // Check if any documents use this type
    const documentCount = await prisma.vaultDocument.count({
      where: { documentType: documentType.code },
    });

    if (documentCount > 0) {
      throw new AppError(
        400,
        `Cannot delete document type with ${documentCount} associated documents`,
        ErrorCodes.VALIDATION_ERROR
      );
    }

    // Check if any categories use this type
    const categoryCount = await prisma.vaultDocumentCategory.count({
      where: { documentType: documentType.code },
    });

    if (categoryCount > 0) {
      throw new AppError(
        400,
        `Cannot delete document type with ${categoryCount} associated categories`,
        ErrorCodes.VALIDATION_ERROR
      );
    }

    // Delete document type
    await prisma.vaultDocumentType.delete({
      where: { id: typeId },
    });

    // Invalidate cache
    await invalidateDocumentTypesCache();

    return NextResponse.json(successResponse({ deleted: true }));
  },
});
