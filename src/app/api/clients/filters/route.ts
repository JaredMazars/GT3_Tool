import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db/prisma';
import { successResponse } from '@/lib/utils/apiUtils';
import { cache, CACHE_PREFIXES } from '@/lib/services/cache/CacheService';
import { performanceMonitor } from '@/lib/utils/performanceMonitor';
import { checkFeature } from '@/lib/permissions/checkFeature';
import { Feature } from '@/lib/permissions/features';
import { getUserSubServiceLineGroups } from '@/lib/services/service-lines/serviceLineService';
import { secureRoute } from '@/lib/api/secureRoute';
import { AppError, ErrorCodes } from '@/lib/utils/errorHandler';

// Zod schema for query params validation
const ClientFiltersQuerySchema = z.object({
  industrySearch: z.string().max(100).optional().default(''),
  groupSearch: z.string().max(100).optional().default(''),
}).strict();

/**
 * GET /api/clients/filters
 * Fetch distinct filter option values for client filters
 */
export const GET = secureRoute.query({
  handler: async (request, { user }) => {
    const startTime = Date.now();
    let cacheHit = false;

    // Check Permission
    const hasPagePermission = await checkFeature(user.id, Feature.ACCESS_CLIENTS);
    const userSubGroups = await getUserSubServiceLineGroups(user.id);
    const hasServiceLineAccess = userSubGroups.length > 0;
    
    if (!hasPagePermission && !hasServiceLineAccess) {
      throw new AppError(403, 'Forbidden - Insufficient permissions', ErrorCodes.FORBIDDEN);
    }

    const { searchParams } = new URL(request.url);
    
    // Validate query params
    const queryResult = ClientFiltersQuerySchema.safeParse({
      industrySearch: searchParams.get('industrySearch') || undefined,
      groupSearch: searchParams.get('groupSearch') || undefined,
    });
    
    if (!queryResult.success) {
      throw new AppError(400, 'Invalid query parameters', ErrorCodes.VALIDATION_ERROR, { errors: queryResult.error.flatten() });
    }
    
    const { industrySearch, groupSearch } = queryResult.data;

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

    const cacheKey = `${CACHE_PREFIXES.ANALYTICS}client-filters:industry:${industrySearch}:group:${groupSearch}:limit:30`;
    
    const cached = await cache.get(cacheKey);
    if (cached) {
      cacheHit = true;
      performanceMonitor.trackApiCall('/api/clients/filters', startTime, true);
      return NextResponse.json(successResponse(cached));
    }

    interface IndustryWhereClause {
      industry?: { contains: string; mode: 'insensitive' };
    }
    
    const industryWhere: IndustryWhereClause = {};
    const groupWhere: Record<string, unknown> = {};

    if (industrySearch) {
      industryWhere.industry = { contains: industrySearch, mode: 'insensitive' };
    }

    if (groupSearch) {
      groupWhere.OR = [
        { groupDesc: { contains: groupSearch, mode: 'insensitive' } },
        { groupCode: { contains: groupSearch, mode: 'insensitive' } },
      ];
    }

    const FILTER_LIMIT = 30;
    
    const [industriesData, groupsData] = await Promise.all([
      prisma.client.groupBy({
        by: ['industry'],
        where: { ...industryWhere, industry: { not: null } },
        orderBy: { industry: 'asc' },
        take: FILTER_LIMIT,
      }),
      prisma.client.groupBy({
        by: ['groupCode', 'groupDesc'],
        where: groupWhere,
        orderBy: { groupDesc: 'asc' },
        take: FILTER_LIMIT,
      }),
    ]);

    const industries = industriesData
      .map(item => item.industry)
      .filter((industry): industry is string => !!industry);

    const groups = groupsData
      .filter(group => group.groupCode !== null && group.groupDesc !== null)
      .map(group => ({ code: group.groupCode!, name: group.groupDesc! }));

    const responseData = {
      industries,
      groups,
      metadata: {
        industries: { hasMore: industries.length >= FILTER_LIMIT, total: industries.length, returned: industries.length },
        groups: { hasMore: groups.length >= FILTER_LIMIT, total: groups.length, returned: groups.length },
      },
    };

    await cache.set(cacheKey, responseData, 3600);
    performanceMonitor.trackApiCall('/api/clients/filters', startTime, cacheHit);

    return NextResponse.json(successResponse(responseData));
  },
});
