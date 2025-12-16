import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { handleApiError } from '@/lib/utils/errorHandler';
import { successResponse } from '@/lib/utils/apiUtils';
import { getCurrentUser } from '@/lib/services/auth/auth';
import { getCachedList, setCachedList } from '@/lib/services/cache/listCache';

export async function GET(request: NextRequest) {
  try {
    // 1. Authenticate
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Check Permission
    // Users with service line assignments automatically have client/group read access
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

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const page = Number.parseInt(searchParams.get('page') || '1');
    const limit = Math.min(Number.parseInt(searchParams.get('limit') || '50'), 100);
    const groupCodes = searchParams.getAll('groupCodes[]'); // Array of group codes to filter by
    const skip = (page - 1) * limit;

    // Skip cache when filters are applied (too many filter combinations to cache)
    const hasFilters = groupCodes.length > 0;
    
    // Try to get cached data
    const cacheParams = {
      endpoint: 'groups' as const,
      page,
      limit,
      search,
    };
    
    if (!hasFilters) {
      const cached = await getCachedList(cacheParams);
      if (cached) {
        return NextResponse.json(successResponse(cached));
      }
    }

    // Build where clause for search - show ALL groups organization-wide
    interface WhereClause {
      OR?: Array<Record<string, { contains: string }>>;
      groupCode?: { in: string[] };
    }
    
    const where: WhereClause = {};

    // Apply groupCodes filter
    if (groupCodes.length > 0) {
      where.groupCode = { in: groupCodes };
    }

    if (search) {
      where.OR = [
        { groupDesc: { contains: search } },
        { groupCode: { contains: search } },
      ];
    }

    // Optimized pagination: First get paginated group codes, then get counts
    // This avoids loading all groups into memory
    
    // Step 1: Get total count of unique groups
    const totalGroups = await prisma.client.groupBy({
      by: ['groupCode'],
      where,
    }).then(r => r.length);
    
    // Step 2: Get paginated list of group codes with descriptions
    const paginatedGroups = await prisma.client.findMany({
      where,
      select: {
        groupCode: true,
        groupDesc: true,
      },
      distinct: ['groupCode'],
      orderBy: {
        groupDesc: 'asc',
      },
      skip,
      take: limit,
    });
    
    // Step 3: Get counts for only the paginated groups (much more efficient)
    const paginatedGroupCodes = paginatedGroups.map(g => g.groupCode);
    const counts = await prisma.client.groupBy({
      by: ['groupCode'],
      where: {
        groupCode: { in: paginatedGroupCodes },
      },
      _count: {
        id: true,
      },
    });
    
    // Create a map of counts for quick lookup
    const countMap = new Map(counts.map(c => [c.groupCode, c._count.id]));
    
    // Combine the data
    const groupsData = paginatedGroups.map(group => ({
      groupCode: group.groupCode,
      groupDesc: group.groupDesc,
      _count: {
        id: countMap.get(group.groupCode) || 0,
      },
    }));

    // Format the response
    const groups = groupsData.map((group) => ({
      groupCode: group.groupCode,
      groupDesc: group.groupDesc,
      clientCount: group._count.id,
    }));

    const responseData = {
      groups,
      pagination: {
        page,
        limit,
        total: totalGroups,
        totalPages: Math.ceil(totalGroups / limit),
      },
    };

    // Cache the response (only if no filters applied)
    if (!hasFilters) {
      await setCachedList(cacheParams, responseData);
    }

    return NextResponse.json(successResponse(responseData));
  } catch (error) {
    return handleApiError(error, 'Get Client Groups');
  }
}

