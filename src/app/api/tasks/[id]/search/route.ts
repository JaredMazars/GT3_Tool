import { NextRequest, NextResponse } from 'next/server';
import { handleApiError } from '@/lib/utils/errorHandler';
import { successResponse, parseTaskId } from '@/lib/utils/apiUtils';
import { getCurrentUser, checkTaskAccess } from '@/lib/services/tasks/taskAuthorization';
import { enhancedSearchService } from '@/lib/services/search/enhancedSearchService';
import { logger } from '@/lib/utils/logger';
import { SearchFilters } from '@/types/search';

/**
 * GET /api/tasks/[id]/search
 * Enhanced search across internal documents and external web sources
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const params = await context.params;
    const taskId = parseTaskId(params.id);

    // Check project access
    const hasAccess = await checkTaskAccess(user.id, taskId);
    if (!hasAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');
    const sources = searchParams.get('sources') || 'all'; // 'internal', 'external', or 'all'
    const category = searchParams.get('category') || undefined;
    const categories = searchParams.get('categories')?.split(',') || undefined;
    const dateFrom = searchParams.get('dateFrom') ? new Date(searchParams.get('dateFrom')!) : undefined;
    const dateTo = searchParams.get('dateTo') ? new Date(searchParams.get('dateTo')!) : undefined;
    const limit = searchParams.get('limit') ? Number.parseInt(searchParams.get('limit')!, 10) : 10;

    if (!query) {
      return NextResponse.json(
        { error: 'Query parameter "q" is required' },
        { status: 400 }
      );
    }

    logger.info('Project search initiated', {
      query,
      taskId,
      sources,
      userId: user.id,
    });

    const filters: SearchFilters = {
      category,
      dateFrom,
      dateTo,
      limit,
    };

    let searchResults;

    switch (sources) {
      case 'internal':
        searchResults = {
          results: await enhancedSearchService.searchInternalDocuments(
            query,
            taskId,
            filters
          ),
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
        searchResults = await enhancedSearchService.searchAll(
          query,
          taskId,
          true,
          filters
        );
        break;
    }

    return NextResponse.json(successResponse(searchResults));
  } catch (error) {
    return handleApiError(error, 'GET /api/tasks/:id/search');
  }
}

