import { NextRequest, NextResponse } from 'next/server';
import { performanceMonitor } from '@/lib/utils/performanceMonitor';
import { getCurrentUser } from '@/lib/services/auth/auth';
import { successResponse } from '@/lib/utils/apiUtils';

/**
 * GET /api/performance
 * Get performance metrics and statistics
 * Requires authentication and system admin role
 */
export async function GET(request: NextRequest) {
  try {
    // Require authentication
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is system admin (only admins can view performance metrics)
    const { isSystemAdmin } = await import('@/lib/services/auth/authorization');
    const isAdmin = await isSystemAdmin(user.id);
    
    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden - Requires system admin access' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const endpoint = searchParams.get('endpoint');
    
    let data;
    
    if (endpoint) {
      // Get stats for specific endpoint
      data = performanceMonitor.getEndpointStats(endpoint);
      if (!data) {
        return NextResponse.json({ 
          error: `No metrics found for endpoint: ${endpoint}` 
        }, { status: 404 });
      }
    } else {
      // Get summary and slow queries
      const summary = performanceMonitor.getSummary();
      const slowQueries = performanceMonitor.getSlowQueries();
      
      data = {
        summary,
        slowQueries: slowQueries.slice(0, 20), // Top 20 slowest
        endpoints: [
          performanceMonitor.getEndpointStats('/api/tasks'),
          performanceMonitor.getEndpointStats('/api/tasks/filters'),
          performanceMonitor.getEndpointStats('/api/clients'),
        ].filter(Boolean),
      };
    }

    return NextResponse.json(successResponse(data));
  } catch (error) {
    console.error('[Performance API] Error:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch performance metrics',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

/**
 * DELETE /api/performance
 * Clear all performance metrics
 * Requires authentication and system admin role
 */
export async function DELETE(request: NextRequest) {
  try {
    // Require authentication
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is system admin
    const { isSystemAdmin } = await import('@/lib/services/auth/authorization');
    const isAdmin = await isSystemAdmin(user.id);
    
    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden - Requires system admin access' }, { status: 403 });
    }

    performanceMonitor.clear();
    
    return NextResponse.json(successResponse({ 
      message: 'Performance metrics cleared successfully' 
    }));
  } catch (error) {
    console.error('[Performance API] Error:', error);
    return NextResponse.json({ 
      error: 'Failed to clear performance metrics',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
