import { prisma } from '@/lib/db/prisma';
import type { TaskId } from '@/types/branded';

/**
 * Get tax calculation data for a task
 * Returns net profit and tax adjustments
 */
export async function getTaxCalculationData(taskId: TaskId) {
  // Get the project's income statement data (only income statement accounts)
  const mappedAccounts = await prisma.mappedAccount.findMany({
    where: {
      taskId,
      section: 'Income Statement', // Only include income statement accounts
    },
    select: {
      balance: true,
      accountName: true,
      sarsItem: true,
    },
  });

  // Calculate net profit from income statement accounts only
  // Note: In accounting, income accounts are credits (negative), expenses are debits (positive)
  // A net credit balance (negative sum) represents profit, so we negate to show profit as positive
  const rawBalance = mappedAccounts.reduce(
    (sum: number, account: { balance: number }) => sum + account.balance,
    0
  );
  const netProfit = -rawBalance; // Convert credit balance (profit) to positive amount

  // Get tax adjustments for this project
  const taxAdjustments = await prisma.taxAdjustment.findMany({
    where: {
      taskId,
    },
    select: {
      type: true,
      description: true,
      amount: true,
    },
  });

  // Calculate total adjustments
  const totalDebitAdjustments = taxAdjustments
    .filter((adj) => adj.type === 'DEBIT')
    .reduce((sum: number, adj) => sum + adj.amount, 0);

  const totalCreditAdjustments = taxAdjustments
    .filter((adj) => adj.type === 'CREDIT')
    .reduce((sum: number, adj) => sum + adj.amount, 0);

  const totalAllowances = taxAdjustments
    .filter((adj) => adj.type === 'ALLOWANCE')
    .reduce((sum: number, adj) => sum + adj.amount, 0);

  // Calculate final profit/loss
  const calculatedProfit =
    netProfit +
    totalDebitAdjustments -
    Math.abs(totalCreditAdjustments) +
    totalAllowances;

  return {
    netProfit,
    debitAdjustments: taxAdjustments.filter((adj) => adj.type === 'DEBIT'),
    creditAdjustments: taxAdjustments.filter((adj) => adj.type === 'CREDIT'),
    allowances: taxAdjustments.filter((adj) => adj.type === 'ALLOWANCE'),
    calculatedProfit,
  };
}







































