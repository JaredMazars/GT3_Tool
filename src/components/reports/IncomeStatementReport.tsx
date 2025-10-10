'use client';

import { formatAmount } from '@/lib/formatters';
import { MappedData } from '@/types';

interface IncomeStatementReportProps {
  mappedData: MappedData[];
  printMode?: boolean;
}

export default function IncomeStatementReport({ mappedData, printMode = false }: IncomeStatementReportProps) {
  // Filter only Income Statement items
  const incomeStatementItems = mappedData.filter(item => 
    item.section.toLowerCase() === 'income statement'
  );

  // Aggregate data by sarsItem
  const aggregatedData = incomeStatementItems.reduce((acc, item) => {
    const key = item.sarsItem;
    if (!acc[key]) {
      acc[key] = { current: 0, prior: 0, subsection: item.subsection };
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
  const grossProfitLossTotal = grossProfitLossItems.reduce((sum, [, data]) => sum + data.current, 0);
  const grossProfitLossTotalPrior = grossProfitLossItems.reduce((sum, [, data]) => sum + data.prior, 0);

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

  const grossProfit = -grossProfitLossTotal;
  const grossProfitPrior = -grossProfitLossTotalPrior;

  const otherIncome = [...incomeItemsCreditItems, ...incomeItemsOnlyItems]
    .reduce((sum, [, data]) => sum + Math.abs(data.current), 0);

  const otherIncomePrior = [...incomeItemsCreditItems, ...incomeItemsOnlyItems]
    .reduce((sum, [, data]) => sum + Math.abs(data.prior), 0);

  const expenses = expenseItemsDebitItems.reduce((sum, [, data]) => sum + Math.abs(data.current), 0);
  const expensesPrior = expenseItemsDebitItems.reduce((sum, [, data]) => sum + Math.abs(data.prior), 0);

  const netProfitBeforeTax = grossProfit + otherIncome - expenses;
  const netProfitBeforeTaxPrior = grossProfitPrior + otherIncomePrior - expensesPrior;

  const renderSection = (items: [string, { current: number; prior: number }][]) => {
    return items.map(([sarsItem, data]) => (
      <div key={sarsItem} className="grid grid-cols-12 border-b border-gray-100">
        <div className="col-span-7 pl-4 py-1.5 text-xs">{sarsItem}</div>
        <div className="col-span-2 text-right px-3 py-1.5 tabular-nums font-medium text-xs">
          {formatAmount(Math.abs(data.current))}
        </div>
        <div className="col-span-3 text-right px-3 py-1.5 tabular-nums font-medium text-xs text-gray-600">
          {formatAmount(Math.abs(data.prior))}
        </div>
      </div>
    ));
  };

  return (
    <div className={printMode ? 'print-section' : ''}>
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="space-y-3">
          <div className="border-b border-gray-400 pb-2">
            <h1 className="text-xl font-bold text-gray-900">INCOME STATEMENT</h1>
            <div className="grid grid-cols-12 text-xs font-semibold text-gray-600 mt-2">
              <div className="col-span-7"></div>
              <div className="col-span-2 text-right px-3">Current Year (R)</div>
              <div className="col-span-3 text-right px-3">Prior Year (R)</div>
            </div>
          </div>

          {/* REVENUE SECTION */}
          <div className="border border-green-200 rounded-lg overflow-hidden">
            <div className="grid grid-cols-12 font-bold bg-gradient-to-r from-green-100 to-green-200 py-1.5">
              <div className="col-span-7 px-3 text-sm text-green-900">REVENUE & SALES</div>
              <div className="col-span-2 text-right px-3 text-xs tabular-nums text-green-900">
                {formatAmount(totalIncome)}
              </div>
              <div className="col-span-3 text-right px-3 text-xs tabular-nums text-green-700">
                {formatAmount(totalIncomePrior)}
              </div>
            </div>
            <div className="bg-white p-3">
              {renderSection(
                grossProfitLossItems
                  .filter(([sarsItem]) => sarsItem.includes('Sales') && !sarsItem.includes('Credit notes'))
                  .map(([sarsItem, data]) => [sarsItem, { current: Math.abs(data.current), prior: Math.abs(data.prior) }])
              )}
            </div>
          </div>

          {/* COST OF SALES SECTION */}
          <div className="border border-red-200 rounded-lg overflow-hidden">
            <div className="grid grid-cols-12 font-bold bg-gradient-to-r from-red-100 to-red-200 py-1.5">
              <div className="col-span-7 px-3 text-sm text-red-900">COST OF SALES</div>
              <div className="col-span-2 text-right px-3 text-xs tabular-nums text-red-900">
                {formatAmount(costOfSales)}
              </div>
              <div className="col-span-3 text-right px-3 text-xs tabular-nums text-red-700">
                {formatAmount(costOfSalesPrior)}
              </div>
            </div>
            <div className="bg-white p-3">
              {renderSection(
                costOfSalesItems.map(([sarsItem, data]) => [sarsItem, { current: Math.abs(data.current), prior: Math.abs(data.prior) }])
              )}
            </div>
          </div>

          {/* GROSS PROFIT */}
          <div className={`grid grid-cols-12 font-bold border rounded-lg py-2 ${
            grossProfit >= 0 
              ? 'bg-gradient-to-r from-blue-100 to-blue-200 border-blue-300' 
              : 'bg-gradient-to-r from-gray-100 to-gray-200 border-gray-300'
          }`}>
            <div className={`col-span-7 px-3 text-sm ${grossProfit >= 0 ? 'text-blue-900' : 'text-gray-900'}`}>
              GROSS PROFIT / (LOSS)
            </div>
            <div className={`col-span-2 text-right px-3 text-xs tabular-nums ${grossProfit >= 0 ? 'text-blue-900' : 'text-gray-900'}`}>
              {formatAmount(grossProfit)}
            </div>
            <div className={`col-span-3 text-right px-3 text-xs tabular-nums ${grossProfitPrior >= 0 ? 'text-blue-700' : 'text-gray-700'}`}>
              {formatAmount(grossProfitPrior)}
            </div>
          </div>

          {/* OTHER INCOME */}
          <div className="border border-green-200 rounded-lg overflow-hidden">
            <div className="grid grid-cols-12 font-bold bg-gradient-to-r from-green-50 to-green-100 py-1.5">
              <div className="col-span-7 px-3 text-sm text-green-900">OTHER INCOME</div>
              <div className="col-span-2 text-right px-3 text-xs tabular-nums text-green-900">
                {formatAmount(otherIncome)}
              </div>
              <div className="col-span-3 text-right px-3 text-xs tabular-nums text-green-700">
                {formatAmount(otherIncomePrior)}
              </div>
            </div>
            <div className="bg-white p-3">
              {renderSection(
                [...incomeItemsCreditItems, ...incomeItemsOnlyItems]
                  .map(([sarsItem, data]) => [sarsItem, { current: Math.abs(data.current), prior: Math.abs(data.prior) }])
              )}
            </div>
          </div>

          {/* EXPENSES */}
          <div className="border border-red-200 rounded-lg overflow-hidden">
            <div className="grid grid-cols-12 font-bold bg-gradient-to-r from-red-100 to-red-200 py-1.5">
              <div className="col-span-7 px-3 text-sm text-red-900">OPERATING EXPENSES</div>
              <div className="col-span-2 text-right px-3 text-xs tabular-nums text-red-900">
                {formatAmount(expenses)}
              </div>
              <div className="col-span-3 text-right px-3 text-xs tabular-nums text-red-700">
                {formatAmount(expensesPrior)}
              </div>
            </div>
            <div className="bg-white p-3">
              {renderSection(
                expenseItemsDebitItems.map(([sarsItem, data]) => [sarsItem, { current: Math.abs(data.current), prior: Math.abs(data.prior) }])
              )}
            </div>
          </div>

          {/* NET PROFIT */}
          <div className={`grid grid-cols-12 font-bold border rounded-lg py-2 ${
            netProfitBeforeTax >= 0 
              ? 'bg-gradient-to-r from-purple-100 to-purple-200 border-purple-300' 
              : 'bg-gradient-to-r from-gray-100 to-gray-200 border-gray-300'
          }`}>
            <div className={`col-span-7 px-3 text-base ${netProfitBeforeTax >= 0 ? 'text-purple-900' : 'text-gray-900'}`}>
              NET PROFIT / (LOSS) BEFORE TAX
            </div>
            <div className={`col-span-2 text-right px-3 text-sm tabular-nums ${netProfitBeforeTax >= 0 ? 'text-purple-900' : 'text-gray-900'}`}>
              {formatAmount(netProfitBeforeTax)}
            </div>
            <div className={`col-span-3 text-right px-3 text-sm tabular-nums ${netProfitBeforeTaxPrior >= 0 ? 'text-purple-700' : 'text-gray-700'}`}>
              {formatAmount(netProfitBeforeTaxPrior)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}




