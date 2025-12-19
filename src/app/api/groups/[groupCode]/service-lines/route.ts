import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { handleApiError } from '@/lib/utils/errorHandler';
import { successResponse } from '@/lib/utils/apiUtils';
import { getCurrentUser } from '@/lib/services/auth/auth';
import { cache, CACHE_PREFIXES } from '@/lib/services/cache/CacheService';
import { checkFeature } from '@/lib/permissions/checkFeature';
import { Feature } from '@/lib/permissions/features';

/**
 * GET /api/groups/[groupCode]/service-lines
 * Get service line counts for tasks in a specific group
 * Used to populate service line tabs without fetching all tasks
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { groupCode: string } }
) {
  try {
    // 1. Authenticate
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Check Permission
    const hasPermission = await checkFeature(user.id, Feature.ACCESS_CLIENTS);
    if (!hasPermission) {
      return NextResponse.json({ error: 'Forbidden - Insufficient permissions' }, { status: 403 });
    }

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
      return NextResponse.json(
        { error: 'Group not found' },
        { status: 404 }
      );
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
  } catch (error) {
    return handleApiError(error, 'Get Group Service Lines');
  }
}

