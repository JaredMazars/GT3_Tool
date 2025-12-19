import { NextResponse } from 'next/server';
import { successResponse } from '@/lib/utils/apiUtils';
import { checkTaskAccess } from '@/lib/services/tasks/taskAuthorization';
import { enhancedSearchService } from '@/lib/services/search/enhancedSearchService';
import { logger } from '@/lib/utils/logger';
import { SearchFilters } from '@/types/search';
import { toTaskId } from '@/types/branded';
import { secureRoute } from '@/lib/api/secureRoute';

/**
 * GET /api/tasks/[id]/search
 * Enhanced search across internal documents and external web sources
 */
export const GET = secureRoute.queryWithParams({
  handler: async (request, { user, params }) => {
    const taskId = toTaskId(params.id);

    const hasAccess = await checkTaskAccess(user.id, taskId);
    if (!hasAccess) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');
    const sources = searchParams.get('sources') || 'all';
    const category = searchParams.get('category') || undefined;
    const dateFrom = searchParams.get('dateFrom') ? new Date(searchParams.get('dateFrom')!) : undefined;
    const dateTo = searchParams.get('dateTo') ? new Date(searchParams.get('dateTo')!) : undefined;
    const limit = searchParams.get('limit') ? Number.parseInt(searchParams.get('limit')!, 10) : 10;

    if (!query) {
      return NextResponse.json({ success: false, error: 'Query parameter "q" is required' }, { status: 400 });
    }

    logger.info('Project search initiated', { query, taskId, sources, userId: user.id });

    const filters: SearchFilters = { category, dateFrom, dateTo, limit };

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
