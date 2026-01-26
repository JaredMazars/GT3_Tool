import { NextResponse } from 'next/server';
import { performanceMonitor } from '@/lib/utils/performanceMonitor';
import { successResponse } from '@/lib/utils/apiUtils';
import { secureRoute, Feature } from '@/lib/api/secureRoute';

/**
 * GET /api/performance
 * Get performance metrics and statistics
 * Requires admin access
 */
export const GET = secureRoute.query({
  feature: Feature.ACCESS_ADMIN,
  handler: async (request, { user }) => {
    const { searchParams } = new URL(request.url);
    const endpoint = searchParams.get('endpoint');

    let data;

    if (endpoint) {
      data = performanceMonitor.getEndpointStats(endpoint);
      if (!data) {
        return NextResponse.json(
          { success: false, error: `No metrics found for endpoint: ${endpoint}` },
          { status: 404 }
        );
      }
    } else {
      const summary = performanceMonitor.getSummary();
      const slowQueries = performanceMonitor.getSlowQueries();

      data = {
        summary,
        slowQueries: slowQueries.slice(0, 20),
        endpoints: [
          performanceMonitor.getEndpointStats('/api/tasks'),
          performanceMonitor.getEndpointStats('/api/tasks/filters'),
          performanceMonitor.getEndpointStats('/api/clients'),
        ].filter(Boolean),
      };
    }

    return NextResponse.json(successResponse(data));
  },
});

/**
 * DELETE /api/performance
 * Clear all performance metrics
 * Requires admin access
 */
export const DELETE = secureRoute.mutation({
  feature: Feature.ACCESS_ADMIN,
  handler: async (request, { user }) => {
    performanceMonitor.clear();

    return NextResponse.json(successResponse({ message: 'Performance metrics cleared successfully' }));
  },
});
























