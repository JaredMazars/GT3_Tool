import { NextResponse } from 'next/server';
import { successResponse } from '@/lib/utils/apiUtils';
import { getEmployeeFilterOptions } from '@/lib/services/employees/employeeSearch';
import { secureRoute } from '@/lib/api/secureRoute';
import { cache, CACHE_PREFIXES } from '@/lib/services/cache/CacheService';

export const dynamic = 'force-dynamic';

// Cache TTL: 30 minutes (filter options change infrequently)
const FILTER_CACHE_TTL = 30 * 60;
const FILTER_CACHE_KEY = `${CACHE_PREFIXES.USER}employee-filter-options`;

/**
 * GET /api/users/search/filters
 * Get available filter options for employee search
 */
export const GET = secureRoute.query({
  handler: async (request, { user }) => {
    // Try to get from cache first
    const cached = await cache.get<{
      serviceLines: string[];
      jobGrades: string[];
      offices: string[];
    }>(FILTER_CACHE_KEY);
    
    if (cached) {
      return NextResponse.json(successResponse(cached));
    }
    
    // Fetch from database
    const filterOptions = await getEmployeeFilterOptions();
    
    // Cache for future requests
    await cache.set(FILTER_CACHE_KEY, filterOptions, FILTER_CACHE_TTL);
    
    return NextResponse.json(successResponse(filterOptions));
  },
});








