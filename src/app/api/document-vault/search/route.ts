export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { secureRoute } from '@/lib/api/secureRoute';
import { Feature } from '@/lib/permissions/features';
import { prisma } from '@/lib/db/prisma';
import { successResponse } from '@/lib/utils/apiUtils';
import { getUserAccessibleServiceLines } from '@/lib/services/document-vault/documentVaultAuthorization';
import { getCachedSearchResults, cacheSearchResults } from '@/lib/services/document-vault/documentVaultCache';
import { z } from 'zod';

// Search schema
const SearchSchema = z.object({
  query: z.string().min(2).max(200),
  documentType: z.enum(['POLICY', 'SOP', 'TEMPLATE', 'MARKETING', 'TRAINING', 'OTHER']).optional(),
  categoryId: z.number().int().positive().optional(),
  limit: z.number().int().min(1).max(50).default(20),
});

/**
 * GET /api/document-vault/search
 * Advanced search across documents
 */
export const GET = secureRoute.query({
  feature: Feature.ACCESS_DOCUMENT_VAULT,
  handler: async (request, { user }) => {
    const { searchParams } = new URL(request.url);
    
    // Parse and validate search params
    const params = SearchSchema.parse({
      query: searchParams.get('query') || '',
      documentType: searchParams.get('documentType') || undefined,
      categoryId: searchParams.get('categoryId') ? parseInt(searchParams.get('categoryId')!) : undefined,
      limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 20,
    });

    // Check cache
    const cacheKey = `${params.query}-${params.documentType || 'all'}-${params.categoryId || 'all'}`;
    const cached = await getCachedSearchResults(cacheKey);
    if (cached) {
      return NextResponse.json(successResponse(cached));
    }

    // Get user's accessible service lines
    const accessibleServiceLines = await getUserAccessibleServiceLines(user.id);

    // Build where clause
    const where: any = {
      status: 'PUBLISHED',
      AND: [
        {
          OR: [
            { scope: 'GLOBAL' },
            { 
              scope: 'SERVICE_LINE',
              serviceLine: { in: accessibleServiceLines }
            }
          ],
        },
        {
          OR: [
            { title: { contains: params.query } },
            { description: { contains: params.query } },
            { aiSummary: { contains: params.query } },
            { aiExtractedText: { contains: params.query } },
            { tags: { contains: params.query } },
          ],
        },
      ],
    };

    // Apply filters
    if (params.documentType) {
      where.documentType = params.documentType;
    }

    if (params.categoryId) {
      where.categoryId = params.categoryId;
    }

    // Search documents
    const documents = await prisma.vaultDocument.findMany({
      where,
      select: {
        id: true,
        title: true,
        description: true,
        documentType: true,
        scope: true,
        serviceLine: true,
        aiSummary: true,
        tags: true,
        publishedAt: true,
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
      take: params.limit,
    });

    // Parse tags and add relevance
    const results = documents.map(doc => {
      // Calculate simple relevance score based on where match was found
      let relevance = 0;
      const queryLower = params.query.toLowerCase();
      
      if (doc.title.toLowerCase().includes(queryLower)) relevance += 10;
      if (doc.description?.toLowerCase().includes(queryLower)) relevance += 5;
      if (doc.aiSummary?.toLowerCase().includes(queryLower)) relevance += 3;
      if (doc.tags?.toLowerCase().includes(queryLower)) relevance += 7;

      return {
        ...doc,
        category: doc.VaultDocumentCategory,
        VaultDocumentCategory: undefined,
        tags: doc.tags ? JSON.parse(doc.tags) : null,
        relevance,
      };
    });

    // Sort by relevance
    results.sort((a, b) => b.relevance - a.relevance);

    const result = {
      query: params.query,
      results,
      total: results.length,
    };

    // Cache result
    await cacheSearchResults(cacheKey, result);

    return NextResponse.json(successResponse(result));
  },
});
