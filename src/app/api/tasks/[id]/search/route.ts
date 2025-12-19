import { NextResponse } from 'next/server';
import { parseTaskId, successResponse } from '@/lib/utils/apiUtils';
import { checkTaskAccess } from '@/lib/services/tasks/taskAuthorization';
import { enhancedSearchService } from '@/lib/services/search/enhancedSearchService';
import { logger } from '@/lib/utils/logger';
import { SearchFilters } from '@/types/search';
import { toTaskId } from '@/types/branded';
import { secureRoute } from '@/lib/api/secureRoute';
import { AppError, ErrorCodes } from '@/lib/utils/errorHandler';
import { z } from 'zod';

const TaskSearchQuerySchema = z.object({
  q: z.string().min(1).max(500),
  sources: z.enum(['all', 'internal', 'external']).optional().default('all'),
  category: z.string().max(100).optional(),
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional().default(10),
});

/**
 * GET /api/tasks/[id]/search
 * Enhanced search across internal documents and external web sources
 */
export const GET = secureRoute.queryWithParams({
  handler: async (request, { user, params }) => {
    const taskId = toTaskId(parseTaskId(params?.id));

    const hasAccess = await checkTaskAccess(user.id, taskId);
    if (!hasAccess) {
      throw new AppError(403, 'Forbidden', ErrorCodes.FORBIDDEN);
    }

    const { searchParams } = new URL(request.url);
    
    // Validate query parameters
    const queryParamsResult = TaskSearchQuerySchema.safeParse({
      q: searchParams.get('q'),
      sources: searchParams.get('sources') || undefined,
      category: searchParams.get('category') || undefined,
      dateFrom: searchParams.get('dateFrom') || undefined,
      dateTo: searchParams.get('dateTo') || undefined,
      limit: searchParams.get('limit') || undefined,
    });

    if (!queryParamsResult.success) {
      throw new AppError(400, 'Invalid query parameters', ErrorCodes.VALIDATION_ERROR, {
        errors: queryParamsResult.error.flatten().fieldErrors,
      });
    }

    const { q: query, sources, category, dateFrom, dateTo, limit } = queryParamsResult.data;

    logger.info('Project search initiated', { query, taskId, sources, userId: user.id });

    const filters: SearchFilters = { 
      category, 
      dateFrom: dateFrom ? new Date(dateFrom) : undefined, 
      dateTo: dateTo ? new Date(dateTo) : undefined, 
      limit,
    };

    let searchResults;

    switch (sources) {
      case 'internal':
        searchResults = {
          results: await enhancedSearchService.searchInternalDocuments(query, taskId, filters),
          totalCount: 0,
          query,
          sources: ['internal' as const],
        };
        searchResults.totalCount = searchResults.results.length;
        break;

      case 'external':
        searchResults = {
          results: await enhancedSearchService.searchExternal(query),
          totalCount: 0,
          query,
          sources: ['external' as const],
        };
        searchResults.totalCount = searchResults.results.length;
        break;

      case 'all':
      default:
        searchResults = await enhancedSearchService.searchAll(query, taskId, true, filters);
        break;
    }

    return NextResponse.json(successResponse(searchResults));
  },
});
