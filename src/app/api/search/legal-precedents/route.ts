import { NextRequest, NextResponse } from 'next/server';
import { handleApiError } from '@/lib/utils/errorHandler';
import { successResponse } from '@/lib/utils/apiUtils';
import { getCurrentUser } from '@/lib/services/auth/auth';
import { bingSearchService } from '@/lib/services/search/bingSearchService';
import { logger } from '@/lib/utils/logger';
import { enforceRateLimit, RateLimitPresets } from '@/lib/utils/rateLimit';

// Force dynamic rendering (uses cookies and headers)
export const dynamic = 'force-dynamic';

/**
 * GET /api/search/legal-precedents
 * Search for legal precedents and case law
 */
export async function GET(request: NextRequest) {
  try {
    // Apply rate limiting for search operations
    enforceRateLimit(request, RateLimitPresets.STANDARD);
    
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');
    const jurisdiction = searchParams.get('jurisdiction') || 'South Africa';

    if (!query) {
      return NextResponse.json(
        { error: 'Query parameter "q" is required' },
        { status: 400 }
      );
    }

    if (!bingSearchService.isEnabled()) {
      return NextResponse.json(
        { error: 'Web search is not configured' },
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
  } catch (error) {
    return handleApiError(error, 'GET /api/search/legal-precedents');
  }
}

