import { NextResponse } from 'next/server';
import { successResponse } from '@/lib/utils/apiUtils';
import { bingSearchService } from '@/lib/services/search/bingSearchService';
import { logger } from '@/lib/utils/logger';
import { secureRoute } from '@/lib/api/secureRoute';

export const dynamic = 'force-dynamic';

/**
 * GET /api/search/web
 * Perform general web search using Bing
 */
export const GET = secureRoute.query({
  handler: async (request, { user }) => {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');
    const countParam = searchParams.get('count');
    const count = countParam ? Math.min(Number.parseInt(countParam, 10), 50) : 10;
    const market = searchParams.get('market') || 'en-ZA';

    if (!query) {
      return NextResponse.json(
        { success: false, error: 'Query parameter "q" is required' },
        { status: 400 }
      );
    }

    if (!bingSearchService.isEnabled()) {
      return NextResponse.json(
        { success: false, error: 'Web search is not configured' },
        { status: 503 }
      );
    }

    logger.info('Performing web search', { query, count, userId: user.id });

    const results = await bingSearchService.searchWeb(query, count, market);

    return NextResponse.json(
      successResponse({
        query,
        count: results.length,
        results,
      })
    );
  },
});


