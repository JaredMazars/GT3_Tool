/**
 * Permission Check API Endpoint
 * Checks if current user has specific feature(s)
 */

export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { checkFeature, checkAnyFeature, checkAllFeatures } from '@/lib/permissions/checkFeature';
import { Feature } from '@/lib/permissions/features';
import { successResponse } from '@/lib/utils/apiUtils';
import { secureRoute } from '@/lib/api/secureRoute';

/**
 * GET /api/permissions/check
 * Check if user has specific permission(s)
 * 
 * Cache-Control headers:
 * - private: Response is user-specific
 * - max-age=60: Browser can cache for 60 seconds
 * - stale-while-revalidate=300: Can serve stale for 5 minutes while revalidating
 */
export const GET = secureRoute.query({
  handler: async (request, { user }) => {
    const { searchParams } = new URL(request.url);
    const feature = searchParams.get('feature');
    const featuresParam = searchParams.get('features');
    const mode = searchParams.get('mode') || 'any';
    const serviceLine = searchParams.get('serviceLine') || undefined;

    let response: NextResponse;

    // Single feature check
    if (feature) {
      const hasFeature = await checkFeature(user.id, feature as Feature, serviceLine);
      response = NextResponse.json(successResponse({ hasFeature }));
    }
    // Multiple features check
    else if (featuresParam) {
      const features = featuresParam.split(',').map(f => f.trim() as Feature);
      
      const hasFeature = mode === 'all'
        ? await checkAllFeatures(user.id, features, serviceLine)
        : await checkAnyFeature(user.id, features, serviceLine);

      response = NextResponse.json(successResponse({ hasFeature }));
    }
    // No feature specified
    else {
      response = NextResponse.json({ success: false, error: 'Missing feature or features parameter' }, { status: 400 });
    }

    // Add cache headers for successful responses
    // NOTE: Using no-cache instead of aggressive caching to prevent permission
    // leakage when users switch accounts in the same browser session.
    // The React Query cache (client-side) handles performance optimization.
    if (response.status === 200) {
      response.headers.set(
        'Cache-Control',
        'private, no-cache, must-revalidate'
      );
      response.headers.set('Vary', 'Cookie');
    }

    return response;
  },
});
