/**
 * Permission Check API Endpoint
 * Checks if current user has specific feature(s)
 */

import { NextResponse } from 'next/server';
import { checkFeature, checkAnyFeature, checkAllFeatures } from '@/lib/permissions/checkFeature';
import { Feature } from '@/lib/permissions/features';
import { successResponse } from '@/lib/utils/apiUtils';
import { secureRoute } from '@/lib/api/secureRoute';

/**
 * GET /api/permissions/check
 * Check if user has specific permission(s)
 */
export const GET = secureRoute.query({
  handler: async (request, { user }) => {
    const { searchParams } = new URL(request.url);
    const feature = searchParams.get('feature');
    const featuresParam = searchParams.get('features');
    const mode = searchParams.get('mode') || 'any';
    const serviceLine = searchParams.get('serviceLine') || undefined;

    // Single feature check
    if (feature) {
      const hasFeature = await checkFeature(user.id, feature as Feature, serviceLine);
      return NextResponse.json(successResponse({ hasFeature }));
    }

    // Multiple features check
    if (featuresParam) {
      const features = featuresParam.split(',').map(f => f.trim() as Feature);
      
      const hasFeature = mode === 'all'
        ? await checkAllFeatures(user.id, features, serviceLine)
        : await checkAnyFeature(user.id, features, serviceLine);

      return NextResponse.json(successResponse({ hasFeature }));
    }

    // No feature specified
    return NextResponse.json({ success: false, error: 'Missing feature or features parameter' }, { status: 400 });
  },
});
