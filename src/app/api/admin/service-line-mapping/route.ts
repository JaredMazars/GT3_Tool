export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { successResponse } from '@/lib/utils/apiUtils';
import { secureRoute, Feature } from '@/lib/api/secureRoute';
import { getAllExternalServiceLines } from '@/lib/utils/serviceLineExternal';
import { getAllServiceLines } from '@/lib/utils/serviceLine';
import { prisma } from '@/lib/db/prisma';

/**
 * GET /api/admin/service-line-mapping
 * Get all external service lines with their master service line mappings
 */
export const GET = secureRoute.query({
  feature: Feature.MANAGE_SERVICE_LINES,
  handler: async (request, { user }) => {
    const externalServiceLines = await getAllExternalServiceLines();
    const masterServiceLines = await getAllServiceLines();

    // Get all unique ServLineCodes for task count query
    const allServLineCodes = Array.from(
      new Set(
        externalServiceLines
          .map((e) => e.ServLineCode)
          .filter((code): code is string => code !== null)
      )
    );

    // Fetch task counts in a single aggregated query (active tasks only)
    const taskCounts = allServLineCodes.length > 0
      ? await prisma.task.groupBy({
          by: ['ServLineCode'],
          where: {
            ServLineCode: { in: allServLineCodes },
            Active: 'Yes',
          },
          _count: true,
        })
      : [];

    // Create a map of ServLineCode -> task count
    const taskCountMap = new Map<string, number>(
      taskCounts.map((item) => [item.ServLineCode, item._count])
    );

    const enrichedData = externalServiceLines.map((external) => {
      const master = external.masterCode
        ? masterServiceLines.find((m) => m.code === external.masterCode)
        : null;

      return {
        ...external,
        masterServiceLine: master || null,
        taskCount: external.ServLineCode
          ? taskCountMap.get(external.ServLineCode) || 0
          : 0,
      };
    });

    return NextResponse.json(
      successResponse({
        externalServiceLines: enrichedData,
        masterServiceLines,
      })
    );
  },
});
