import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { AppError, ErrorCodes } from '@/lib/utils/errorHandler';
import { successResponse } from '@/lib/utils/apiUtils';
import { cache, CACHE_PREFIXES } from '@/lib/services/cache/CacheService';
import { secureRoute, Feature } from '@/lib/api/secureRoute';

/**
 * GET /api/groups/[groupCode]/service-lines
 * Get service line counts for tasks in a specific group
 * Used to populate service line tabs without fetching all tasks
 */
export const GET = secureRoute.queryWithParams<{ groupCode: string }>({
  feature: Feature.ACCESS_CLIENTS,
  handler: async (request, { user, params }) => {
    const { groupCode } = params;

    // Try cache first
    const cacheKey = `${CACHE_PREFIXES.CLIENT}:groups:${groupCode}:service-lines`;
    const cached = await cache.get<{ serviceLines: Array<{ code: string; name: string; taskCount: number }> }>(cacheKey);
    if (cached) {
      return NextResponse.json(successResponse(cached));
    }

    // First, verify the group exists
    const groupInfo = await prisma.client.findFirst({
      where: { groupCode },
      select: {
        groupCode: true,
        groupDesc: true,
      },
    });

    if (!groupInfo) {
      throw new AppError(404, 'Group not found', ErrorCodes.NOT_FOUND);
    }

    // Get task counts grouped by ServLineCode for this group (organization-wide)
    const taskCounts = await prisma.task.groupBy({
      by: ['ServLineCode'],
      where: {
        Client: {
          groupCode,
        },
      },
      _count: {
        id: true,
      },
    });

    // Get service line external data to map to master codes
    const servLineCodes = taskCounts.map(tc => tc.ServLineCode);
    const serviceLineExternals = await prisma.serviceLineExternal.findMany({
      where: {
        ServLineCode: {
          in: servLineCodes,
        },
      },
      select: {
        ServLineCode: true,
        masterCode: true,
      },
      take: 1000,
    });

    // Get unique master codes
    const uniqueMasterCodes = [...new Set(serviceLineExternals.map(sle => sle.masterCode).filter(Boolean))];
    
    // Query ServiceLineMaster separately
    const serviceLineMasters = await prisma.serviceLineMaster.findMany({
      where: {
        code: {
          in: uniqueMasterCodes as string[],
        },
      },
      select: {
        code: true,
        name: true,
      },
      take: 100,
    });

    // Create a map of master codes to names
    const masterCodeToNameMap = new Map(serviceLineMasters.map(m => [m.code, m.name]));

    // Build a map from ServLineCode to master code
    const servLineToMasterMap = new Map<string, { masterCode: string; masterName: string }>();
    serviceLineExternals.forEach(sle => {
      if (sle.ServLineCode && sle.masterCode) {
        servLineToMasterMap.set(sle.ServLineCode, {
          masterCode: sle.masterCode,
          masterName: masterCodeToNameMap.get(sle.masterCode) || sle.masterCode,
        });
      }
    });

    // Aggregate counts by master service line
    const masterServiceLineCounts = new Map<string, { code: string; name: string; taskCount: number }>();
    taskCounts.forEach(tc => {
      const masterInfo = servLineToMasterMap.get(tc.ServLineCode);
      if (masterInfo) {
        const existing = masterServiceLineCounts.get(masterInfo.masterCode);
        if (existing) {
          existing.taskCount += tc._count.id;
        } else {
          masterServiceLineCounts.set(masterInfo.masterCode, {
            code: masterInfo.masterCode,
            name: masterInfo.masterName,
            taskCount: tc._count.id,
          });
        }
      }
    });

    // Convert to array and sort by task count descending
    const serviceLines = Array.from(masterServiceLineCounts.values()).sort(
      (a, b) => b.taskCount - a.taskCount
    );

    const responseData = {
      serviceLines,
    };

    // Cache for 10 minutes
    await cache.set(cacheKey, responseData, 10 * 60);

    return NextResponse.json(successResponse(responseData));
  },
});

