import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { AITaxReportGenerator, ProjectTaxData } from '@/lib/aiTaxReportGenerator';

export const maxDuration = 90; // 90 seconds timeout for AI generation

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    const projectId = parseInt(params.id);

    // Get the most recent AI tax report for this project
    const latestReport = await prisma.aITaxReport.findFirst({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
    });

    if (!latestReport) {
      return NextResponse.json({ error: 'No AI tax report found' }, { status: 404 });
    }

    // Parse JSON fields
    const reportData = {
      id: latestReport.id,
      executiveSummary: latestReport.executiveSummary,
      risks: JSON.parse(latestReport.risks),
      taxSensitiveItems: JSON.parse(latestReport.taxSensitiveItems),
      detailedFindings: latestReport.detailedFindings,
      recommendations: JSON.parse(latestReport.recommendations),
      generatedAt: latestReport.createdAt.toISOString(),
    };

    return NextResponse.json(reportData);
  } catch (error) {
    console.error('Error fetching AI tax report:', error);
    return NextResponse.json(
      { error: 'Failed to fetch AI tax report' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    const projectId = parseInt(params.id);

    // Fetch project details
    const project = await prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Fetch mapped accounts for trial balance
    const mappedAccounts = await prisma.mappedAccount.findMany({
      where: { projectId },
      orderBy: { accountCode: 'asc' },
    });

    // Fetch tax adjustments
    const adjustments = await prisma.taxAdjustment.findMany({
      where: {
        projectId,
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

    // Calculate balance sheet totals (subsections are stored in camelCase)
    const assets = mappedAccounts
      .filter(a => a.section === 'Balance Sheet' && 
        ['noncurrentassets', 'currentassets'].includes(a.subsection.toLowerCase().replace(/\s/g, '')))
      .reduce((sum, a) => sum + a.balance, 0);
    
    const equity = mappedAccounts
      .filter(a => a.section === 'Balance Sheet' && 
        ['capitalandreservescreditbalances', 'capitalandreservesdebitbalances'].includes(a.subsection.toLowerCase().replace(/\s/g, '')))
      .reduce((sum, a) => sum + a.balance, 0);
    
    const liabilities = mappedAccounts
      .filter(a => a.section === 'Balance Sheet' && 
        ['noncurrentliabilities', 'currentliabilities'].includes(a.subsection.toLowerCase().replace(/\s/g, '')))
      .reduce((sum, a) => sum + a.balance, 0);

    // Calculate income statement totals (subsections are stored in camelCase)
    // In the system: income items have negative balances, expense items have positive balances
    const incomeStatementAccounts = mappedAccounts.filter(a => a.section === 'Income Statement');
    
    // Group by subsection
    const grossProfitLossItems = incomeStatementAccounts.filter(a => 
      a.subsection.toLowerCase().replace(/\s/g, '') === 'grossprofitorloss');
    
    const incomeItemsCreditItems = incomeStatementAccounts.filter(a => 
      a.subsection.toLowerCase().replace(/\s/g, '') === 'incomeitemscreditamounts');
    
    const incomeItemsOnlyItems = incomeStatementAccounts.filter(a => 
      a.subsection.toLowerCase().replace(/\s/g, '') === 'incomeitemsonlycreditamounts');
    
    const expenseItemsDebitItems = incomeStatementAccounts.filter(a => 
      a.subsection.toLowerCase().replace(/\s/g, '') === 'expenseitemsdebitamounts');
    
    // Calculate Gross Profit (from sales and cost of sales)
    const grossProfitLossTotal = grossProfitLossItems.reduce((sum, a) => sum + a.balance, 0);
    const grossProfit = -grossProfitLossTotal; // Negate because sales are negative (credits)
    
    // Calculate Other Income
    const otherIncome = [...incomeItemsCreditItems, ...incomeItemsOnlyItems]
      .reduce((sum, a) => sum + Math.abs(a.balance), 0);
    
    // Calculate Expenses
    const expenses = expenseItemsDebitItems.reduce((sum, a) => sum + Math.abs(a.balance), 0);
    
    // Calculate Net Profit BEFORE TAX (accounting profit)
    // This excludes any tax expense that might be in the accounts
    const accountingProfit = grossProfit + otherIncome - expenses;
    
    // For display purposes: calculate revenue and net profit
    const salesRevenue = grossProfitLossItems
      .filter(a => a.sarsItem.includes('Sales') && !a.sarsItem.includes('Credit notes'))
      .reduce((sum, a) => sum + Math.abs(a.balance), 0);
    
    const revenue = salesRevenue + otherIncome;
    const netProfit = accountingProfit; // This is profit BEFORE tax

    // Calculate tax adjustments
    const debitAdjustments = adjustments.filter(a => a.type === 'DEBIT');
    const creditAdjustments = adjustments.filter(a => a.type === 'CREDIT');
    const allowanceAdjustments = adjustments.filter(a => a.type === 'ALLOWANCE');
    const recoupmentAdjustments = adjustments.filter(a => a.type === 'RECOUPMENT');

    const totalDebits = debitAdjustments.reduce((sum, a) => sum + Math.abs(a.amount), 0);
    const totalCredits = creditAdjustments.reduce((sum, a) => sum + Math.abs(a.amount), 0);
    const totalAllowances = allowanceAdjustments.reduce((sum, a) => sum + Math.abs(a.amount), 0);
    const totalRecoupments = recoupmentAdjustments.reduce((sum, a) => sum + Math.abs(a.amount), 0);

    // Calculate taxable income from accounting profit (before tax)
    const taxableIncome = accountingProfit + totalDebits - totalCredits - totalAllowances + totalRecoupments;
    const taxLiability = Math.max(0, taxableIncome) * 0.27;

    // Prepare project data for AI analysis
    const projectData: ProjectTaxData = {
      projectName: project.name,
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
        adjustments: adjustments.map(adj => ({
          type: adj.type,
          description: adj.description,
          amount: adj.amount,
          sarsSection: adj.sarsSection || undefined,
          notes: adj.notes || undefined,
          confidenceScore: adj.confidenceScore || undefined,
        })),
      },
    };

    // Generate AI report
    const report = await AITaxReportGenerator.generateTaxReport(projectData);

    // Delete any existing AI tax reports for this project to keep only the latest
    await prisma.aITaxReport.deleteMany({
      where: {
        projectId,
      },
    });

    // Save new report to database
    const savedReport = await prisma.aITaxReport.create({
      data: {
        projectId,
        executiveSummary: report.executiveSummary,
        risks: JSON.stringify(report.risks),
        taxSensitiveItems: JSON.stringify(report.taxSensitiveItems),
        detailedFindings: report.detailedFindings,
        recommendations: JSON.stringify(report.recommendations),
      },
    });

    // Return the report with database ID
    return NextResponse.json({
      ...report,
      id: savedReport.id,
    });
  } catch (error) {
    console.error('Error generating AI tax report:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate AI tax report' },
      { status: 500 }
    );
  }
}

