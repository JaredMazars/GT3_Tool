/**
 * Database Connection Test API
 * GET /api/admin/database/connection - Test database connection speed
 */

export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { secureRoute, Feature } from '@/lib/api/secureRoute';
import { successResponse } from '@/lib/utils/apiUtils';
import { testConnection } from '@/lib/services/admin/databaseService';

/**
 * GET /api/admin/database/connection
 * Test database connection and measure response time
 */
export const GET = secureRoute.query({
  feature: Feature.MANAGE_DATABASE,
  handler: async (request, { user }) => {
    const result = await testConnection();

    return NextResponse.json(successResponse(result));
  },
});
