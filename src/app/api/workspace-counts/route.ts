export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { successResponse } from '@/lib/utils/apiUtils';
import { cache, CACHE_PREFIXES } from '@/lib/services/cache/CacheService';
import { getServLineCodesBySubGroup } from '@/lib/utils/serviceLineExternal';
import { checkFeature } from '@/lib/permissions/checkFeature';
import { Feature } from '@/lib/permissions/features';
import { getUserSubServiceLineGroups } from '@/lib/services/service-lines/serviceLineService';
import { secureRoute } from '@/lib/api/secureRoute';

const COUNTS_CACHE_TTL = 30 * 60;

interface WorkspaceCountsResponse {
  groups: number;
  clients: number;
  tasks: number;
  myTasks: number;
}

/**
 * GET /api/workspace-counts
 * Get workspace counts for dashboard
 */
export const GET = secureRoute.query({
  handler: async (request, { user }) => {
    const hasPagePermission = await checkFeature(user.id, Feature.ACCESS_CLIENTS);
    const userSubGroups = await getUserSubServiceLineGroups(user.id);
    const hasServiceLineAccess = userSubGroups.length > 0;
    
    if (!hasPagePermission && !hasServiceLineAccess) {
      return NextResponse.json({ success: false, error: 'Forbidden - Insufficient permissions' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const serviceLine = searchParams.get('serviceLine') || '';
    const subServiceLineGroup = searchParams.get('subServiceLineGroup') || '';

    if (!serviceLine || !subServiceLineGroup) {
      return NextResponse.json({ success: false, error: 'serviceLine and subServiceLineGroup are required' }, { status: 400 });
    }

    // Cache key includes user ID to ensure counts are user-specific (partner/manager tasks)
    const cacheKey = `${CACHE_PREFIXES.ANALYTICS}counts:${serviceLine}:${subServiceLineGroup}:${user.id}`;
    const cached = await cache.get<WorkspaceCountsResponse>(cacheKey);
    if (cached) {
      return NextResponse.json(successResponse(cached));
    }

    const servLineCodes = await getServLineCodesBySubGroup(subServiceLineGroup);
    
    // Get user's employee code(s) to check for partner/manager tasks
    const userEmail = user.email.toLowerCase();
    const emailPrefix = userEmail.split('@')[0];
    
    const userEmployees = await prisma.employee.findMany({
      where: {
        OR: [
          { WinLogon: { equals: userEmail } },
          { WinLogon: { startsWith: `${emailPrefix}@` } },
        ],
      },
      select: { EmpCode: true },
    });
    
    const empCodes = userEmployees.map(e => e.EmpCode);
    
    const [groupsCount, clientsCount, tasksCount, myTasksCount] = await Promise.all([
      prisma.client.groupBy({ by: ['groupCode'] }).then(r => r.length),
      prisma.client.count(),
      prisma.task.count({ where: { Active: 'Yes', ServLineCode: { in: servLineCodes } } }),
      // Count tasks where user is team member, partner, or manager
      prisma.task.count({
        where: {
          Active: 'Yes',
          ServLineCode: { in: servLineCodes },
          OR: [
            { TaskTeam: { some: { userId: user.id } } },
            ...(empCodes.length > 0 ? [
              { TaskPartner: { in: empCodes } },
              { TaskManager: { in: empCodes } },
            ] : []),
          ],
        },
      }),
    ]);

    const responseData: WorkspaceCountsResponse = {
      groups: groupsCount,
      clients: clientsCount,
      tasks: tasksCount,
      myTasks: myTasksCount,
    };

    await cache.set(cacheKey, responseData, COUNTS_CACHE_TTL);

    return NextResponse.json(successResponse(responseData));
  },
});
