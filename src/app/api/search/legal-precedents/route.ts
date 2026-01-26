import { NextResponse } from 'next/server';
import { successResponse } from '@/lib/utils/apiUtils';
import { bingSearchService } from '@/lib/services/search/bingSearchService';
import { logger } from '@/lib/utils/logger';
import { secureRoute } from '@/lib/api/secureRoute';

export const dynamic = 'force-dynamic';

/**
 * GET /api/search/legal-precedents
 * Search for legal precedents and case law
 */
export const GET = secureRoute.query({
  handler: async (request, { user }) => {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');
    const jurisdiction = searchParams.get('jurisdiction') || 'South Africa';

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

    logger.info('Performing legal precedent search', { query, jurisdiction, userId: user.id });

    const results = await bingSearchService.searchLegalPrecedents(query, jurisdiction);

    return NextResponse.json(
      successResponse({
        query,
        jurisdiction,
        count: results.length,
        results,
      })
    );
  },
});


