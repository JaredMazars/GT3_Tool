/**
 * Admin API: Service Lines
 * GET - List all active service lines from master
 */

export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { secureRoute, Feature } from '@/lib/api/secureRoute';
import { getActiveServiceLines } from '@/lib/utils/serviceLine';
import { successResponse } from '@/lib/utils/apiUtils';

/**
 * GET /api/admin/service-lines
 * List all active service lines
 */
export const GET = secureRoute.query({
  feature: Feature.MANAGE_TOOLS,
  handler: async (request, { user }) => {
    const serviceLines = await getActiveServiceLines();
    
    return NextResponse.json(successResponse(serviceLines));
  },
});


