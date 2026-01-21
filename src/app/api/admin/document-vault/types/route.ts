import { NextRequest, NextResponse } from 'next/server';
import { secureRoute } from '@/lib/api/secureRoute';
import { Feature } from '@/lib/permissions/features';
import { CreateDocumentTypeSchema } from '@/lib/validation/schemas';
import { prisma } from '@/lib/db/prisma';
import { successResponse } from '@/lib/utils/apiUtils';
import { AppError, ErrorCodes } from '@/lib/utils/errorHandler';
import { invalidateDocumentTypesCache } from '@/lib/services/document-vault/documentVaultCache';

/**
 * GET /api/admin/document-vault/types
 * Get all document types (including inactive)
 */
export const GET = secureRoute.query({
  feature: Feature.MANAGE_VAULT_DOCUMENTS,
  handler: async (request, { user }) => {
    // Feature permission handles authorization

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
      orderBy: [
        { sortOrder: 'asc' },
        { id: 'asc' }, // Deterministic secondary sort
      ],
      take: 100,
    });

    const result = types.map(type => ({
      ...type,
      documentCount: type._count.VaultDocument,
      _count: undefined,
    }));

    return NextResponse.json(successResponse(result));
  },
});

/**
 * POST /api/admin/document-vault/types
 * Create new document type (SYSTEM_ADMIN only via feature permission)
 */
export const POST = secureRoute.mutation({
  feature: Feature.MANAGE_VAULT_DOCUMENTS,
  schema: CreateDocumentTypeSchema,
  handler: async (request, { user, data }) => {
    // Feature permission handles authorization

    // Check if code already exists
    const existing = await prisma.vaultDocumentType.findUnique({
      where: { code: data.code },
      select: { code: true },
    });

    if (existing) {
      throw new AppError(
        400,
        `Document type with code "${data.code}" already exists`,
        ErrorCodes.VALIDATION_ERROR
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
        sortOrder: data.sortOrder ?? 0,
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
