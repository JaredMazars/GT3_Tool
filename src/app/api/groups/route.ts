import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { handleApiError } from '@/lib/utils/errorHandler';
import { successResponse } from '@/lib/utils/apiUtils';
import { getCurrentUser } from '@/lib/services/auth/auth';
import { getCachedList, setCachedList } from '@/lib/services/cache/listCache';
import { getUserServiceLines } from '@/lib/services/service-lines/serviceLineService';
import { getExternalServiceLinesByMaster } from '@/lib/utils/serviceLineExternal';

export async function GET(request: NextRequest) {
  try {
    // 1. Authenticate
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Check Permission
    const { checkUserPermission } = await import('@/lib/services/permissions/permissionService');
    const hasPermission = await checkUserPermission(user.id, 'clients', 'READ');
    if (!hasPermission) {
      return NextResponse.json({ error: 'Forbidden - Insufficient permissions' }, { status: 403 });
    }

    // 3. Get user's accessible service lines
    const userServiceLines = await getUserServiceLines(user.id);
    const accessibleMasterCodes = userServiceLines.map(sl => sl.serviceLine);

    // Map master codes to actual ServLineCodes from ServiceLineExternal
    const servLineCodesPromises = accessibleMasterCodes.map(masterCode =>
      getExternalServiceLinesByMaster(masterCode)
    );
    const servLineCodesArrays = await Promise.all(servLineCodesPromises);
    
    // Flatten and extract ServLineCodes
    const accessibleServLineCodes = Array.from(
      new Set(
        servLineCodesArrays
          .flat()
          .map(sl => sl.ServLineCode)
          .filter((code): code is string => code !== null)
      )
    );

    // If user has no accessible ServLineCodes, return empty
    if (accessibleServLineCodes.length === 0) {
      return NextResponse.json(
        successResponse({
          groups: [],
          pagination: {
            page: 1,
            limit: 50,
            total: 0,
            totalPages: 0,
          },
        })
      );
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const page = Number.parseInt(searchParams.get('page') || '1');
    const limit = Math.min(Number.parseInt(searchParams.get('limit') || '50'), 100);
    const skip = (page - 1) * limit;

    // Try to get cached data
    const cacheParams = {
      endpoint: 'groups' as const,
      page,
      limit,
      search,
    };
    
    const cached = await getCachedList(cacheParams);
    if (cached) {
      return NextResponse.json(successResponse(cached));
    }

    // Build where clause for search and service line filtering
    interface WhereClause {
      OR?: Array<Record<string, { contains: string }>>;
      Task?: {
        some: {
          ServLineCode: {
            in: string[];
          };
        };
      };
    }
    
    const where: WhereClause = {
      // Filter to only groups that have tasks in accessible service lines
      Task: {
        some: {
          ServLineCode: { in: accessibleServLineCodes },
        },
      },
    };

    if (search) {
      where.OR = [
        { groupDesc: { contains: search } },
        { groupCode: { contains: search } },
      ];
    }

    // Execute count and data queries in parallel for better performance
    const [totalGroups, allGroupsData] = await Promise.all([
      // Fast count of unique groups
      prisma.client.groupBy({
        by: ['groupCode'],
        where,
      }).then(r => r.length),
      
      // Get all groups with counts, then paginate in-memory
      // (groupBy with aggregation doesn't support skip/take)
      prisma.client.groupBy({
        by: ['groupCode', 'groupDesc'],
        where,
        _count: {
          id: true,
        },
        orderBy: {
          groupDesc: 'asc',
        },
      }),
    ]);
    
    // Apply pagination to the grouped results
    const groupsData = allGroupsData.slice(skip, skip + limit);

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

    // Cache the response
    await setCachedList(cacheParams, responseData);

    return NextResponse.json(successResponse(responseData));
  } catch (error) {
    return handleApiError(error, 'Get Client Groups');
  }
}

