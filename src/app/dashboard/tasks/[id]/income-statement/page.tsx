'use client';

import { useState, useEffect } from 'react';
import { mappingGuide } from '@/lib/services/tasks/mappingGuide';
import { formatAmount } from '@/lib/utils/formatters';
import { MappedData } from '@/types';
import { ChevronRight } from 'lucide-react';
import { useMappedAccounts, useUpdateMappedAccount } from '@/hooks/tasks/useTaskData';
import { RemappingModal } from '@/components/tools/tax-calculation';
const subsectionDisplayNames: Record<string, string> = {
  grossProfitOrLoss: 'Gross Profit/Loss',
  incomeItemsCreditAmounts: 'Income Items (Credit)',
  expenseItemsDebitAmounts: 'Expense Items (Debit)',
  incomeItemsOnlyCreditAmounts: 'Income Items (Credit Only)'
};

interface IncomeStatementPageProps {
  params: { id: string };
}

export default function IncomeStatementPage({ params }: { params: { id: string } }) {
  // Note: In client components, params is already resolved (not a Promise)
  const { data: allMappedData = [], isLoading, error: queryError } = useMappedAccounts(params.id);
  const updateMappedAccount = useUpdateMappedAccount(params.id);
  
  const [error, setError] = useState<string | null>(null);
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({});
  const [isRemappingModalOpen, setIsRemappingModalOpen] = useState(false);
  const [updatingAccount, setUpdatingAccount] = useState<number | null>(null);

  // Filter only Income Statement items
  const mappedData = allMappedData.filter((item: { sarsItem: string }) => {
    return Object.values(mappingGuide.incomeStatement).flat().some(
      guide => guide.sarsItem === item.sarsItem
    );
  });

  // Set error from query if it exists
  useEffect(() => {
    if (queryError) {
      setError(queryError instanceof Error ? queryError.message : 'An error occurred');
    }
  }, [queryError]);

  const handleMappingUpdate = async (accountId: number, newSarsItem: string, newSection?: string, newSubsection?: string) => {
    try {
      setUpdatingAccount(accountId);
      
      // Find the current item to get section and subsection
      const currentItem = allMappedData.find(item => item.id === accountId);
      const section = newSection || currentItem?.section || 'Income Statement';
      const subsection = newSubsection || currentItem?.subsection || '';
      
      await updateMappedAccount.mutateAsync({
        accountId,
        sarsItem: newSarsItem,
        section,
        subsection,
      });
    } catch (error) {
      throw error;
    } finally {
      setUpdatingAccount(null);
    }
  };

  const toggleItem = (sarsItem: string) => {
    setExpandedItems(prev => ({
      ...prev,
      [sarsItem]: !prev[sarsItem]
    }));
  };

  const getMappedAccounts = (sarsItem: string) => {
    return mappedData.filter(item => item.sarsItem === sarsItem && (item.balance !== 0 || item.priorYearBalance !== 0));
  };

  const renderSection = (title: string, _subsection: string, items: [string, number, number][], color: string = 'gray') => {
    if (items.length === 0) return null;
    
    const colorClasses = {
      green: 'bg-forvis-blue-50 text-forvis-blue-900 border-forvis-blue-200',
      red: 'bg-forvis-blue-50 text-forvis-blue-900 border-forvis-blue-200',
      blue: 'bg-forvis-blue-50 text-forvis-blue-900 border-forvis-blue-200',
      gray: 'bg-forvis-gray-50 text-forvis-gray-900 border-forvis-gray-200'
    }[color];
    
    return (
      <div className="space-y-0.5">
        {title && (
          <div className={`text-xs font-semibold px-3 py-1 rounded-t-lg border-t border-x ${colorClasses}`}>
            {title}
          </div>
        )}
        {items.map(([sarsItem, balance, priorBalance]) => (
          <div key={sarsItem} className="group">
            <div 
              className="grid grid-cols-12 cursor-pointer hover:bg-forvis-blue-50 transition-colors duration-150"
              onClick={() => toggleItem(sarsItem)}
            >
              <div className="col-span-7 pl-4 py-1.5 flex items-center gap-2">
                <ChevronRight 
                  className={`h-3.5 w-3.5 text-forvis-gray-500 group-hover:text-forvis-blue-600 transition-all duration-200 ${expandedItems[sarsItem] ? 'rotate-90' : ''}`}
                />
                <span className="text-forvis-gray-900 group-hover:text-forvis-blue-900 text-xs">{sarsItem}</span>
              </div>
              <div className="col-span-2 text-right px-3 py-1.5 tabular-nums font-medium text-xs text-forvis-gray-900">
                {formatAmount(Math.abs(balance))}
              </div>
              <div className="col-span-3 text-right px-3 py-1.5 tabular-nums font-medium text-xs text-forvis-gray-600">
                {formatAmount(Math.abs(priorBalance))}
              </div>
            </div>
            {renderMappedAccounts(sarsItem)}
          </div>
        ))}
      </div>
    );
  };

  const renderMappedAccounts = (sarsItem: string) => {
    if (!expandedItems[sarsItem]) return null;

    const accounts = getMappedAccounts(sarsItem);
    if (accounts.length === 0) return null;

    // Find the subsection for this SARS item
    const subsectionEntry = Object.entries(mappingGuide.incomeStatement).find(([, items]) =>
      items.some(item => item.sarsItem === sarsItem)
    );
    
    const subsectionName = subsectionEntry 
      ? subsectionDisplayNames[subsectionEntry[0]] || subsectionEntry[0]
      : '';

    return (
      <div className="pl-6 pr-3 py-1.5 bg-gradient-to-r from-forvis-blue-50 to-forvis-blue-100 border-t border-b border-forvis-blue-200">
        <div className="px-3 py-1 mb-1 border-b border-forvis-blue-300 bg-gradient-to-r from-forvis-blue-100 to-forvis-blue-200 rounded-t">
          <div className="text-xs font-semibold text-forvis-blue-900 uppercase tracking-wide">Mapped Accounts</div>
        </div>
        <div className="space-y-0.5">
          {accounts.map((account, accIndex) => (
            <div 
              key={account.id} 
              className={`grid grid-cols-12 text-xs items-center py-1.5 px-2 rounded hover:bg-forvis-blue-100 transition-colors duration-150 cursor-pointer group/account ${
                accIndex % 2 === 0 ? 'bg-white bg-opacity-40' : 'bg-forvis-blue-50 bg-opacity-60'
              }`}
              onClick={() => setIsRemappingModalOpen(true)}
            >
              <div className="col-span-1 text-forvis-gray-600 font-medium">
                {account.accountCode}
              </div>
              <div className="col-span-4 truncate font-medium">{account.accountName}</div>
              <div className="col-span-2 text-forvis-gray-500 text-xs truncate">{subsectionName}</div>
              <div className={`col-span-2 text-right tabular-nums font-semibold ${account.balance < 0 ? 'text-red-600' : 'text-forvis-gray-900'}`}>
                {account.balance < 0 ? `(${formatAmount(Math.abs(account.balance))})` : formatAmount(account.balance)}
              </div>
              <div className={`col-span-3 text-right tabular-nums font-semibold ${account.priorYearBalance < 0 ? 'text-red-600' : 'text-forvis-gray-600'}`}>
                {account.priorYearBalance < 0 ? `(${formatAmount(Math.abs(account.priorYearBalance))})` : formatAmount(account.priorYearBalance)}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  if (isLoading) {
    return <div className="flex justify-center items-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-forvis-blue-600"></div>
    </div>;
  }

  if (error) {
    return <div className="bg-red-50 border border-red-200 rounded-lg p-4">
      <p className="text-sm text-red-600">{error}</p>
    </div>;
  }

  // Transform and aggregate data by sarsItem and subsection
  const aggregatedData = mappedData.reduce((acc, item) => {
    const key = `${item.sarsItem}`;
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

  // Calculate Gross Profit/Loss items
  // Sales are negative (credit), costs are positive (debit)
  const grossProfitLossTotal = grossProfitLossItems.reduce((sum, [, data]) => sum + data.current, 0);
  const grossProfitLossTotalPrior = grossProfitLossItems.reduce((sum, [, data]) => sum + data.prior, 0);

  // Separate sales revenue for display (absolute value)
  const totalIncome = grossProfitLossItems
    .filter(([sarsItem]) => sarsItem.includes('Sales') && !sarsItem.includes('Credit notes'))
    .reduce((sum, [, data]) => sum + Math.abs(data.current), 0);

  const totalIncomePrior = grossProfitLossItems
    .filter(([sarsItem]) => sarsItem.includes('Sales') && !sarsItem.includes('Credit notes'))
    .reduce((sum, [, data]) => sum + Math.abs(data.prior), 0);

  // Cost of sales items (for display)
  const costOfSalesItems = grossProfitLossItems
    .filter(([sarsItem]) => !sarsItem.includes('Sales') || sarsItem.includes('Credit notes'));
  
  const costOfSales = costOfSalesItems.reduce((sum, [, data]) => sum + data.current, 0);
  const costOfSalesPrior = costOfSalesItems.reduce((sum, [, data]) => sum + data.prior, 0);

  // Gross profit = sum of all grossProfitOrLoss items (already includes sales minus costs)
  const grossProfit = -grossProfitLossTotal; // Negate because sales are negative
  const grossProfitPrior = -grossProfitLossTotalPrior;

  // Other income from incomeItemsCreditAmounts and incomeItemsOnlyCreditAmounts
  const otherIncome = [...incomeItemsCreditItems, ...incomeItemsOnlyItems]
    .reduce((sum, [, data]) => sum + Math.abs(data.current), 0);

  const otherIncomePrior = [...incomeItemsCreditItems, ...incomeItemsOnlyItems]
    .reduce((sum, [, data]) => sum + Math.abs(data.prior), 0);

  // Expenses from expenseItemsDebitAmounts
  const expenses = expenseItemsDebitItems.reduce((sum, [, data]) => sum + Math.abs(data.current), 0);
  const expensesPrior = expenseItemsDebitItems.reduce((sum, [, data]) => sum + Math.abs(data.prior), 0);

  // Net profit = Gross Profit + Other Income - Expenses
  const netProfitBeforeTax = grossProfit + otherIncome - expenses;
  const netProfitBeforeTaxPrior = grossProfitPrior + otherIncomePrior - expensesPrior;

  // Calculate total of all income statement items for verification
  const totalOfAllItems = Object.values(aggregatedData).reduce((sum, data) => sum + data.current, 0);
  const totalOfAllItemsPrior = Object.values(aggregatedData).reduce((sum, data) => sum + data.prior, 0);

  return (
    <>
      <RemappingModal
        isOpen={isRemappingModalOpen}
        onClose={() => setIsRemappingModalOpen(false)}
        mappedData={allMappedData}
        onMappingUpdate={handleMappingUpdate}
      />
      
      <div className="space-y-4">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <div 
          className="rounded-lg shadow-corporate p-3 text-white"
          style={{ background: 'linear-gradient(to bottom right, #2E5AAC, #25488A)' }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium opacity-90">Total Income</p>
              <p className="text-xl font-bold mt-1">{formatAmount(totalIncome)}</p>
            </div>
            <div className="rounded-full p-2" style={{ backgroundColor: 'rgba(28, 54, 103, 0.5)' }}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>

        <div 
          className="rounded-lg shadow-corporate p-3 text-white"
          style={{ background: 'linear-gradient(to bottom right, #5B93D7, #2E5AAC)' }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium opacity-90">Gross Profit</p>
              <p className="text-xl font-bold mt-1">{formatAmount(grossProfit)}</p>
            </div>
            <div className="rounded-full p-2" style={{ backgroundColor: 'rgba(37, 72, 138, 0.5)' }}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
          </div>
        </div>

        <div 
          className="rounded-lg shadow-corporate p-3 text-white"
          style={{ background: 'linear-gradient(to bottom right, #25488A, #1C3667)' }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium opacity-90">Total Expenses</p>
              <p className="text-xl font-bold mt-1">{formatAmount(expenses)}</p>
            </div>
            <div className="rounded-full p-2" style={{ backgroundColor: 'rgba(19, 36, 69, 0.5)' }}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
              </svg>
            </div>
          </div>
        </div>

        <div 
          className="rounded-lg shadow-corporate p-3 text-white"
          style={{ background: netProfitBeforeTax >= 0 
            ? 'linear-gradient(to bottom right, #1C3667, #132445)' 
            : 'linear-gradient(to bottom right, #6B7280, #4B5563)' 
          }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium opacity-90">Net Profit</p>
              <p className="text-xl font-bold mt-1">{formatAmount(netProfitBeforeTax)}</p>
            </div>
            <div className="rounded-full p-2" style={{ backgroundColor: netProfitBeforeTax >= 0 ? 'rgba(10, 18, 34, 0.5)' : 'rgba(55, 65, 81, 0.5)' }}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Action Bar */}
      <div 
        className="flex items-center justify-between rounded-lg shadow-md border-2 p-4"
        style={{ 
          background: 'linear-gradient(to right, #5B93D7, #2E5AAC)',
          borderColor: '#25488A'
        }}
      >
        <div className="text-white">
          <h3 className="text-base font-bold">Income Statement Actions</h3>
          <p className="text-xs opacity-90 mt-0.5">Generate tax adjustments or bulk remap accounts</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setIsRemappingModalOpen(true)}
            disabled={allMappedData.length === 0}
            className="px-4 py-2.5 bg-white text-forvis-blue-900 rounded-lg hover:bg-forvis-blue-50 transition-colors flex items-center gap-2 text-sm font-bold shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Bulk Remap
          </button>
          <a
            href={`/dashboard/tasks/${params.id}/tax-calculation`}
            className="px-5 py-2.5 bg-white text-forvis-blue-900 rounded-lg hover:bg-forvis-blue-50 transition-colors flex items-center gap-2 text-sm font-bold shadow-lg"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
            Tax Adjustments
          </a>
        </div>
      </div>

      {/* Main Income Statement Card */}
      <div className="bg-white rounded-lg shadow-corporate border border-forvis-gray-200 p-4">
        <div className="space-y-3">
          <div className="border-b border-forvis-gray-400 pb-2">
            <div className="flex items-center justify-between mb-2">
              <h1 className="text-xl font-bold text-forvis-gray-900">INCOME STATEMENT</h1>
            </div>
            <div className="grid grid-cols-12 text-xs font-semibold text-forvis-gray-600">
              <div className="col-span-7"></div>
              <div className="col-span-2 text-right px-3">Current Year (R)</div>
              <div className="col-span-3 text-right px-3">Prior Year (R)</div>
            </div>
          </div>

        {/* REVENUE SECTION */}
        <div className="border-2 rounded-lg overflow-hidden shadow-sm" style={{ borderColor: '#25488A' }}>
          <div 
            className="grid grid-cols-12 font-bold py-2"
            style={{ background: 'linear-gradient(to right, #5B93D7, #2E5AAC)' }}
          >
            <div className="col-span-7 px-3 text-sm text-white">REVENUE & SALES</div>
            <div className="col-span-2 text-right px-3 text-xs tabular-nums text-white">
              {formatAmount(totalIncome)}
            </div>
            <div className="col-span-3 text-right px-3 text-xs tabular-nums text-white">
              {formatAmount(totalIncomePrior)}
            </div>
          </div>

          <div className="bg-white p-3">
            {renderSection("Sales Revenue", "grossProfitOrLoss", 
              grossProfitLossItems
                .filter(([sarsItem]) => sarsItem.includes('Sales') && !sarsItem.includes('Credit notes'))
                .map(([sarsItem, data]) => [sarsItem, Math.abs(data.current), Math.abs(data.prior)]),
              'green'
            )}

            <div 
              className="grid grid-cols-12 mt-2 italic py-2 rounded border-2 shadow-sm"
              style={{ 
                background: 'linear-gradient(to right, #5B93D7, #2E5AAC)',
                borderColor: '#25488A'
              }}
            >
              <div className="col-span-7 px-3 text-xs text-white font-bold">Turnover per Annual Financial Statements</div>
              <div className="col-span-2 text-right px-3 text-xs tabular-nums text-white font-bold">
                {formatAmount(totalIncome)}
              </div>
              <div className="col-span-3 text-right px-3 text-xs tabular-nums text-white font-bold">
                {formatAmount(totalIncomePrior)}
              </div>
            </div>
          </div>
        </div>

        {/* COST OF SALES SECTION */}
        <div className="border-2 rounded-lg overflow-hidden shadow-sm" style={{ borderColor: '#25488A' }}>
          <div 
            className="grid grid-cols-12 font-bold py-2"
            style={{ background: 'linear-gradient(to right, #5B93D7, #2E5AAC)' }}
          >
            <div className="col-span-7 px-3 text-sm text-white">COST OF SALES</div>
            <div className={`col-span-2 text-right px-3 text-xs tabular-nums text-white`}>
              {formatAmount(costOfSales)}
            </div>
            <div className={`col-span-3 text-right px-3 text-xs tabular-nums text-white`}>
              {formatAmount(costOfSalesPrior)}
            </div>
          </div>

          <div className="bg-white p-3">
            {renderSection("Cost of Sales Items", "grossProfitOrLoss", 
              costOfSalesItems
                .map(([sarsItem, data]) => [sarsItem, Math.abs(data.current), Math.abs(data.prior)]),
              'red'
            )}
          </div>
        </div>

        {/* GROSS PROFIT/LOSS */}
        <div 
          className="grid grid-cols-12 font-bold border-2 rounded-lg py-2 shadow-md"
          style={{ 
            background: grossProfit >= 0 
              ? 'linear-gradient(to right, #2E5AAC, #25488A)'
              : 'linear-gradient(to right, #6B7280, #4B5563)',
            borderColor: grossProfit >= 0 ? '#1C3667' : '#374151'
          }}
        >
          <div className="col-span-7 px-3 text-base text-white">GROSS PROFIT / (LOSS)</div>
          <div className="col-span-2 text-right px-3 text-sm tabular-nums text-white">
            {formatAmount(grossProfit)}
          </div>
          <div className="col-span-3 text-right px-3 text-sm tabular-nums text-white">
            {formatAmount(grossProfitPrior)}
          </div>
        </div>

        {/* OTHER INCOME SECTION */}
        <div className="border-2 rounded-lg overflow-hidden shadow-sm" style={{ borderColor: '#25488A' }}>
          <div 
            className="grid grid-cols-12 font-bold py-2"
            style={{ background: 'linear-gradient(to right, #5B93D7, #2E5AAC)' }}
          >
            <div className="col-span-7 px-3 text-sm text-white">OTHER INCOME</div>
            <div className="col-span-2 text-right px-3 text-xs tabular-nums text-white">
              {formatAmount(otherIncome)}
            </div>
            <div className="col-span-3 text-right px-3 text-xs tabular-nums text-white">
              {formatAmount(otherIncomePrior)}
            </div>
          </div>

          <div className="bg-white p-3">
            {renderSection("Income Items (Credit Amounts)", "incomeItemsCreditAmounts", 
              incomeItemsCreditItems
                .map(([sarsItem, data]) => [sarsItem, Math.abs(data.current), Math.abs(data.prior)]),
              'green'
            )}
            
            {incomeItemsOnlyItems.length > 0 && renderSection("Royalties & Mineral Resources", "incomeItemsOnlyCreditAmounts", 
              incomeItemsOnlyItems
                .map(([sarsItem, data]) => [sarsItem, Math.abs(data.current), Math.abs(data.prior)]),
              'green'
            )}
          </div>
        </div>

        {/* EXPENSES SECTION */}
        <div className="border-2 rounded-lg overflow-hidden shadow-sm" style={{ borderColor: '#25488A' }}>
          <div 
            className="grid grid-cols-12 font-bold py-2"
            style={{ background: 'linear-gradient(to right, #5B93D7, #2E5AAC)' }}
          >
            <div className="col-span-7 px-3 text-sm text-white">OPERATING EXPENSES</div>
            <div className="col-span-2 text-right px-3 text-xs tabular-nums text-white">
              {formatAmount(expenses)}
            </div>
            <div className="col-span-3 text-right px-3 text-xs tabular-nums text-white">
              {formatAmount(expensesPrior)}
            </div>
          </div>

          <div className="bg-white p-3">
            {renderSection("Expense Items (Debit Amounts)", "expenseItemsDebitAmounts", 
              expenseItemsDebitItems
                .map(([sarsItem, data]) => [sarsItem, Math.abs(data.current), Math.abs(data.prior)]),
              'red'
            )}
          </div>
        </div>

        {/* NET PROFIT/LOSS BEFORE TAX */}
        <div 
          className="grid grid-cols-12 font-bold border-2 rounded-lg py-3 shadow-md"
          style={{ 
            background: netProfitBeforeTax >= 0 
              ? 'linear-gradient(to right, #2E5AAC, #25488A)'
              : 'linear-gradient(to right, #6B7280, #4B5563)',
            borderColor: netProfitBeforeTax >= 0 ? '#1C3667' : '#374151'
          }}
        >
          <div className="col-span-7 px-3 text-base text-white">NET PROFIT / (LOSS) BEFORE TAX</div>
          <div className="col-span-2 text-right px-3 text-base tabular-nums text-white">
            {formatAmount(netProfitBeforeTax)}
          </div>
          <div className="col-span-3 text-right px-3 text-base tabular-nums text-white">
            {formatAmount(netProfitBeforeTaxPrior)}
          </div>
        </div>

        {/* Verification total */}
        <div className="grid grid-cols-12 text-xs bg-forvis-gray-50 border border-forvis-gray-300 rounded-lg py-1.5">
          <div className="col-span-7 px-3 text-forvis-gray-600">Total of all items (for verification)</div>
          <div className="col-span-2 text-right px-3 tabular-nums text-forvis-gray-700 font-medium">
            {formatAmount(Math.abs(totalOfAllItems))}
          </div>
          <div className="col-span-3 text-right px-3 tabular-nums text-forvis-gray-600 font-medium">
            {formatAmount(Math.abs(totalOfAllItemsPrior))}
          </div>
        </div>
        </div>
      </div>
    </div>
    </>
  );
} 