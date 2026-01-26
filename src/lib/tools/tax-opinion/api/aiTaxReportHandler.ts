import { prisma } from '@/lib/db/prisma';
import type { TaskId } from '@/types/branded';
import { AITaxReportGenerator, ProjectTaxData } from '../services/aiTaxReportGenerator';

/**
 * Get the latest AI tax report for a task
 */
export async function getLatestAITaxReport(taskId: TaskId) {
  const latestReport = await prisma.aITaxReport.findFirst({
    where: { taskId },
    orderBy: { createdAt: 'desc' },
  });

  if (!latestReport) {
    return null;
  }

  // Parse JSON fields
  return {
    id: latestReport.id,
    executiveSummary: latestReport.executiveSummary,
    risks: JSON.parse(latestReport.risks),
    taxSensitiveItems: JSON.parse(latestReport.taxSensitiveItems),
    detailedFindings: latestReport.detailedFindings,
    recommendations: JSON.parse(latestReport.recommendations),
    generatedAt: latestReport.createdAt.toISOString(),
  };
}

/**
 * Generate a new AI tax report for a task
 */
export async function generateAITaxReport(taskId: TaskId) {
  // Fetch task details
  const task = await prisma.task.findUnique({
    where: { id: taskId },
  });

  if (!task) {
    throw new Error('Task not found');
  }

  // Fetch mapped accounts for trial balance
  const mappedAccounts = await prisma.mappedAccount.findMany({
    where: { taskId },
    orderBy: { accountCode: 'asc' },
  });

  // Fetch tax adjustments
  const adjustments = await prisma.taxAdjustment.findMany({
    where: {
      taskId,
      status: { in: ['APPROVED', 'MODIFIED'] },
    },
    orderBy: { createdAt: 'desc' },
  });

  // Calculate trial balance totals
  const trialBalanceTotals = mappedAccounts.reduce(
    (acc, account) => ({
      totalCurrentYear: acc.totalCurrentYear + account.balance,
      totalPriorYear: acc.totalPriorYear + account.priorYearBalance,
    }),
    { totalCurrentYear: 0, totalPriorYear: 0 }
  );

  // Calculate balance sheet totals
  const assets = mappedAccounts
    .filter(
      (a) =>
        a.section === 'Balance Sheet' &&
        ['noncurrentassets', 'currentassets'].includes(
          a.subsection.toLowerCase().replace(/\s/g, '')
        )
    )
    .reduce((sum, a) => sum + a.balance, 0);

  const equity = mappedAccounts
    .filter(
      (a) =>
        a.section === 'Balance Sheet' &&
        [
          'capitalandreservescreditbalances',
          'capitalandreservesdebitbalances',
        ].includes(a.subsection.toLowerCase().replace(/\s/g, ''))
    )
    .reduce((sum, a) => sum + a.balance, 0);

  const liabilities = mappedAccounts
    .filter(
      (a) =>
        a.section === 'Balance Sheet' &&
        ['noncurrentliabilities', 'currentliabilities'].includes(
          a.subsection.toLowerCase().replace(/\s/g, '')
        )
    )
    .reduce((sum, a) => sum + a.balance, 0);

  // Calculate income statement totals
  const incomeStatementAccounts = mappedAccounts.filter(
    (a) => a.section === 'Income Statement'
  );

  const grossProfitLossItems = incomeStatementAccounts.filter(
    (a) => a.subsection.toLowerCase().replace(/\s/g, '') === 'grossprofitorloss'
  );

  const incomeItemsCreditItems = incomeStatementAccounts.filter(
    (a) =>
      a.subsection.toLowerCase().replace(/\s/g, '') === 'incomeitemscreditamounts'
  );

  const incomeItemsOnlyItems = incomeStatementAccounts.filter(
    (a) =>
      a.subsection.toLowerCase().replace(/\s/g, '') ===
      'incomeitemsonlycreditamounts'
  );

  const expenseItemsDebitItems = incomeStatementAccounts.filter(
    (a) =>
      a.subsection.toLowerCase().replace(/\s/g, '') === 'expenseitemsdebitamounts'
  );

  // Calculate Gross Profit
  const grossProfitLossTotal = grossProfitLossItems.reduce(
    (sum, a) => sum + a.balance,
    0
  );
  const grossProfit = -grossProfitLossTotal;

  // Calculate Other Income
  const otherIncome = [...incomeItemsCreditItems, ...incomeItemsOnlyItems].reduce(
    (sum, a) => sum + Math.abs(a.balance),
    0
  );

  // Calculate Expenses
  const expenses = expenseItemsDebitItems.reduce(
    (sum, a) => sum + Math.abs(a.balance),
    0
  );

  // Calculate accounting profit
  const accountingProfit = grossProfit + otherIncome - expenses;

  // For display purposes
  const salesRevenue = grossProfitLossItems
    .filter((a) => a.sarsItem.includes('Sales') && !a.sarsItem.includes('Credit notes'))
    .reduce((sum, a) => sum + Math.abs(a.balance), 0);

  const revenue = salesRevenue + otherIncome;
  const netProfit = accountingProfit;

  // Calculate tax adjustments
  const debitAdjustments = adjustments.filter((a) => a.type === 'DEBIT');
  const creditAdjustments = adjustments.filter((a) => a.type === 'CREDIT');
  const allowanceAdjustments = adjustments.filter((a) => a.type === 'ALLOWANCE');
  const recoupmentAdjustments = adjustments.filter((a) => a.type === 'RECOUPMENT');

  const totalDebits = debitAdjustments.reduce((sum, a) => sum + Math.abs(a.amount), 0);
  const totalCredits = creditAdjustments.reduce(
    (sum, a) => sum + Math.abs(a.amount),
    0
  );
  const totalAllowances = allowanceAdjustments.reduce(
    (sum, a) => sum + Math.abs(a.amount),
    0
  );
  const totalRecoupments = recoupmentAdjustments.reduce(
    (sum, a) => sum + Math.abs(a.amount),
    0
  );

  // Calculate taxable income
  const taxableIncome =
    accountingProfit + totalDebits - totalCredits - totalAllowances + totalRecoupments;
  const taxLiability = Math.max(0, taxableIncome) * 0.27;

  // Prepare task data for AI analysis
  const taskData: ProjectTaxData = {
    taskName: task.TaskDesc,
    trialBalance: {
      totalCurrentYear: trialBalanceTotals.totalCurrentYear,
      totalPriorYear: trialBalanceTotals.totalPriorYear,
      accountCount: mappedAccounts.length,
    },
    balanceSheet: {
      totalAssets: assets,
      totalEquity: equity,
      totalLiabilities: liabilities,
    },
    incomeStatement: {
      totalRevenue: revenue,
      totalExpenses: expenses,
      netProfit,
    },
    taxCalculation: {
      accountingProfit,
      totalDebitAdjustments: totalDebits,
      totalCreditAdjustments: totalCredits,
      totalAllowances,
      totalRecoupments,
      taxableIncome,
      taxLiability,
      adjustments: adjustments.map((adj) => ({
        type: adj.type as 'DEBIT' | 'CREDIT' | 'ALLOWANCE' | 'RECOUPMENT',
        description: adj.description,
        amount: adj.amount,
        sarsSection: adj.sarsSection || '',
        notes: adj.notes || '',
        confidenceScore: adj.confidenceScore || undefined,
      })),
    },
  };

  // Generate AI report
  const aiReport = await AITaxReportGenerator.generateTaxReport(taskData);

  // Save to database
  const savedReport = await prisma.aITaxReport.create({
    data: {
      taskId,
      executiveSummary: aiReport.executiveSummary,
      risks: JSON.stringify(aiReport.risks),
      taxSensitiveItems: JSON.stringify(aiReport.taxSensitiveItems),
      detailedFindings: aiReport.detailedFindings,
      recommendations: JSON.stringify(aiReport.recommendations),
    },
  });

  return {
    id: savedReport.id,
    ...aiReport,
  };
}





