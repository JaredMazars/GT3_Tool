export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { secureRoute } from '@/lib/api/secureRoute';
import { Feature } from '@/lib/permissions/features';
import { VaultDocumentFiltersSchema } from '@/lib/validation/schemas';
import { prisma } from '@/lib/db/prisma';
import { successResponse } from '@/lib/utils/apiUtils';
import { getUserAccessibleServiceLines } from '@/lib/services/document-vault/documentVaultAuthorization';
import { getCachedDocumentList, cacheDocumentList } from '@/lib/services/document-vault/documentVaultCache';

/**
 * GET /api/document-vault
 * List all published documents accessible to user
 */
export const GET = secureRoute.query({
  feature: Feature.ACCESS_DOCUMENT_VAULT,
  handler: async (request, { user }) => {
    const { searchParams } = new URL(request.url);
    
    // Parse and validate filters
    const filters = VaultDocumentFiltersSchema.parse({
      search: searchParams.get('search') || undefined,
      categoryId: searchParams.get('categoryId') ? parseInt(searchParams.get('categoryId')!) : undefined,
      documentType: searchParams.get('documentType') || undefined,
      scope: searchParams.get('scope') || undefined,
      serviceLine: searchParams.get('serviceLine') || undefined,
      page: searchParams.get('page') ? parseInt(searchParams.get('page')!) : 1,
      limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 20,
    });

    // Check cache
    const cacheKey = {
      scope: filters.scope,
      serviceLine: filters.serviceLine,
      categoryId: filters.categoryId,
      documentType: filters.documentType,
      status: 'PUBLISHED',
    };
    
    const cached = await getCachedDocumentList(cacheKey);
    if (cached) {
      return NextResponse.json(successResponse(cached));
    }

    // Get user's accessible service lines
    const accessibleServiceLines = await getUserAccessibleServiceLines(user.id);


    // Build where clause
    const where: any = {
      status: 'PUBLISHED',
    };

    // Apply scope filter
    if (filters.scope) {
      where.scope = filters.scope;
    } else {
      // If no scope specified, include both global and accessible service line documents
      where.OR = [
        { scope: 'GLOBAL' },
        { 
          scope: 'SERVICE_LINE',
          serviceLine: { in: accessibleServiceLines }
        }
      ];
    }

    // Apply service line filter (if specified)
    if (filters.serviceLine) {

      // Verify user has access to this service line
      if (!accessibleServiceLines.includes(filters.serviceLine)) {

        return NextResponse.json(
          { error: 'Access denied to specified service line' },
          { status: 403 }
        );
      }
      
      // Include both service line specific documents AND global documents
      where.OR = [
        { 
          scope: 'SERVICE_LINE',
          serviceLine: filters.serviceLine 
        },
        { 
          scope: 'GLOBAL' 
        }
      ];
    }

    // Apply other filters
    if (filters.categoryId) {
      where.categoryId = filters.categoryId;
    }

    if (filters.documentType) {
      where.documentType = filters.documentType;
    }

    if (filters.search) {
      where.OR = [
        { title: { contains: filters.search } },
        { description: { contains: filters.search } },
        { aiSummary: { contains: filters.search } },
        { aiExtractedText: { contains: filters.search } },
      ];
    }

    // Query documents
    const [documents, total] = await Promise.all([
      prisma.vaultDocument.findMany({
        where,
        select: {
          id: true,
          title: true,
          documentType: true,
          scope: true,
          serviceLine: true,
          version: true,
          aiSummary: true,
          tags: true,
          publishedAt: true,
          fileSize: true,
          mimeType: true,
          VaultDocumentCategory: {
            select: {
              id: true,
              name: true,
              icon: true,
              color: true,
            },
          },
        },
        orderBy: { publishedAt: 'desc' },
        skip: (filters.page - 1) * filters.limit,
        take: filters.limit,
      }),
      prisma.vaultDocument.count({ where }),
    ]);

    // Parse tags from JSON and map VaultDocumentCategory to category
    const documentsWithTags = documents.map(doc => ({
      ...doc,
      category: doc.VaultDocumentCategory,
      VaultDocumentCategory: undefined,
      tags: doc.tags ? JSON.parse(doc.tags) : null,
    }));

    const result = {
      documents: documentsWithTags,
      pagination: {
        page: filters.page,
        limit: filters.limit,
        total,
        totalPages: Math.ceil(total / filters.limit),
      },
    };

    // Cache result
    await cacheDocumentList(cacheKey, result);

    return NextResponse.json(successResponse(result));
  },
});
