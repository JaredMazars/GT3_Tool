export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { successResponse } from '@/lib/utils/apiUtils';
import { cache, CACHE_PREFIXES } from '@/lib/services/cache/CacheService';
import { secureRoute, Feature } from '@/lib/api/secureRoute';

const STANDARD_TASKS_CACHE_TTL = 30 * 60;

interface StandardTaskCached {
  id: number;
  GSStdTaskID: string;
  StdTaskCode: string;
  StdTaskDesc: string;
  ServLineCode: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * GET /api/standard-tasks
 * Fetches standard tasks filtered by service line code
 */
export const GET = secureRoute.query({
  feature: Feature.MANAGE_TASKS,
  handler: async (request, { user }) => {
    const { searchParams } = new URL(request.url);
    const serviceLine = searchParams.get('serviceLine');

    if (!serviceLine) {
      return NextResponse.json({ success: false, error: 'serviceLine parameter is required' }, { status: 400 });
    }

    const cacheKey = `${CACHE_PREFIXES.SERVICE_LINE}standard-tasks:${serviceLine}`;
    const cached = await cache.get<StandardTaskCached[]>(cacheKey);
    if (cached) {
      return NextResponse.json(successResponse(cached));
    }

    const standardTasks = await prisma.standardTask.findMany({
      where: { ServLineCode: serviceLine },
      select: {
        id: true, GSStdTaskID: true, StdTaskCode: true, StdTaskDesc: true,
        ServLineCode: true, createdAt: true, updatedAt: true,
      },
      orderBy: { StdTaskCode: 'asc' },
    });

    await cache.set(cacheKey, standardTasks, STANDARD_TASKS_CACHE_TTL);

    return NextResponse.json(successResponse(standardTasks));
  },
});
