import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { secureRoute } from '@/lib/api/secureRoute';
import { Feature } from '@/lib/permissions/features';
import { UpdateDocumentTypeSchema } from '@/lib/validation/schemas';
import { prisma } from '@/lib/db/prisma';
import { successResponse } from '@/lib/utils/apiUtils';
import { SystemRole } from '@/types';
import { invalidateDocumentTypesCache } from '@/lib/services/document-vault/documentVaultCache';

/**
 * PATCH /api/admin/document-vault/types/[id]
 * Update document type (SYSTEM_ADMIN only)
 */
export const PATCH = secureRoute.mutationWithParams<typeof UpdateDocumentTypeSchema, { id: string }>({
  feature: Feature.MANAGE_VAULT_DOCUMENTS,
  schema: UpdateDocumentTypeSchema,
  handler: async (request, { user, params, data }) => {
    const typeId = parseInt(params.id);

    if (isNaN(typeId)) {
      return NextResponse.json(
        { error: 'Invalid document type ID' },
        { status: 400 }
      );
    }

    // Only SYSTEM_ADMIN can update document types
    const userRecord = await prisma.user.findUnique({
      where: { id: user.id },
      select: { role: true },
    });

    if (userRecord?.role !== SystemRole.SYSTEM_ADMIN) {
      return NextResponse.json(
        { error: 'Only system administrators can update document types' },
        { status: 403 }
      );
    }

    // Check if document type exists
    const existing = await prisma.vaultDocumentType.findUnique({
      where: { id: typeId },
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Document type not found' },
        { status: 404 }
      );
    }

    // Build update data (code is immutable)
    const updateData: any = {};
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
 * Delete document type (SYSTEM_ADMIN only)
 * Only allows deletion if no documents use this type
 */
export const DELETE = secureRoute.mutationWithParams<z.ZodVoid, { id: string }>({
  feature: Feature.MANAGE_VAULT_DOCUMENTS,
  handler: async (request, { user, params }) => {
    const typeId = parseInt(params.id);

    if (isNaN(typeId)) {
      return NextResponse.json(
        { error: 'Invalid document type ID' },
        { status: 400 }
      );
    }

    // Only SYSTEM_ADMIN can delete document types
    const userRecord = await prisma.user.findUnique({
      where: { id: user.id },
      select: { role: true },
    });

    if (userRecord?.role !== SystemRole.SYSTEM_ADMIN) {
      return NextResponse.json(
        { error: 'Only system administrators can delete document types' },
        { status: 403 }
      );
    }

    // Get the document type
    const documentType = await prisma.vaultDocumentType.findUnique({
      where: { id: typeId },
      select: { code: true },
    });

    if (!documentType) {
      return NextResponse.json(
        { error: 'Document type not found' },
        { status: 404 }
      );
    }

    // Check if any documents use this type
    const documentCount = await prisma.vaultDocument.count({
      where: { documentType: documentType.code },
    });

    if (documentCount > 0) {
      return NextResponse.json(
        { error: `Cannot delete document type with ${documentCount} associated documents` },
        { status: 400 }
      );
    }

    // Check if any categories use this type
    const categoryCount = await prisma.vaultDocumentCategory.count({
      where: { documentType: documentType.code },
    });

    if (categoryCount > 0) {
      return NextResponse.json(
        { error: `Cannot delete document type with ${categoryCount} associated categories` },
        { status: 400 }
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
