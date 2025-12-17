import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { handleApiError, AppError } from '@/lib/utils/errorHandler';
import { successResponse } from '@/lib/utils/apiUtils';
import { getCurrentUser } from '@/lib/services/auth/auth';
import { cache, CACHE_PREFIXES } from '@/lib/services/cache/CacheService';
import { performanceMonitor } from '@/lib/utils/performanceMonitor';

/**
 * GET /api/clients/filters
 * Fetch distinct filter option values for client filters
 * Returns industries and groups for filter dropdowns
 * 
 * Performance optimizations:
 * - Redis caching (30min TTL for relatively static data)
 * - No pagination (returns all distinct values)
 * - Optional search parameter for server-side filtering
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now();
  let cacheHit = false;
  
  try {
    // 1. Authenticate
    const user = await getCurrentUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Check Permission
    const { checkFeature } = await import('@/lib/permissions/checkFeature');
    const { Feature } = await import('@/lib/permissions/features');
    const { getUserSubServiceLineGroups } = await import('@/lib/services/service-lines/serviceLineService');
    
    const hasPagePermission = await checkFeature(user.id, Feature.ACCESS_CLIENTS);
    const userSubGroups = await getUserSubServiceLineGroups(user.id);
    const hasServiceLineAccess = userSubGroups.length > 0;
    
    // Grant access if user has either page permission OR service line assignment
    if (!hasPagePermission && !hasServiceLineAccess) {
      return NextResponse.json({ error: 'Forbidden - Insufficient permissions' }, { status: 403 });
    }

    // Parse query parameters - support separate searches for each filter
    const { searchParams } = new URL(request.url);
    const industrySearch = searchParams.get('industrySearch') || '';
    const groupSearch = searchParams.get('groupSearch') || '';

    // Enforce minimum search length (client-side should prevent this, but validate server-side)
    const industryTooShort = industrySearch.length > 0 && industrySearch.length < 2;
    const groupTooShort = groupSearch.length > 0 && groupSearch.length < 2;

    if (industryTooShort || groupTooShort) {
      return NextResponse.json(successResponse({
        industries: industryTooShort ? [] : undefined,
        groups: groupTooShort ? [] : undefined,
        metadata: {
          industries: industryTooShort ? { hasMore: false, total: 0, returned: 0 } : undefined,
          groups: groupTooShort ? { hasMore: false, total: 0, returned: 0 } : undefined,
        },
        message: 'Please enter at least 2 characters to search',
      }));
    }

    // Build cache key (no user ID - filters are same for all users)
    const cacheKey = `${CACHE_PREFIXES.ANALYTICS}client-filters:industry:${industrySearch}:group:${groupSearch}:limit:30`;
    
    // Try cache first (60min TTL since filter options are relatively static)
    const cached = await cache.get(cacheKey);
    if (cached) {
      cacheHit = true;
      performanceMonitor.trackApiCall('/api/clients/filters', startTime, true);
      return NextResponse.json(successResponse(cached));
    }

    // Build separate where clauses for industries and groups
    interface IndustryWhereClause {
      industry?: { contains: string; mode: 'insensitive' };
    }
    
    const industryWhere: IndustryWhereClause = {};
    const groupWhere: any = {};

    if (industrySearch) {
      industryWhere.industry = { contains: industrySearch, mode: 'insensitive' };
    }

    // Build group where clause - filter nulls in JavaScript instead of Prisma
    if (groupSearch) {
      groupWhere.OR = [
        { groupDesc: { contains: groupSearch, mode: 'insensitive' } },
        { groupCode: { contains: groupSearch, mode: 'insensitive' } },
      ];
    }

    // Reduced limit for faster response times (reduced from 50 to 30)
    const FILTER_LIMIT = 30;
    
    // Execute queries in parallel (removed total count queries for performance)
    const [
      industriesData, 
      groupsData,
    ] = await Promise.all([
      // Get distinct industries with independent search
      prisma.client.groupBy({
        by: ['industry'],
        where: {
          ...industryWhere,
          industry: { not: null }, // Exclude nulls for efficiency
        },
        orderBy: {
          industry: 'asc',
        },
        take: FILTER_LIMIT,
      }),
      
      // Get distinct groups with independent search - using groupBy for efficiency
      prisma.client.groupBy({
        by: ['groupCode', 'groupDesc'],
        where: groupWhere,
        orderBy: {
          groupDesc: 'asc',
        },
        take: FILTER_LIMIT,
      }),
    ]);

    // Format the response
    const industries = industriesData
      .map(item => item.industry)
      .filter((industry): industry is string => !!industry);

    // Filter out null values in JavaScript and format groups
    const groups = groupsData
      .filter(group => group.groupCode !== null && group.groupDesc !== null)
      .map(group => ({
        code: group.groupCode!,
        name: group.groupDesc!,
      }));

    const responseData = {
      industries,
      groups,
      metadata: {
        industries: {
          hasMore: industries.length >= FILTER_LIMIT,
          total: industries.length, // Approximate - actual total may be higher if hasMore is true
          returned: industries.length,
        },
        groups: {
          hasMore: groups.length >= FILTER_LIMIT,
          total: groups.length, // Approximate - actual total may be higher if hasMore is true
          returned: groups.length,
        },
      },
    };

    // Cache the response (60min TTL - increased from 30min)
    await cache.set(cacheKey, responseData, 3600);

    // Track performance
    performanceMonitor.trackApiCall('/api/clients/filters', startTime, cacheHit);

    return NextResponse.json(successResponse(responseData));
  } catch (error) {
    performanceMonitor.trackApiCall('/api/clients/filters [ERROR]', startTime, cacheHit);
    return handleApiError(error, 'Get Client Filters');
  }
}


