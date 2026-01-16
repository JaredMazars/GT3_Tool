import { NextRequest, NextResponse } from 'next/server';
import { secureRoute } from '@/lib/api/secureRoute';
import { Feature } from '@/lib/permissions/features';
import { CreateDocumentTypeSchema } from '@/lib/validation/schemas';
import { prisma } from '@/lib/db/prisma';
import { successResponse } from '@/lib/utils/apiUtils';
import { SystemRole } from '@/types';
import { invalidateDocumentTypesCache } from '@/lib/services/document-vault/documentVaultCache';

/**
 * POST /api/admin/document-vault/types
 * Create new document type (SYSTEM_ADMIN only)
 */
export const POST = secureRoute.mutation({
  feature: Feature.MANAGE_VAULT_DOCUMENTS,
  schema: CreateDocumentTypeSchema,
  handler: async (request, { user, data }) => {
    // Only SYSTEM_ADMIN can create document types
    const userRecord = await prisma.user.findUnique({
      where: { id: user.id },
      select: { role: true },
    });

    if (userRecord?.role !== SystemRole.SYSTEM_ADMIN) {
      return NextResponse.json(
        { error: 'Only system administrators can create document types' },
        { status: 403 }
      );
    }

    // Check if code already exists
    const existing = await prisma.vaultDocumentType.findUnique({
      where: { code: data.code },
    });

    if (existing) {
      return NextResponse.json(
        { error: `Document type with code "${data.code}" already exists` },
        { status: 400 }
      );
    }

    // Create document type
    const documentType = await prisma.vaultDocumentType.create({
      data: {
        code: data.code,
        name: data.name,
        description: data.description,
        icon: data.icon,
        color: data.color,
        sortOrder: data.sortOrder || 0,
      },
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

    return NextResponse.json(successResponse(documentType), { status: 201 });
  },
});

/**
 * GET /api/admin/document-vault/types
 * Get all document types (including inactive)
 */
export const GET = secureRoute.query({
  feature: Feature.MANAGE_VAULT_DOCUMENTS,
  handler: async (request, { user }) => {
    // Only SYSTEM_ADMIN can view all document types
    const userRecord = await prisma.user.findUnique({
      where: { id: user.id },
      select: { role: true },
    });

    if (userRecord?.role !== SystemRole.SYSTEM_ADMIN) {
      return NextResponse.json(
        { error: 'Only system administrators can manage document types' },
        { status: 403 }
      );
    }

    const types = await prisma.vaultDocumentType.findMany({
      select: {
        id: true,
        code: true,
        name: true,
        description: true,
        icon: true,
        color: true,
        active: true,
        sortOrder: true,
        createdAt: true,
        _count: {
          select: {
            VaultDocument: true,
          },
        },
      },
      orderBy: { sortOrder: 'asc' },
    });

    const result = types.map(type => ({
      ...type,
      documentCount: type._count.VaultDocument,
      _count: undefined,
    }));

    return NextResponse.json(successResponse(result));
  },
});
