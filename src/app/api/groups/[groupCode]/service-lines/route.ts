import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { handleApiError } from '@/lib/utils/errorHandler';
import { successResponse } from '@/lib/utils/apiUtils';
import { getCurrentUser } from '@/lib/services/auth/auth';
import { getUserServiceLines } from '@/lib/services/service-lines/serviceLineService';
import { getExternalServiceLinesByMaster } from '@/lib/utils/serviceLineExternal';
import { cache, CACHE_PREFIXES } from '@/lib/services/cache/CacheService';

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
          serviceLines: [],
        })
      );
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

    // Get task counts grouped by ServLineCode for this group
    const taskCounts = await prisma.task.groupBy({
      by: ['ServLineCode'],
      where: {
        Client: {
          groupCode,
        },
        ServLineCode: {
          in: accessibleServLineCodes,
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
        ServiceLineMaster: {
          select: {
            code: true,
            name: true,
          },
        },
      },
    });

    // Build a map from ServLineCode to master code
    const servLineToMasterMap = new Map<string, { masterCode: string; masterName: string }>();
    serviceLineExternals.forEach(sle => {
      if (sle.ServLineCode && sle.masterCode && sle.ServiceLineMaster) {
        servLineToMasterMap.set(sle.ServLineCode, {
          masterCode: sle.masterCode,
          masterName: sle.ServiceLineMaster.name,
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

