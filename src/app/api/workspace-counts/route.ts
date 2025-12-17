import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { handleApiError } from '@/lib/utils/errorHandler';
import { successResponse } from '@/lib/utils/apiUtils';
import { getCurrentUser } from '@/lib/services/auth/auth';
import { cache, CACHE_PREFIXES } from '@/lib/services/cache/CacheService';
import { getServLineCodesBySubGroup } from '@/lib/utils/serviceLineExternal';

// TTL for workspace counts: 5 minutes (300 seconds)
const COUNTS_CACHE_TTL = 5 * 60;

interface WorkspaceCountsResponse {
  groups: number;
  clients: number;
  tasks: number;
  myTasks: number;
}

export async function GET(request: NextRequest) {
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

    // 3. Parse Query Parameters
    const { searchParams } = new URL(request.url);
    const serviceLine = searchParams.get('serviceLine') || '';
    const subServiceLineGroup = searchParams.get('subServiceLineGroup') || '';

    if (!serviceLine || !subServiceLineGroup) {
      return NextResponse.json(
        { error: 'serviceLine and subServiceLineGroup are required' },
        { status: 400 }
      );
    }

    // 4. Try Cache (not user-specific, so safe to cache)
    const cacheKey = `${CACHE_PREFIXES.ANALYTICS}counts:${serviceLine}:${subServiceLineGroup}`;
    const cached = await cache.get<WorkspaceCountsResponse>(cacheKey);
    if (cached) {
      return NextResponse.json(successResponse(cached));
    }

    // 5. Get ServLineCodes for this SubServiceLineGroup
    const servLineCodes = await getServLineCodesBySubGroup(subServiceLineGroup);
    
    // 6. Execute Parallel COUNT Queries
    const [groupsCount, clientsCount, tasksCount, myTasksCount] = await Promise.all([
      // Groups count - unique groups across all clients
      prisma.client.groupBy({
        by: ['groupCode'],
      }).then(r => r.length),
      
      // Clients count - all clients (no active filter to match list view)
      prisma.client.count(),
      
      // Tasks count - active tasks in this subServiceLineGroup
      prisma.task.count({
        where: {
          Active: 'Yes',
          ServLineCode: { in: servLineCodes },
        },
      }),
      
      // My Tasks count - tasks where user is a team member in this subServiceLineGroup
      prisma.taskTeam.count({
        where: {
          userId: user.id,
          Task: {
            Active: 'Yes',
            ServLineCode: { in: servLineCodes },
          },
        },
      }),
    ]);

    const responseData: WorkspaceCountsResponse = {
      groups: groupsCount,
      clients: clientsCount,
      tasks: tasksCount,
      myTasks: myTasksCount,
    };

    // 7. Cache the Response
    await cache.set(cacheKey, responseData, COUNTS_CACHE_TTL);

    return NextResponse.json(successResponse(responseData));
  } catch (error) {
    return handleApiError(error, 'Get Workspace Counts');
  }
}

