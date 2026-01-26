export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { successResponse } from '@/lib/utils/apiUtils';
import { getCachedList, setCachedList } from '@/lib/services/cache/listCache';
import { secureRoute, Feature } from '@/lib/api/secureRoute';

/**
 * GET /api/groups
 * List client groups with pagination
 */
export const GET = secureRoute.query({
  feature: Feature.ACCESS_CLIENTS,
  handler: async (request, { user }) => {

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const page = Number.parseInt(searchParams.get('page') || '1');
    const limit = Math.min(Number.parseInt(searchParams.get('limit') || '50'), 100);
    const groupCodes = searchParams.getAll('groupCodes[]');
    const skip = (page - 1) * limit;

    const hasFilters = groupCodes.length > 0;
    
    const cacheParams = { endpoint: 'groups' as const, page, limit, search };
    
    if (!hasFilters) {
      const cached = await getCachedList(cacheParams);
      if (cached) {
        return NextResponse.json(successResponse(cached));
      }
    }

    interface WhereClause {
      OR?: Array<Record<string, { contains: string }>>;
      groupCode?: { in: string[] };
    }
    
    const where: WhereClause = {};

    if (groupCodes.length > 0) {
      where.groupCode = { in: groupCodes };
    }

    if (search) {
      where.OR = [
        { groupDesc: { contains: search } },
        { groupCode: { contains: search } },
      ];
    }

    const totalGroups = await prisma.client.groupBy({
      by: ['groupCode'],
      where,
    }).then(r => r.length);
    
    const paginatedGroups = await prisma.client.findMany({
      where,
      select: { groupCode: true, groupDesc: true },
      distinct: ['groupCode'],
      orderBy: [{ groupDesc: 'asc' }, { groupCode: 'asc' }],
      skip,
      take: limit,
    });
    
    if (paginatedGroups.length === 0) {
      return NextResponse.json(successResponse({
        groups: [],
        pagination: { page, limit, total: totalGroups, totalPages: Math.ceil(totalGroups / limit) },
      }));
    }
    
    const paginatedGroupCodes = paginatedGroups.map(g => g.groupCode);
    const counts = await prisma.client.groupBy({
      by: ['groupCode'],
      where: { groupCode: { in: paginatedGroupCodes } },
      _count: { id: true },
    });
    
    const countMap = new Map(counts.map(c => [c.groupCode, c._count.id]));
    
    const groups = paginatedGroups.map(group => ({
      groupCode: group.groupCode,
      groupDesc: group.groupDesc,
      clientCount: countMap.get(group.groupCode) || 0,
    }));

    const responseData = {
      groups,
      pagination: { page, limit, total: totalGroups, totalPages: Math.ceil(totalGroups / limit) },
    };

    if (!hasFilters) {
      await setCachedList(cacheParams, responseData);
    }

    return NextResponse.json(successResponse(responseData));
  },
});
