import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { successResponse } from '@/lib/utils/apiUtils';
import { secureRoute, Feature } from '@/lib/api/secureRoute';
import { z } from 'zod';

const CheckDuplicateSchema = z.object({
  servLineCode: z.string().min(1).max(50),
  year: z.number().int().min(2000).max(2100),
  stdTaskCode: z.string().min(1).max(10),
}).strict();

/**
 * POST /api/tasks/check-duplicate
 * Checks for existing tasks with similar task codes and calculates next increment
 */
export const POST = secureRoute.mutation({
  feature: Feature.MANAGE_TASKS,
  schema: CheckDuplicateSchema,
  handler: async (request, { user, data }) => {
    const servPrefix = data.servLineCode.substring(0, 3).toUpperCase();
    const yearSuffix = data.year.toString().slice(-2);
    const stdCode = data.stdTaskCode.substring(0, 3).toUpperCase();
    const basePattern = `${servPrefix}${yearSuffix}${stdCode}`;

    const taskCodesOnly = await prisma.task.findMany({
      where: { TaskCode: { startsWith: basePattern } },
      select: { TaskCode: true },
      orderBy: { TaskCode: 'desc' },
      take: 100, // Limit to prevent unbounded queries
    });

    let maxIncrement = 0;
    for (const task of taskCodesOnly) {
      const incrementStr = task.TaskCode.slice(-2);
      const increment = parseInt(incrementStr, 10);
      if (!isNaN(increment) && increment > maxIncrement) {
        maxIncrement = increment;
      }
    }

    const nextIncrement = maxIncrement + 1;
    const nextIncrementStr = nextIncrement.toString().padStart(2, '0');
    const nextTaskCode = `${basePattern}${nextIncrementStr}`;

    let existingTasksDetails: Array<{
      id: number;
      taskCode: string;
      taskDesc: string;
      taskYear: number | null;
      active: boolean;
      clientCode: string | null;
      clientName: string | null;
    }> = [];

    if (taskCodesOnly.length > 0) {
      const detailedTasks = await prisma.task.findMany({
        where: { TaskCode: { startsWith: basePattern } },
        select: {
          id: true,
          TaskCode: true,
          TaskDesc: true,
          taskYear: true,
          Active: true,
          Client: { select: { clientCode: true, clientNameFull: true } },
        },
        orderBy: { TaskCode: 'desc' },
        take: 100, // Limit to prevent unbounded queries
      });

      existingTasksDetails = detailedTasks.map(task => ({
        id: task.id,
        taskCode: task.TaskCode,
        taskDesc: task.TaskDesc,
        taskYear: task.taskYear,
        active: task.Active === 'Yes',
        clientCode: task.Client?.clientCode ?? null,
        clientName: task.Client?.clientNameFull ?? null,
      }));
    }

    return NextResponse.json(
      successResponse({
        exists: taskCodesOnly.length > 0,
        count: taskCodesOnly.length,
        nextIncrement: nextIncrementStr,
        nextTaskCode,
        basePattern,
        existingTasks: existingTasksDetails,
      })
    );
  },
});
