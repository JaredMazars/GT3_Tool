import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatAmount } from '../../utils/formatters';
import { AITaxReportData } from '../opinions/aiTaxReportGenerator';

interface MappedAccount {
  accountCode: string;
  accountName: string;
  balance: number;
  priorYearBalance: number;
  sarsItem: string;
  section: string;
}

interface TaxAdjustment {
  type: 'DEBIT' | 'CREDIT' | 'ALLOWANCE' | 'RECOUPMENT';
  description: string;
  amount: number;
  sarsSection?: string;
  notes?: string;
  confidenceScore?: number;
  createdAt?: string;
  status?: string;
}

interface ReportData {
  projectName: string;
  trialBalance?: {
    accounts: MappedAccount[];
    totals: { currentYear: number; priorYear: number };
  };
  balanceSheet?: {
    mappedData: MappedAccount[];
    totals: Record<string, number>;
  };
  incomeStatement?: {
    mappedData: MappedAccount[];
    totals: Record<string, number>;
  };
  taxCalculation?: {
    accountingProfit: number;
    adjustments: TaxAdjustment[];
  };
  aiReport?: AITaxReportData | null;
}

export async function generateReportingPackPDF(
  reportData: ReportData,
  selectedReports: string[]
): Promise<Blob> {
  const doc = new jsPDF('p', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // Add cover page
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.text('Financial Reporting Pack', pageWidth / 2, 40, { align: 'center' });
  
  doc.setFontSize(16);
  doc.setFont('helvetica', 'normal');
  doc.text(reportData.projectName, pageWidth / 2, 55, { align: 'center' });
  
  doc.setFontSize(12);
  doc.text(new Date().toLocaleDateString(), pageWidth / 2, 65, { align: 'center' });

  // Table of contents
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Contents', 20, 90);
  
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  let tocY = 100;
  if (selectedReports.includes('trialBalance')) {
    doc.text('• Trial Balance', 25, tocY);
    tocY += 8;
  }
  if (selectedReports.includes('balanceSheet')) {
    doc.text('• Balance Sheet', 25, tocY);
    tocY += 8;
  }
  if (selectedReports.includes('incomeStatement')) {
    doc.text('• Income Statement', 25, tocY);
    tocY += 8;
  }
  if (selectedReports.includes('taxCalculation')) {
    doc.text('• Tax Computation', 25, tocY);
    tocY += 8;
  }
  if (selectedReports.includes('aiReport')) {
    doc.text('• AI Tax Analysis Report', 25, tocY);
  }

  // Add each selected report
  if (selectedReports.includes('trialBalance') && reportData.trialBalance) {
    doc.addPage();
    addTrialBalanceToPDF(doc, reportData.trialBalance);
  }

  if (selectedReports.includes('balanceSheet') && reportData.balanceSheet) {
    doc.addPage();
    addBalanceSheetToPDF(doc, reportData.balanceSheet);
  }

  if (selectedReports.includes('incomeStatement') && reportData.incomeStatement) {
    doc.addPage();
    addIncomeStatementToPDF(doc, reportData.incomeStatement);
  }

  if (selectedReports.includes('taxCalculation') && reportData.taxCalculation) {
    doc.addPage();
    addTaxCalculationToPDF(doc, reportData.taxCalculation);
  }

  if (selectedReports.includes('aiReport') && reportData.aiReport) {
    doc.addPage();
    addAITaxReportToPDF(doc, reportData.aiReport);
  }

  // Add page numbers
  const totalPages = doc.internal.pages.length - 1;
  for (let i = 2; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(`Page ${i - 1} of ${totalPages - 1}`, pageWidth / 2, pageHeight - 10, { align: 'center' });
  }

  return doc.output('blob');
}

function addTrialBalanceToPDF(doc: jsPDF, data: ReportData['trialBalance']) {
  if (!data) return;

  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('TRIAL BALANCE', 20, 20);

  const tableData = data.accounts.map(acc => [
    acc.accountCode,
    acc.accountName,
    acc.sarsItem,
    acc.section,
    formatAmount(Math.abs(acc.balance)),
    formatAmount(Math.abs(acc.priorYearBalance)),
  ]);

  autoTable(doc, {
    startY: 30,
    head: [['Code', 'Account Name', 'SARS Item', 'Section', 'Current (R)', 'Prior (R)']],
    body: tableData,
    foot: [[
      '', 
      '', 
      '', 
      'TOTAL', 
      formatAmount(Math.abs(data.totals.currentYear)),
      formatAmount(Math.abs(data.totals.priorYear))
    ]],
    theme: 'grid',
    headStyles: { fillColor: [91, 147, 215], textColor: [255, 255, 255], fontSize: 9, fontStyle: 'bold' },
    footStyles: { fillColor: [46, 90, 172], textColor: [255, 255, 255], fontSize: 9, fontStyle: 'bold' },
    styles: { fontSize: 8, cellPadding: 2 },
    columnStyles: {
      0: { cellWidth: 20 },
      1: { cellWidth: 50 },
      2: { cellWidth: 45 },
      3: { cellWidth: 30 },
      4: { cellWidth: 25, halign: 'right' },
      5: { cellWidth: 25, halign: 'right' },
    },
  });
}

function addBalanceSheetToPDF(doc: jsPDF, data: ReportData['balanceSheet']) {
  if (!data || !data.mappedData) return;

  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('BALANCE SHEET', 20, 20);

  // Transform data similar to the component
  const mappedData = data.mappedData;
  const balanceSheetData = transformMappedDataToBalanceSheet(mappedData);
  
  // Calculate totals
  const totals = calculateTotals(mappedData);
  const totalAssets = calculateNestedTotal(balanceSheetData.nonCurrentAssets) + 
                      calculateNestedTotal(balanceSheetData.currentAssets);
  const currentYearProfitLoss = totals.incomeStatement;
  const totalCapitalAndReserves = calculateNestedTotal(balanceSheetData.capitalAndReservesCreditBalances) + 
                                   calculateNestedTotal(balanceSheetData.capitalAndReservesDebitBalances) - 
                                   currentYearProfitLoss;
  const totalLiabilities = calculateNestedTotal(balanceSheetData.nonCurrentLiabilities) + 
                           calculateNestedTotal(balanceSheetData.currentLiabilities);
  const totalPriorYearAssets = calculateNestedPriorYearTotal(balanceSheetData.nonCurrentAssets) + 
                                calculateNestedPriorYearTotal(balanceSheetData.currentAssets);
  const priorYearProfitLoss = totals.priorYearIncomeStatement || 0;
  const totalPriorYearCapitalAndReserves = calculateNestedPriorYearTotal(balanceSheetData.capitalAndReservesCreditBalances) + 
                                            calculateNestedPriorYearTotal(balanceSheetData.capitalAndReservesDebitBalances) - 
                                            priorYearProfitLoss;
  const totalPriorYearLiabilities = calculateNestedPriorYearTotal(balanceSheetData.nonCurrentLiabilities) + 
                                     calculateNestedPriorYearTotal(balanceSheetData.currentLiabilities);

  // Prepare table data
  const tableData: (string | number)[][] = [];
  
  // Assets section
  tableData.push(['ASSETS', '', '']);
  tableData.push(['Non-Current Assets', formatAmount(calculateNestedTotal(balanceSheetData.nonCurrentAssets)), 
                  formatAmount(calculateNestedPriorYearTotal(balanceSheetData.nonCurrentAssets))]);
  Object.entries(balanceSheetData.nonCurrentAssets).forEach(([sarsItem, data]) => {
    if (data.amount !== 0 || data.priorYearAmount !== 0) {
      tableData.push([`  ${sarsItem}`, formatAmount(data.amount), formatAmount(data.priorYearAmount)]);
    }
  });
  
  tableData.push(['Current Assets', formatAmount(calculateNestedTotal(balanceSheetData.currentAssets)), 
                  formatAmount(calculateNestedPriorYearTotal(balanceSheetData.currentAssets))]);
  Object.entries(balanceSheetData.currentAssets).forEach(([sarsItem, data]) => {
    if (data.amount !== 0 || data.priorYearAmount !== 0) {
      tableData.push([`  ${sarsItem}`, formatAmount(data.amount), formatAmount(data.priorYearAmount)]);
    }
  });
  
  tableData.push(['TOTAL ASSETS', formatAmount(totalAssets), formatAmount(totalPriorYearAssets)]);
  tableData.push(['', '', '']);
  
  // Equity section
  tableData.push(['EQUITY & RESERVES', '', '']);
  Object.entries(balanceSheetData.capitalAndReservesCreditBalances).forEach(([sarsItem, data]) => {
    if (data.amount !== 0 || data.priorYearAmount !== 0) {
      tableData.push([`  ${sarsItem}`, formatAmount(data.amount), formatAmount(data.priorYearAmount)]);
    }
  });
  tableData.push(['  Current Year Net Profit', formatAmount(-currentYearProfitLoss), formatAmount(-priorYearProfitLoss)]);
  tableData.push(['Total Equity', formatAmount(totalCapitalAndReserves), formatAmount(totalPriorYearCapitalAndReserves)]);
  tableData.push(['', '', '']);
  
  // Liabilities section
  tableData.push(['LIABILITIES', '', '']);
  tableData.push(['Non-Current Liabilities', '', '']);
  Object.entries(balanceSheetData.nonCurrentLiabilities).forEach(([sarsItem, data]) => {
    if (data.amount !== 0 || data.priorYearAmount !== 0) {
      tableData.push([`  ${sarsItem}`, formatAmount(data.amount), formatAmount(data.priorYearAmount)]);
    }
  });
  
  tableData.push(['Current Liabilities', '', '']);
  Object.entries(balanceSheetData.currentLiabilities).forEach(([sarsItem, data]) => {
    if (data.amount !== 0 || data.priorYearAmount !== 0) {
      tableData.push([`  ${sarsItem}`, formatAmount(data.amount), formatAmount(data.priorYearAmount)]);
    }
  });
  
  tableData.push(['TOTAL LIABILITIES', formatAmount(totalLiabilities), formatAmount(totalPriorYearLiabilities)]);
  tableData.push(['', '', '']);
  tableData.push(['TOTAL EQUITY & LIABILITIES', formatAmount(totalCapitalAndReserves + totalLiabilities), 
                  formatAmount(totalPriorYearCapitalAndReserves + totalPriorYearLiabilities)]);

  autoTable(doc, {
    startY: 30,
    head: [['Description', 'Current Year (R)', 'Prior Year (R)']],
    body: tableData,
    theme: 'grid',
    headStyles: { fillColor: [71, 85, 105], fontSize: 9, fontStyle: 'bold' },
    styles: { fontSize: 8, cellPadding: 2 },
    columnStyles: {
      0: { cellWidth: 100 },
      1: { cellWidth: 40, halign: 'right' },
      2: { cellWidth: 40, halign: 'right' },
    },
  });
}

// Helper functions for balance sheet calculations
function calculateNestedTotal(obj: Record<string, { amount: number; priorYearAmount: number; subsection: string; mappedAccounts: any[] }>): number {
  return Object.values(obj).reduce((sum, val) => sum + val.amount, 0);
}

function calculateNestedPriorYearTotal(obj: Record<string, { amount: number; priorYearAmount: number; subsection: string; mappedAccounts: any[] }>): number {
  return Object.values(obj).reduce((sum, val) => sum + val.priorYearAmount, 0);
}

function calculateTotals(mappedData: MappedAccount[]) {
  return mappedData.reduce((acc, item) => {
    const isBalanceSheet = item.section.toLowerCase() === 'balance sheet';
    const isIncomeStatement = item.section.toLowerCase() === 'income statement';
    
    if (isBalanceSheet) {
      acc.balanceSheet += item.balance;
    } else if (isIncomeStatement) {
      acc.incomeStatement += item.balance;
      acc.priorYearIncomeStatement += item.priorYearBalance;
    }
    return acc;
  }, { balanceSheet: 0, incomeStatement: 0, priorYearIncomeStatement: 0 });
}

function transformMappedDataToBalanceSheet(mappedData: MappedAccount[]) {
  const balanceSheet = {
    nonCurrentAssets: {} as Record<string, { amount: number; priorYearAmount: number; subsection: string; mappedAccounts: MappedAccount[] }>,
    currentAssets: {} as Record<string, { amount: number; priorYearAmount: number; subsection: string; mappedAccounts: MappedAccount[] }>,
    capitalAndReservesCreditBalances: {} as Record<string, { amount: number; priorYearAmount: number; subsection: string; mappedAccounts: MappedAccount[] }>,
    capitalAndReservesDebitBalances: {} as Record<string, { amount: number; priorYearAmount: number; subsection: string; mappedAccounts: MappedAccount[] }>,
    nonCurrentLiabilities: {} as Record<string, { amount: number; priorYearAmount: number; subsection: string; mappedAccounts: MappedAccount[] }>,
    currentLiabilities: {} as Record<string, { amount: number; priorYearAmount: number; subsection: string; mappedAccounts: MappedAccount[] }>,
  };

  const aggregatedBalances = mappedData.reduce((acc, item) => {
    if (item.section.toLowerCase() !== 'balance sheet') return acc;
    
    const key = item.sarsItem;
    if (!acc[key]) {
      acc[key] = {
        sarsItem: key,
        amount: 0,
        priorYearAmount: 0,
        mappedAccounts: []
      };
    }

    acc[key].amount += item.balance;
    acc[key].priorYearAmount += item.priorYearBalance;
    acc[key].mappedAccounts.push(item);
    return acc;
  }, {} as Record<string, { sarsItem: string; amount: number; priorYearAmount: number; mappedAccounts: MappedAccount[] }>);

  Object.values(aggregatedBalances).forEach(item => {
    const { sarsItem, amount, priorYearAmount, mappedAccounts } = item;
    // Determine subsection from sarsItem - this is a simplified categorization
    let subsection = 'currentAssets'; // default
    const sarsLower = sarsItem.toLowerCase();
    
    if (sarsLower.includes('non-current asset') || sarsLower.includes('fixed asset') || sarsLower.includes('intangible')) {
      subsection = 'nonCurrentAssets';
    } else if (sarsLower.includes('current asset') || sarsLower.includes('inventory') || sarsLower.includes('receivable') || sarsLower.includes('cash')) {
      subsection = 'currentAssets';
    } else if (sarsLower.includes('capital') || sarsLower.includes('reserve') || sarsLower.includes('equity')) {
      subsection = amount >= 0 ? 'capitalAndReservesCreditBalances' : 'capitalAndReservesDebitBalances';
    } else if (sarsLower.includes('non-current liabilit') || sarsLower.includes('long-term')) {
      subsection = 'nonCurrentLiabilities';
    } else if (sarsLower.includes('current liabilit') || sarsLower.includes('payable')) {
      subsection = 'currentLiabilities';
    }
    
    const data = { amount, priorYearAmount, subsection, mappedAccounts };

    switch (subsection) {
      case 'nonCurrentAssets':
        balanceSheet.nonCurrentAssets[sarsItem] = data;
        break;
      case 'currentAssets':
        balanceSheet.currentAssets[sarsItem] = data;
        break;
      case 'capitalAndReservesCreditBalances':
        balanceSheet.capitalAndReservesCreditBalances[sarsItem] = { ...data, amount: -amount, priorYearAmount: -priorYearAmount };
        break;
      case 'capitalAndReservesDebitBalances':
        balanceSheet.capitalAndReservesDebitBalances[sarsItem] = { ...data, amount: -amount, priorYearAmount: -priorYearAmount };
        break;
      case 'nonCurrentLiabilities':
        balanceSheet.nonCurrentLiabilities[sarsItem] = { ...data, amount: -amount, priorYearAmount: -priorYearAmount };
        break;
      case 'currentLiabilities':
        balanceSheet.currentLiabilities[sarsItem] = { ...data, amount: -amount, priorYearAmount: -priorYearAmount };
        break;
    }
  });

  return balanceSheet;
}

function addIncomeStatementToPDF(doc: jsPDF, data: ReportData['incomeStatement']) {
  if (!data || !data.mappedData) return;

  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('INCOME STATEMENT', 20, 20);

  const mappedData = data.mappedData;
  const incomeStatementItems = mappedData.filter(item => 
    item.section.toLowerCase() === 'income statement'
  );

  // Aggregate data by sarsItem
  const aggregatedData = incomeStatementItems.reduce((acc, item) => {
    const key = item.sarsItem;
    if (!acc[key]) {
      // Determine subsection from sarsItem
      let subsection = 'grossProfitOrLoss'; // default
      const sarsLower = item.sarsItem.toLowerCase();
      if (sarsLower.includes('income') || sarsLower.includes('revenue') || sarsLower.includes('sales')) {
        subsection = 'incomeItemsCreditAmounts';
      } else if (sarsLower.includes('dividend') || sarsLower.includes('interest received')) {
        subsection = 'incomeItemsOnlyCreditAmounts';
      }
      acc[key] = { current: 0, prior: 0, subsection };
    }
    acc[key].current += item.balance;
    acc[key].prior += item.priorYearBalance;
    return acc;
  }, {} as Record<string, { current: number; prior: number; subsection: string }>);

  // Group by subsection
  const grossProfitLossItems = Object.entries(aggregatedData)
    .filter(([, data]) => data.subsection === 'grossProfitOrLoss');
  const incomeItemsCreditItems = Object.entries(aggregatedData)
    .filter(([, data]) => data.subsection === 'incomeItemsCreditAmounts');
  const incomeItemsOnlyItems = Object.entries(aggregatedData)
    .filter(([, data]) => data.subsection === 'incomeItemsOnlyCreditAmounts');
  const expenseItemsDebitItems = Object.entries(aggregatedData)
    .filter(([, data]) => data.subsection === 'expenseItemsDebitAmounts');

  // Calculate totals
  const totalIncome = grossProfitLossItems
    .filter(([sarsItem]) => sarsItem.includes('Sales') && !sarsItem.includes('Credit notes'))
    .reduce((sum, [, data]) => sum + Math.abs(data.current), 0);
  const totalIncomePrior = grossProfitLossItems
    .filter(([sarsItem]) => sarsItem.includes('Sales') && !sarsItem.includes('Credit notes'))
    .reduce((sum, [, data]) => sum + Math.abs(data.prior), 0);

  const costOfSalesItems = grossProfitLossItems
    .filter(([sarsItem]) => !sarsItem.includes('Sales') || sarsItem.includes('Credit notes'));
  const costOfSales = costOfSalesItems.reduce((sum, [, data]) => sum + data.current, 0);
  const costOfSalesPrior = costOfSalesItems.reduce((sum, [, data]) => sum + data.prior, 0);

  const grossProfit = -grossProfitLossItems.reduce((sum, [, data]) => sum + data.current, 0);
  const grossProfitPrior = -grossProfitLossItems.reduce((sum, [, data]) => sum + data.prior, 0);

  const otherIncome = [...incomeItemsCreditItems, ...incomeItemsOnlyItems]
    .reduce((sum, [, data]) => sum + Math.abs(data.current), 0);
  const otherIncomePrior = [...incomeItemsCreditItems, ...incomeItemsOnlyItems]
    .reduce((sum, [, data]) => sum + Math.abs(data.prior), 0);

  const expenses = expenseItemsDebitItems.reduce((sum, [, data]) => sum + Math.abs(data.current), 0);
  const expensesPrior = expenseItemsDebitItems.reduce((sum, [, data]) => sum + Math.abs(data.prior), 0);

  const netProfitBeforeTax = grossProfit + otherIncome - expenses;
  const netProfitBeforeTaxPrior = grossProfitPrior + otherIncomePrior - expensesPrior;

  // Prepare table data
  const tableData: (string | number)[][] = [];
  
  // Revenue
  tableData.push(['REVENUE & SALES', formatAmount(totalIncome), formatAmount(totalIncomePrior)]);
  grossProfitLossItems
    .filter(([sarsItem]) => sarsItem.includes('Sales') && !sarsItem.includes('Credit notes'))
    .forEach(([sarsItem, data]) => {
      tableData.push([`  ${sarsItem}`, formatAmount(Math.abs(data.current)), formatAmount(Math.abs(data.prior))]);
    });
  
  tableData.push(['', '', '']);
  tableData.push(['COST OF SALES', formatAmount(costOfSales), formatAmount(costOfSalesPrior)]);
  costOfSalesItems.forEach(([sarsItem, data]) => {
    tableData.push([`  ${sarsItem}`, formatAmount(Math.abs(data.current)), formatAmount(Math.abs(data.prior))]);
  });
  
  tableData.push(['', '', '']);
  tableData.push(['GROSS PROFIT', formatAmount(grossProfit), formatAmount(grossProfitPrior)]);
  
  tableData.push(['', '', '']);
  tableData.push(['OTHER INCOME', formatAmount(otherIncome), formatAmount(otherIncomePrior)]);
  [...incomeItemsCreditItems, ...incomeItemsOnlyItems].forEach(([sarsItem, data]) => {
    tableData.push([`  ${sarsItem}`, formatAmount(Math.abs(data.current)), formatAmount(Math.abs(data.prior))]);
  });
  
  tableData.push(['', '', '']);
  tableData.push(['OPERATING EXPENSES', formatAmount(expenses), formatAmount(expensesPrior)]);
  expenseItemsDebitItems.forEach(([sarsItem, data]) => {
    tableData.push([`  ${sarsItem}`, formatAmount(Math.abs(data.current)), formatAmount(Math.abs(data.prior))]);
  });
  
  tableData.push(['', '', '']);
  tableData.push(['NET PROFIT/(LOSS) BEFORE TAX', formatAmount(netProfitBeforeTax), formatAmount(netProfitBeforeTaxPrior)]);

  autoTable(doc, {
    startY: 30,
    head: [['Description', 'Current Year (R)', 'Prior Year (R)']],
    body: tableData,
    theme: 'grid',
    headStyles: { fillColor: [46, 90, 172], textColor: [255, 255, 255], fontSize: 9, fontStyle: 'bold' },
    styles: { fontSize: 8, cellPadding: 2 },
    columnStyles: {
      0: { cellWidth: 100 },
      1: { cellWidth: 40, halign: 'right' },
      2: { cellWidth: 40, halign: 'right' },
    },
  });
}

function addTaxCalculationToPDF(doc: jsPDF, data: ReportData['taxCalculation']) {
  if (!data) return;

  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('TAX COMPUTATION', 20, 20);

  // Filter adjustments
  const approvedAdjustments = data.adjustments.filter(
    a => a.status === 'APPROVED' || a.status === 'MODIFIED'
  );

  const debitAdjustments = approvedAdjustments.filter(a => a.type === 'DEBIT');
  const creditAdjustments = approvedAdjustments.filter(a => a.type === 'CREDIT');
  const allowanceAdjustments = approvedAdjustments.filter(a => a.type === 'ALLOWANCE');
  const recoupmentAdjustments = approvedAdjustments.filter(a => a.type === 'RECOUPMENT');

  // Calculate totals
  const totalDebits = debitAdjustments.reduce((sum, a) => sum + Math.abs(a.amount), 0);
  const totalCredits = creditAdjustments.reduce((sum, a) => sum + Math.abs(a.amount), 0);
  const totalAllowances = allowanceAdjustments.reduce((sum, a) => sum + Math.abs(a.amount), 0);
  const totalRecoupments = recoupmentAdjustments.reduce((sum, a) => sum + Math.abs(a.amount), 0);

  const taxableIncome = data.accountingProfit + totalDebits - totalCredits - totalAllowances + totalRecoupments;
  const taxLiability = Math.max(0, taxableIncome) * 0.27;

  // Prepare table data
  const tableData: (string | number)[][] = [];

  // Accounting Profit
  tableData.push(['Accounting Profit/(Loss)', formatAmount(data.accountingProfit), '']);
  tableData.push(['', '', '']);

  // Debit Adjustments
  if (debitAdjustments.length > 0) {
    tableData.push(['ADD: DEBIT ADJUSTMENTS', '', '']);
    debitAdjustments.forEach(adj => {
      const sarsPrefix = adj.sarsSection ? `[${adj.sarsSection}] ` : '';
      const description = `  ${sarsPrefix}${adj.description}`;
      const notes = adj.notes ? `\n    Notes: ${adj.notes}` : '';
      const metadata = [];
      if (adj.confidenceScore) metadata.push(`${Math.round(adj.confidenceScore * 100)}% conf.`);
      if (adj.createdAt) metadata.push(new Date(adj.createdAt).toLocaleDateString());
      const metaText = metadata.length > 0 ? `\n    ${metadata.join(' | ')}` : '';
      
      tableData.push([description + notes + metaText, formatAmount(Math.abs(adj.amount)), '']);
    });
    tableData.push(['Total Debit Adjustments', formatAmount(totalDebits), '']);
    tableData.push(['', '', '']);
  }

  // Credit Adjustments
  if (creditAdjustments.length > 0) {
    tableData.push(['LESS: CREDIT ADJUSTMENTS', '', '']);
    creditAdjustments.forEach(adj => {
      const sarsPrefix = adj.sarsSection ? `[${adj.sarsSection}] ` : '';
      const description = `  ${sarsPrefix}${adj.description}`;
      const notes = adj.notes ? `\n    Notes: ${adj.notes}` : '';
      const metadata = [];
      if (adj.confidenceScore) metadata.push(`${Math.round(adj.confidenceScore * 100)}% conf.`);
      if (adj.createdAt) metadata.push(new Date(adj.createdAt).toLocaleDateString());
      const metaText = metadata.length > 0 ? `\n    ${metadata.join(' | ')}` : '';
      
      tableData.push([description + notes + metaText, `(${formatAmount(Math.abs(adj.amount))})`, '']);
    });
    tableData.push(['Total Credit Adjustments', `(${formatAmount(totalCredits)})`, '']);
    tableData.push(['', '', '']);
  }

  // Allowances
  if (allowanceAdjustments.length > 0) {
    tableData.push(['LESS: ALLOWANCES', '', '']);
    allowanceAdjustments.forEach(adj => {
      const sarsPrefix = adj.sarsSection ? `[${adj.sarsSection}] ` : '';
      const description = `  ${sarsPrefix}${adj.description}`;
      const notes = adj.notes ? `\n    Notes: ${adj.notes}` : '';
      const metadata = [];
      if (adj.confidenceScore) metadata.push(`${Math.round(adj.confidenceScore * 100)}% conf.`);
      if (adj.createdAt) metadata.push(new Date(adj.createdAt).toLocaleDateString());
      const metaText = metadata.length > 0 ? `\n    ${metadata.join(' | ')}` : '';
      
      tableData.push([description + notes + metaText, `(${formatAmount(Math.abs(adj.amount))})`, '']);
    });
    tableData.push(['Total Allowances', `(${formatAmount(totalAllowances)})`, '']);
    tableData.push(['', '', '']);
  }

  // Recoupments
  if (recoupmentAdjustments.length > 0) {
    tableData.push(['ADD: RECOUPMENTS', '', '']);
    recoupmentAdjustments.forEach(adj => {
      const sarsPrefix = adj.sarsSection ? `[${adj.sarsSection}] ` : '';
      const description = `  ${sarsPrefix}${adj.description}`;
      const notes = adj.notes ? `\n    Notes: ${adj.notes}` : '';
      const metadata = [];
      if (adj.confidenceScore) metadata.push(`${Math.round(adj.confidenceScore * 100)}% conf.`);
      if (adj.createdAt) metadata.push(new Date(adj.createdAt).toLocaleDateString());
      const metaText = metadata.length > 0 ? `\n    ${metadata.join(' | ')}` : '';
      
      tableData.push([description + notes + metaText, formatAmount(Math.abs(adj.amount)), '']);
    });
    tableData.push(['Total Recoupments', formatAmount(totalRecoupments), '']);
    tableData.push(['', '', '']);
  }

  // Taxable Income
  tableData.push(['TAXABLE INCOME', formatAmount(taxableIncome), '']);
  tableData.push(['', '', '']);
  tableData.push(['Tax Rate (Corporate)', '27%', '']);
  tableData.push(['TAX LIABILITY', formatAmount(taxLiability), '']);

  // Generate table
  autoTable(doc, {
    startY: 30,
    head: [['Description', 'Amount (R)', 'Notes']],
    body: tableData,
    theme: 'grid',
    headStyles: { fillColor: [46, 90, 172], textColor: [255, 255, 255], fontSize: 9, fontStyle: 'bold' },
    styles: { fontSize: 7, cellPadding: 2, lineColor: [200, 200, 200] },
    columnStyles: {
      0: { cellWidth: 110 },
      1: { cellWidth: 35, halign: 'right' },
      2: { cellWidth: 35 },
    },
  });
}

function addAITaxReportToPDF(doc: jsPDF, data: AITaxReportData) {
  if (!data) return;

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginLeft = 20;
  const marginRight = 20;
  const maxWidth = pageWidth - marginLeft - marginRight;
  let y = 20;

  // Helper function to check if we need a new page
  const checkPageBreak = (additionalHeight: number) => {
    if (y + additionalHeight > pageHeight - 20) {
      doc.addPage();
      y = 20;
      return true;
    }
    return false;
  };

  // Helper function to add wrapped text
  const addWrappedText = (text: string, fontSize: number, fontStyle: 'normal' | 'bold', color: [number, number, number] = [0, 0, 0]) => {
    doc.setFontSize(fontSize);
    doc.setFont('helvetica', fontStyle);
    doc.setTextColor(color[0], color[1], color[2]);
    const lines = doc.splitTextToSize(text, maxWidth);
    
    for (const line of lines) {
      checkPageBreak(fontSize / 2);
      doc.text(line, marginLeft, y);
      y += fontSize / 2 + 1;
    }
    doc.setTextColor(0, 0, 0);
  };

  // Title
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('AI TAX ANALYSIS REPORT', pageWidth / 2, y, { align: 'center' });
  y += 12;

  // Generated date
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 100, 100);
  doc.text(`Generated: ${new Date(data.generatedAt).toLocaleString()}`, pageWidth / 2, y, { align: 'center' });
  doc.setTextColor(0, 0, 0);
  y += 15;

  // Executive Summary
  checkPageBreak(20);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setFillColor(91, 147, 215); // Brand blue
  doc.rect(marginLeft, y - 6, maxWidth, 10, 'F');
  doc.setTextColor(255, 255, 255);
  doc.text('EXECUTIVE SUMMARY', marginLeft + 3, y);
  doc.setTextColor(0, 0, 0);
  y += 12;

  addWrappedText(data.executiveSummary, 9, 'normal');
  y += 8;

  // Risk Analysis
  checkPageBreak(20);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setFillColor(37, 72, 138); // Brand dark blue
  doc.rect(marginLeft, y - 6, maxWidth, 10, 'F');
  doc.setTextColor(255, 255, 255);
  doc.text(`RISK ANALYSIS (${data.risks.length} risks identified)`, marginLeft + 3, y);
  doc.setTextColor(0, 0, 0);
  y += 12;

  data.risks.forEach((risk, idx) => {
    checkPageBreak(30);
    
    // Risk box
    const boxY = y;
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.5);
    
    // Severity badge
    let severityColor: [number, number, number];
    switch (risk.severity) {
      case 'high':
        severityColor = [28, 54, 103]; // Brand darkest blue
        break;
      case 'medium':
        severityColor = [46, 90, 172]; // Brand medium blue
        break;
      case 'low':
        severityColor = [91, 147, 215]; // Brand light blue
        break;
    }
    
    doc.setFillColor(severityColor[0], severityColor[1], severityColor[2]);
    doc.rect(marginLeft, boxY, 15, 5, 'F');
    doc.setFontSize(7);
    doc.setTextColor(255, 255, 255);
    doc.text(risk.severity.toUpperCase(), marginLeft + 7.5, boxY + 3.5, { align: 'center' });
    doc.setTextColor(0, 0, 0);
    
    // Risk title
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(risk.title, marginLeft + 18, boxY + 4);
    y += 8;
    
    // Risk description
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    const descLines = doc.splitTextToSize(risk.description, maxWidth - 5);
    descLines.forEach((line: string) => {
      checkPageBreak(5);
      doc.text(line, marginLeft + 2, y);
      y += 4;
    });
    
    // Recommendation
    y += 2;
    checkPageBreak(15);
    doc.setFillColor(245, 248, 252); // Light brand blue
    doc.rect(marginLeft + 2, y - 3, maxWidth - 4, 4, 'F');
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(28, 54, 103); // Brand darkest blue
    doc.text('RECOMMENDATION:', marginLeft + 4, y);
    doc.setTextColor(0, 0, 0);
    y += 5;
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    const recLines = doc.splitTextToSize(risk.recommendation, maxWidth - 8);
    recLines.forEach((line: string) => {
      checkPageBreak(5);
      doc.text(line, marginLeft + 4, y);
      y += 4;
    });
    
    y += 5;
  });

  y += 5;

  // Tax-Sensitive Items
  checkPageBreak(20);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setFillColor(28, 54, 103); // Brand darkest blue
  doc.rect(marginLeft, y - 6, maxWidth, 10, 'F');
  doc.setTextColor(255, 255, 255);
  doc.text(`TAX-SENSITIVE ITEMS (${data.taxSensitiveItems.length} items)`, marginLeft + 3, y);
  doc.setTextColor(0, 0, 0);
  y += 12;

  data.taxSensitiveItems.forEach((item, idx) => {
    checkPageBreak(25);
    
    doc.setFillColor(245, 248, 252); // Light brand blue
    doc.rect(marginLeft, y - 3, maxWidth, 3, 'F');
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text(item.item, marginLeft + 2, y);
    y += 5;
    
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    const reasonText = `Reason: ${item.reason}`;
    const reasonLines = doc.splitTextToSize(reasonText, maxWidth - 4);
    reasonLines.forEach((line: string) => {
      checkPageBreak(5);
      doc.text(line, marginLeft + 2, y);
      y += 4;
    });
    
    const actionText = `Action Required: ${item.action}`;
    const actionLines = doc.splitTextToSize(actionText, maxWidth - 4);
    actionLines.forEach((line: string) => {
      checkPageBreak(5);
      doc.text(line, marginLeft + 2, y);
      y += 4;
    });
    
    y += 4;
  });

  y += 5;

  // Detailed Findings
  checkPageBreak(20);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setFillColor(91, 147, 215); // Brand blue
  doc.rect(marginLeft, y - 6, maxWidth, 10, 'F');
  doc.setTextColor(255, 255, 255);
  doc.text('DETAILED FINDINGS', marginLeft + 3, y);
  doc.setTextColor(0, 0, 0);
  y += 12;

  addWrappedText(data.detailedFindings, 9, 'normal');
  y += 8;

  // Recommendations
  checkPageBreak(20);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setFillColor(46, 90, 172); // Brand medium blue
  doc.rect(marginLeft, y - 6, maxWidth, 10, 'F');
  doc.setTextColor(255, 255, 255);
  doc.text(`RECOMMENDATIONS (${data.recommendations.length} items)`, marginLeft + 3, y);
  doc.setTextColor(0, 0, 0);
  y += 12;

  data.recommendations.forEach((rec, idx) => {
    checkPageBreak(15);
    
    // Number badge
    doc.setFillColor(232, 237, 245); // Light brand blue
    doc.circle(marginLeft + 3, y - 2, 3, 'F');
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(46, 90, 172); // Brand medium blue
    doc.text((idx + 1).toString(), marginLeft + 3, y, { align: 'center' });
    doc.setTextColor(0, 0, 0);
    
    // Recommendation text
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    const recLines = doc.splitTextToSize(rec, maxWidth - 10);
    recLines.forEach((line: string, lineIdx: number) => {
      checkPageBreak(5);
      doc.text(line, marginLeft + 8, y + (lineIdx === 0 ? 0 : 0.5));
      if (lineIdx < recLines.length - 1) y += 4;
    });
    
    y += 6;
  });
}
