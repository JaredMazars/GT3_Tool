import { NextRequest, NextResponse } from 'next/server';
import { secureRoute } from '@/lib/api/secureRoute';
import { Feature } from '@/lib/permissions/features';
import { prisma } from '@/lib/db/prisma';
import { successResponse } from '@/lib/utils/apiUtils';
import { getCachedCategories, cacheCategories } from '@/lib/services/document-vault/documentVaultCache';

/**
 * GET /api/document-vault/categories
 * List all active categories with document counts
 */
export const GET = secureRoute.query({
  feature: Feature.ACCESS_DOCUMENT_VAULT,
  handler: async (request, { user }) => {
    const { searchParams } = new URL(request.url);
    const documentType = searchParams.get('documentType');

    // Check cache
    const cached = await getCachedCategories();
    if (cached) {
      // Filter by document type if requested
      if (documentType) {
        const filtered = cached.filter(
          (cat: any) => !cat.documentType || cat.documentType === documentType
        );
        return NextResponse.json(successResponse(filtered));
      }
      return NextResponse.json(successResponse(cached));
    }

    // Build where clause
    const where: any = {
      active: true,
    };

    if (documentType) {
      where.OR = [
        { documentType: documentType },
        { documentType: null }, // Categories without specific type are available for all
      ];
    }

    // Fetch categories with document counts
    const categories = await prisma.vaultDocumentCategory.findMany({
      where,
      select: {
        id: true,
        name: true,
        description: true,
        icon: true,
        color: true,
        documentType: true,
        sortOrder: true,
        _count: {
          select: {
            VaultDocument: {
              where: {
                status: 'PUBLISHED',
              },
            },
          },
        },
      },
      orderBy: { sortOrder: 'asc' },
    });

    // Transform response
    const result = categories.map(cat => ({
      id: cat.id,
      name: cat.name,
      description: cat.description,
      icon: cat.icon,
      color: cat.color,
      documentType: cat.documentType,
      sortOrder: cat.sortOrder,
      documentCount: cat._count.VaultDocument,
    }));

    // Cache result
    await cacheCategories(result);

    return NextResponse.json(successResponse(result));
  },
});
