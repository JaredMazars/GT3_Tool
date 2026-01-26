import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { determineSectionAndSubsection } from '@/lib/tools/tax-opinion/services/sectionMapper';
import { successResponse, parseTaskId } from '@/lib/utils/apiUtils';
import { secureRoute, Feature } from '@/lib/api/secureRoute';
import { z } from 'zod';
import { logger } from '@/lib/utils/logger';

// Maximum mapped accounts to return per request
const MAX_MAPPED_ACCOUNTS = 1000;

// Zod schema for creating a mapped account
const createMappedAccountSchema = z.object({
  accountCode: z.string().min(1).max(50),
  accountName: z.string().min(1).max(255),
  balance: z.number(),
  priorYearBalance: z.number().default(0),
  sarsItem: z.string().min(1).max(100),
  section: z.string().max(100).optional(),
  subsection: z.string().max(100).optional(),
}).strict();

/**
 * GET /api/tasks/[id]/mapped-accounts
 * List all mapped accounts for a task
 */
export const GET = secureRoute.queryWithParams({
  feature: Feature.ACCESS_TASKS,
  taskIdParam: 'id',
  taskRole: 'VIEWER',
  handler: async (request, { user, params }) => {
    const taskId = parseTaskId(params.id);

    const mappedAccounts = await prisma.mappedAccount.findMany({
      where: {
        taskId,
      },
      select: {
        id: true,
        accountCode: true,
        accountName: true,
        section: true,
        subsection: true,
        balance: true,
        priorYearBalance: true,
        sarsItem: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: [
        { section: 'asc' },
        { subsection: 'asc' },
        { accountCode: 'asc' },
      ],
      take: MAX_MAPPED_ACCOUNTS,
    });

    logger.info('Listed mapped accounts', {
      userId: user.id,
      taskId,
      count: mappedAccounts.length,
    });

    return NextResponse.json(successResponse(mappedAccounts), {
      headers: {
        'Cache-Control': 'no-store',
      },
    });
  },
});

/**
 * POST /api/tasks/[id]/mapped-accounts
 * Create a new mapped account for a task
 */
export const POST = secureRoute.mutationWithParams({
  feature: Feature.MANAGE_TASKS,
  taskIdParam: 'id',
  taskRole: 'EDITOR',
  schema: createMappedAccountSchema,
  handler: async (request, { user, params, data }) => {
    const taskId = parseTaskId(params.id);

    // Verify task exists
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      select: { id: true, TaskCode: true },
    });

    if (!task) {
      throw new Error('Task not found');
    }

    // Determine section and subsection based on sarsItem and balance
    const { section, subsection } = determineSectionAndSubsection(
      data.sarsItem,
      data.balance
    );

    // Create mapped account with explicit field mapping (no spreading)
    const mappedAccount = await prisma.mappedAccount.create({
      data: {
        accountCode: data.accountCode,
        accountName: data.accountName,
        balance: data.balance,
        priorYearBalance: data.priorYearBalance,
        sarsItem: data.sarsItem,
        section: data.section ?? section,
        subsection: data.subsection ?? subsection,
        taskId,
        updatedAt: new Date(),
      },
      select: {
        id: true,
        accountCode: true,
        accountName: true,
        section: true,
        subsection: true,
        balance: true,
        priorYearBalance: true,
        sarsItem: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    logger.info('Created mapped account', {
      userId: user.id,
      taskId,
      taskCode: task.TaskCode,
      mappedAccountId: mappedAccount.id,
      accountCode: mappedAccount.accountCode,
    });

    return NextResponse.json(successResponse(mappedAccount), { status: 201 });
  },
});
