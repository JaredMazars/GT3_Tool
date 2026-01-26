export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { successResponse } from '@/lib/utils/apiUtils';
import { getApplicableTemplates } from '@/lib/services/templates/templateService';
import { secureRoute } from '@/lib/api/secureRoute';

/**
 * GET /api/templates/available
 * Get templates applicable to a service line
 */
export const GET = secureRoute.query({
  handler: async (request, { user }) => {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'ENGAGEMENT_LETTER';
    const serviceLine = searchParams.get('serviceLine') || undefined;

    const templates = await getApplicableTemplates(type, serviceLine);

    return NextResponse.json(successResponse(templates));
  },
});
