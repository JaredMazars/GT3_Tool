import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { determineSectionAndSubsection } from '@/lib/tools/tax-opinion/services/sectionMapper';
import { successResponse, parseTaskId, parseNumericId } from '@/lib/utils/apiUtils';
import { AppError, ErrorCodes } from '@/lib/utils/errorHandler';
import { secureRoute, Feature } from '@/lib/api/secureRoute';
import { z } from 'zod';
import { logger } from '@/lib/utils/logger';

// Zod schema for updating a mapped account
const updateMappedAccountSchema = z.object({
  accountCode: z.string().min(1).max(50).optional(),
  accountName: z.string().min(1).max(255).optional(),
  balance: z.number().optional(),
  priorYearBalance: z.number().optional(),
  sarsItem: z.string().min(1).max(100).optional(),
  section: z.string().max(100).optional(),
  subsection: z.string().max(100).optional(),
}).strict();

/**
 * PATCH /api/tasks/[id]/mapped-accounts/[accountId]
 * Update a mapped account
 */
export const PATCH = secureRoute.mutationWithParams({
  feature: Feature.MANAGE_TASKS,
  taskIdParam: 'id',
  taskRole: 'EDITOR',
  schema: updateMappedAccountSchema,
  handler: async (request, { user, params, data }) => {
    const taskId = parseTaskId(params.id);
    const accountId = parseNumericId(params.accountId, 'Account');

    // Fetch the current account (IDOR protection - verify it belongs to this task)
    const currentAccount = await prisma.mappedAccount.findFirst({
      where: {
        id: accountId,
        taskId,
      },
      select: {
        id: true,
        balance: true,
        sarsItem: true,
      },
    });

    if (!currentAccount) {
      throw new AppError(404, 'Mapped account not found', ErrorCodes.NOT_FOUND);
    }

    // Build update data with explicit field mapping (no spreading)
    const updateData: {
      accountCode?: string;
      accountName?: string;
      balance?: number;
      priorYearBalance?: number;
      sarsItem?: string;
      section?: string;
      subsection?: string;
    } = {};

    if (data.accountCode !== undefined) {
      updateData.accountCode = data.accountCode;
    }
    if (data.accountName !== undefined) {
      updateData.accountName = data.accountName;
    }
    if (data.balance !== undefined) {
      updateData.balance = data.balance;
    }
    if (data.priorYearBalance !== undefined) {
      updateData.priorYearBalance = data.priorYearBalance;
    }
    if (data.sarsItem !== undefined) {
      updateData.sarsItem = data.sarsItem;
    }

    // If sarsItem or balance is being updated, recalculate section and subsection
    if (data.sarsItem !== undefined || data.balance !== undefined) {
      const sarsItemToUse = data.sarsItem ?? currentAccount.sarsItem;
      const balanceToUse = data.balance ?? currentAccount.balance;

      const { section, subsection } = determineSectionAndSubsection(
        sarsItemToUse,
        balanceToUse
      );

      updateData.section = data.section ?? section;
      updateData.subsection = data.subsection ?? subsection;
    } else if (data.section !== undefined || data.subsection !== undefined) {
      // Allow explicit override of section/subsection
      if (data.section !== undefined) {
        updateData.section = data.section;
      }
      if (data.subsection !== undefined) {
        updateData.subsection = data.subsection;
      }
    }

    const mappedAccount = await prisma.mappedAccount.update({
      where: {
        id: accountId,
      },
      data: updateData,
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

    logger.info('Updated mapped account', {
      userId: user.id,
      taskId,
      mappedAccountId: accountId,
      updatedFields: Object.keys(updateData),
    });

    return NextResponse.json(successResponse(mappedAccount));
  },
});

/**
 * DELETE /api/tasks/[id]/mapped-accounts/[accountId]
 * Delete a mapped account
 */
export const DELETE = secureRoute.mutationWithParams({
  feature: Feature.MANAGE_TASKS,
  taskIdParam: 'id',
  taskRole: 'EDITOR',
  handler: async (request, { user, params }) => {
    const taskId = parseTaskId(params.id);
    const accountId = parseNumericId(params.accountId, 'Account');

    // Verify the account exists and belongs to this task (IDOR protection)
    const existingAccount = await prisma.mappedAccount.findFirst({
      where: {
        id: accountId,
        taskId,
      },
      select: {
        id: true,
        accountCode: true,
      },
    });

    if (!existingAccount) {
      throw new AppError(404, 'Mapped account not found', ErrorCodes.NOT_FOUND);
    }

    await prisma.mappedAccount.delete({
      where: {
        id: accountId,
      },
    });

    logger.info('Deleted mapped account', {
      userId: user.id,
      taskId,
      mappedAccountId: accountId,
      accountCode: existingAccount.accountCode,
    });

    return NextResponse.json(successResponse({ deleted: true }));
  },
});
