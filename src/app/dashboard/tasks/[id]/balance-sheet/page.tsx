'use client';

import { useState, useEffect } from 'react';
import { mappingGuide } from '@/lib/services/tasks/mappingGuide';
import { formatAmount } from '@/lib/utils/formatters';
import { MappedData } from '@/types';
import { ChevronRight } from 'lucide-react';
import { useMappedAccounts, useUpdateMappedAccount } from '@/hooks/tasks/useTaskData';
import { RemappingModal } from '@/components/tools/tax-calculation';

interface BalanceSheetSectionProps {
  title: string;
  items: Array<{
    sarsItem: string;
    subsection: string;
    amount: number;
    priorYearAmount: number;
    mappedAccounts: Array<{
      id: number;
      accountCode: string;
      accountName: string;
      subsection: string;
      balance: number;
      priorYearBalance: number;
      section: string;
      sarsItem: string;
    }>;
  }>;
  mappedData: MappedData[];
  taskId: string;
  onMappingUpdate: (accountId: number, newSarsItem: string) => Promise<void>;
  onOpenModal: () => void;
}

function BalanceSheetSection({ title, items, onMappingUpdate, onOpenModal }: BalanceSheetSectionProps) {
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({});

  // Filter out items with zero amount (in either year)
  const nonZeroItems = items.filter(item => item.amount !== 0 || item.priorYearAmount !== 0);
  const totalAmount = nonZeroItems.reduce((sum, item) => sum + item.amount, 0);
  const totalPriorYearAmount = nonZeroItems.reduce((sum, item) => sum + item.priorYearAmount, 0);
  const isNegative = totalAmount < 0;

  const toggleItem = (sarsItem: string) => {
    setExpandedItems(prev => ({
      ...prev,
      [sarsItem]: !prev[sarsItem]
    }));
  };

  if (nonZeroItems.length === 0) return null;

  return (
    <div>
      {/* Section header */}
      {title && (
        <div 
          className="grid grid-cols-12 border-b-2 shadow-sm"
          style={{ 
            background: 'linear-gradient(to right, #5B93D7, #2E5AAC)',
            borderColor: '#25488A'
          }}
        >
          <div className="col-span-7 font-bold px-3 py-2 text-sm text-white">{title}</div>
          <div className={`col-span-2 text-right px-3 py-2 text-xs tabular-nums font-bold ${isNegative ? 'text-red-200' : 'text-white'}`}>
            {isNegative 
              ? `(${formatAmount(Math.abs(totalAmount))})` 
              : formatAmount(totalAmount)}
          </div>
          <div className={`col-span-3 text-right px-3 py-2 text-xs tabular-nums font-bold ${totalPriorYearAmount < 0 ? 'text-red-200' : 'text-white'}`}>
            {totalPriorYearAmount < 0 
              ? `(${formatAmount(Math.abs(totalPriorYearAmount))})` 
              : formatAmount(totalPriorYearAmount)}
          </div>
        </div>
      )}

      {/* SARS Items */}
      <div className="divide-y divide-forvis-gray-100">
        {nonZeroItems.map((item, index) => (
          <div key={index} className="group">
            <div 
              className="grid grid-cols-12 cursor-pointer hover:bg-forvis-blue-50 transition-colors duration-150"
              onClick={() => toggleItem(item.sarsItem)}
            >
              <div className="col-span-7 pl-6 py-1.5 text-xs flex items-center">
                <ChevronRight 
                  className={`h-3.5 w-3.5 mr-2 text-forvis-gray-500 group-hover:text-forvis-blue-600 transition-all duration-200 ${expandedItems[item.sarsItem] ? 'rotate-90' : ''}`}
                />
                <span className="text-forvis-gray-900 group-hover:text-forvis-blue-900">{item.sarsItem}</span>
              </div>
              <div className={`col-span-2 text-right px-3 py-1.5 text-xs tabular-nums font-medium ${item.amount < 0 ? 'text-red-600' : 'text-forvis-gray-900'}`}>
                {item.amount !== 0 && (item.amount < 0 
                  ? `(${formatAmount(Math.abs(item.amount))})` 
                  : formatAmount(item.amount))}
              </div>
              <div className={`col-span-3 text-right px-3 py-1.5 text-xs tabular-nums font-medium ${item.priorYearAmount < 0 ? 'text-red-600' : 'text-forvis-gray-600'}`}>
                {item.priorYearAmount !== 0 && (item.priorYearAmount < 0 
                  ? `(${formatAmount(Math.abs(item.priorYearAmount))})` 
                  : formatAmount(item.priorYearAmount))}
              </div>
            </div>

            {/* Expanded account details */}
            {expandedItems[item.sarsItem] && (
              <div className="bg-gradient-to-r from-forvis-blue-50 to-forvis-blue-100 border-t border-b border-forvis-blue-200">
                <div className="px-3 py-1 border-b border-forvis-blue-300 bg-forvis-blue-100">
                  <div className="text-xs font-semibold text-forvis-blue-900 uppercase tracking-wide">Mapped Accounts</div>
                </div>
                {item.mappedAccounts.map((account, accIndex) => (
                  <div 
                    key={account.id} 
                    className={`grid grid-cols-12 px-6 py-1.5 text-xs hover:bg-forvis-blue-100 border-b border-forvis-blue-100 last:border-b-0 transition-colors duration-150 cursor-pointer group/account ${
                      accIndex % 2 === 0 ? 'bg-white bg-opacity-40' : 'bg-forvis-blue-50 bg-opacity-60'
                    }`}
                    onClick={onOpenModal}
                  >
                    <div className="col-span-1 text-forvis-gray-600 font-medium">
                      {account.accountCode}
                    </div>
                    <div className="col-span-6">
                      <div className="text-forvis-gray-900 font-medium">{account.accountName}</div>
                    </div>
                    <div className={`col-span-2 text-right tabular-nums font-semibold ${account.balance < 0 ? 'text-red-600' : 'text-forvis-gray-900'}`}>
                      {account.balance < 0 
                        ? `(${formatAmount(Math.abs(account.balance))})` 
                        : formatAmount(account.balance)}
                    </div>
                    <div className={`col-span-3 text-right tabular-nums font-semibold ${account.priorYearBalance < 0 ? 'text-red-600' : 'text-forvis-gray-600'}`}>
                      {account.priorYearBalance < 0 
                        ? `(${formatAmount(Math.abs(account.priorYearBalance))})` 
                        : formatAmount(account.priorYearBalance)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

interface BalanceSheetPageProps {
  params: { id: string };
}

export default function BalanceSheetPage({ params }: { params: { id: string } }) {
  // Note: In client components, params is already resolved (not a Promise)
  const { data: mappedData = [], isLoading, error: queryError } = useMappedAccounts(params.id);
  const updateMappedAccount = useUpdateMappedAccount(params.id);
  
  const [error, setError] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    assets: true,
    capitalReserves: true,
    liabilities: true
  });
  const [isRemappingModalOpen, setIsRemappingModalOpen] = useState(false);

  // Set error from query if it exists
  useEffect(() => {
    if (queryError) {
      setError(queryError instanceof Error ? queryError.message : 'An error occurred');
    }
  }, [queryError]);

  const handleMappingUpdate = async (accountId: number, newSarsItem: string, newSection?: string, newSubsection?: string) => {
    try {
      // Find the current item to get section and subsection
      const currentItem = mappedData.find(item => item.id === accountId);
      const section = newSection || currentItem?.section || 'Balance Sheet';
      const subsection = newSubsection || currentItem?.subsection || '';
      
      await updateMappedAccount.mutateAsync({
        accountId,
        sarsItem: newSarsItem,
        section,
        subsection,
      });
    } catch (error) {
      throw error;
    }
  };

  function calculateNestedTotal(obj: Record<string, unknown>): number {
    return Object.values(obj).reduce((sum: number, val: unknown) => {
      if (typeof val === 'number') {
        return sum + val;
      }
      if (typeof val === 'object' && val !== null && 'amount' in val && typeof (val as { amount: unknown }).amount === 'number') {
        return sum + (val as { amount: number }).amount;
      }
      if (typeof val === 'object' && val !== null) {
        return sum + calculateNestedTotal(val as Record<string, unknown>);
      }
      return sum;
    }, 0);
  }

  function calculateNestedPriorYearTotal(obj: Record<string, unknown>): number {
    return Object.values(obj).reduce((sum: number, val: unknown) => {
      if (typeof val === 'number') {
        return sum + val;
      }
      if (typeof val === 'object' && val !== null && 'priorYearAmount' in val && typeof (val as { priorYearAmount: unknown }).priorYearAmount === 'number') {
        return sum + (val as { priorYearAmount: number }).priorYearAmount;
      }
      if (typeof val === 'object' && val !== null) {
        return sum + calculateNestedPriorYearTotal(val as Record<string, unknown>);
      }
      return sum;
    }, 0);
  }

  function transformMappedDataToBalanceSheet(mappedData: MappedData[]) {
    // Initialize balance sheet structure
    const balanceSheet = {
      nonCurrentAssets: {} as Record<string, { amount: number; priorYearAmount: number; subsection: string; mappedAccounts: MappedData[] }>,
      currentAssets: {} as Record<string, { amount: number; priorYearAmount: number; subsection: string; mappedAccounts: MappedData[] }>,
      capitalAndReservesCreditBalances: {} as Record<string, { amount: number; priorYearAmount: number; subsection: string; mappedAccounts: MappedData[] }>,
      capitalAndReservesDebitBalances: {} as Record<string, { amount: number; priorYearAmount: number; subsection: string; mappedAccounts: MappedData[] }>,
      nonCurrentLiabilities: {} as Record<string, { amount: number; priorYearAmount: number; subsection: string; mappedAccounts: MappedData[] }>,
      currentLiabilities: {} as Record<string, { amount: number; priorYearAmount: number; subsection: string; mappedAccounts: MappedData[] }>,
    };

    // First, aggregate balances for the same SARS items
    const aggregatedBalances = mappedData.reduce((acc, item) => {
      // Only process Balance Sheet items
      if (item.section.toLowerCase() !== 'balance sheet') return acc;
      
      const key = item.sarsItem;
      if (!acc[key]) {
        acc[key] = {
          sarsItem: key,
          subsection: item.subsection,
          amount: 0,
          priorYearAmount: 0,
          mappedAccounts: []
        };
      }

      acc[key].amount += item.balance;
      acc[key].priorYearAmount += item.priorYearBalance;
      acc[key].mappedAccounts.push(item);
      return acc;
    }, {} as Record<string, { sarsItem: string; subsection: string; amount: number; priorYearAmount: number; mappedAccounts: MappedData[] }>);

    // Distribute items to their respective sections based on database subsection
    Object.values(aggregatedBalances).forEach(item => {
      const { sarsItem, subsection, amount, priorYearAmount, mappedAccounts } = item;
      const data = { amount, priorYearAmount, subsection, mappedAccounts };

      switch (subsection.toLowerCase()) {
        case 'noncurrentassets':
          balanceSheet.nonCurrentAssets[sarsItem] = data;
          break;
        case 'currentassets':
          balanceSheet.currentAssets[sarsItem] = data;
          break;
        case 'capitalandreservescreditbalances':
          // For credit balances, negative in DB means positive on BS
          balanceSheet.capitalAndReservesCreditBalances[sarsItem] = { ...data, amount: -amount, priorYearAmount: -priorYearAmount };
          break;
        case 'capitalandreservesdebitbalances':
          // For debit balances, positive in DB means negative on BS
          balanceSheet.capitalAndReservesDebitBalances[sarsItem] = { ...data, amount: -amount, priorYearAmount: -priorYearAmount };
          break;
        case 'noncurrentliabilities':
          // For liabilities, negative in DB means positive on BS
          balanceSheet.nonCurrentLiabilities[sarsItem] = { ...data, amount: -amount, priorYearAmount: -priorYearAmount };
          break;
        case 'currentliabilities':
          // For liabilities, negative in DB means positive on BS
          balanceSheet.currentLiabilities[sarsItem] = { ...data, amount: -amount, priorYearAmount: -priorYearAmount };
          break;
        default:
          balanceSheet.currentAssets[sarsItem] = data;
      }
    });

    return balanceSheet;
  }

  // Helper function to calculate section totals
  const calculateSubsectionTotal = (items: Record<string, { amount: number; priorYearAmount: number }>) => {
    const entries = Object.entries(items);
    const currentTotal = entries.reduce((sum, [, data]) => sum + data.amount, 0);
    const priorTotal = entries.reduce((sum, [, data]) => sum + data.priorYearAmount, 0);
    return { currentTotal, priorTotal };
  };

  // Calculate totals
  const calculateTotals = () => {
    if (!mappedData) return { balanceSheet: 0, incomeStatement: 0, priorYearIncomeStatement: 0 };
    
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

  const balanceSheet = transformMappedDataToBalanceSheet(mappedData);
  const totals = calculateTotals();
  
  // Calculate current year totals with proper sign handling
  const totalAssets = calculateNestedTotal(balanceSheet.nonCurrentAssets) + calculateNestedTotal(balanceSheet.currentAssets);
  const currentYearProfitLoss = totals.incomeStatement;
  
  // Calculate total capital and reserves (including current year profit/loss)
  const totalCapitalAndReserves = calculateNestedTotal(balanceSheet.capitalAndReservesCreditBalances) + 
                                 calculateNestedTotal(balanceSheet.capitalAndReservesDebitBalances) - 
                                 currentYearProfitLoss;
  
  // For liabilities, credit balances should be positive
  const totalLiabilities = calculateNestedTotal(balanceSheet.nonCurrentLiabilities) + 
                          calculateNestedTotal(balanceSheet.currentLiabilities);

  // Calculate prior year totals
  const totalPriorYearAssets = calculateNestedPriorYearTotal(balanceSheet.nonCurrentAssets) + calculateNestedPriorYearTotal(balanceSheet.currentAssets);
  const priorYearProfitLoss = totals.priorYearIncomeStatement || 0;
  
  const totalPriorYearCapitalAndReserves = calculateNestedPriorYearTotal(balanceSheet.capitalAndReservesCreditBalances) + 
                                          calculateNestedPriorYearTotal(balanceSheet.capitalAndReservesDebitBalances) - 
                                          priorYearProfitLoss;
  
  const totalPriorYearLiabilities = calculateNestedPriorYearTotal(balanceSheet.nonCurrentLiabilities) + 
                                   calculateNestedPriorYearTotal(balanceSheet.currentLiabilities);

  // Total reserves & liabilities is the sum of capital and reserves plus liabilities
  const totalReservesAndLiabilities = totalCapitalAndReserves + totalLiabilities;
  const totalPriorYearReservesAndLiabilities = totalPriorYearCapitalAndReserves + totalPriorYearLiabilities;

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const expandAll = () => {
    setExpandedSections({
      assets: true,
      capitalReserves: true,
      liabilities: true
    });
  };

  const collapseAll = () => {
    setExpandedSections({
      assets: false,
      capitalReserves: false,
      liabilities: false
    });
  };

  return (
    <>
      <RemappingModal
        isOpen={isRemappingModalOpen}
        onClose={() => setIsRemappingModalOpen(false)}
        mappedData={mappedData}
        onMappingUpdate={handleMappingUpdate}
      />
      
      <div className="space-y-4">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div 
          className="rounded-lg shadow-corporate p-3 text-white"
          style={{ background: 'linear-gradient(to bottom right, #2E5AAC, #25488A)' }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium opacity-90">Total Assets</p>
              <p className="text-xl font-bold mt-1">{formatAmount(totalAssets)}</p>
            </div>
            <div className="rounded-full p-2" style={{ backgroundColor: 'rgba(28, 54, 103, 0.5)' }}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
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
              <p className="text-xs font-medium opacity-90">Total Equity</p>
              <p className="text-xl font-bold mt-1">{formatAmount(totalCapitalAndReserves)}</p>
            </div>
            <div className="rounded-full p-2" style={{ backgroundColor: 'rgba(37, 72, 138, 0.5)' }}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
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
              <p className="text-xs font-medium opacity-90">Total Liabilities</p>
              <p className="text-xl font-bold mt-1">{formatAmount(totalLiabilities)}</p>
            </div>
            <div className="rounded-full p-2" style={{ backgroundColor: 'rgba(19, 36, 69, 0.5)' }}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
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
          <h3 className="text-base font-bold">Balance Sheet Actions</h3>
          <p className="text-xs opacity-90 mt-0.5">Bulk remap accounts to SARS items</p>
        </div>
        <button
          onClick={() => setIsRemappingModalOpen(true)}
          disabled={mappedData.length === 0}
          className="px-5 py-2.5 bg-white text-forvis-blue-900 rounded-lg hover:bg-forvis-blue-50 transition-colors flex items-center gap-2 text-sm font-bold shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Bulk Remap
        </button>
      </div>

      {/* Main Balance Sheet Card */}
      <div className="bg-white rounded-lg shadow-corporate border border-forvis-gray-200 p-4">
        <div className="space-y-3">
          {/* Header with Controls */}
          <div className="border-b border-forvis-gray-400 pb-2">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <h1 className="text-xl font-bold text-forvis-gray-900">Balance Sheet</h1>
                <span className="text-xs text-forvis-gray-500">Financial Year End</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={expandAll}
                  className="px-2 py-1 text-xs font-medium text-forvis-blue-700 bg-forvis-blue-50 hover:bg-forvis-blue-100 rounded-lg transition-colors duration-150 shadow-corporate"
                >
                  Expand All
                </button>
                <button
                  onClick={collapseAll}
                  className="px-2 py-1 text-xs font-medium text-forvis-gray-700 bg-forvis-gray-100 hover:bg-forvis-gray-200 rounded-lg transition-colors duration-150 shadow-corporate"
                >
                  Collapse All
                </button>
              </div>
            </div>
            <div className="grid grid-cols-12 text-xs font-semibold text-forvis-gray-600">
              <div className="col-span-7"></div>
              <div className="col-span-2 text-right px-3">Current Year (R)</div>
              <div className="col-span-3 text-right px-3">Prior Year (R)</div>
            </div>
          </div>

      {/* ASSETS SECTION */}
      <div className="border-2 rounded-lg overflow-hidden shadow-sm" style={{ borderColor: '#25488A' }}>
        <button
          onClick={() => toggleSection('assets')}
          className="w-full grid grid-cols-12 py-2 transition-opacity duration-150 hover:opacity-90"
          style={{ background: 'linear-gradient(to right, #2E5AAC, #25488A)' }}
        >
          <div className="col-span-7 flex items-center gap-2 px-3">
            <ChevronRight 
              className={`h-4 w-4 text-white transition-transform duration-200 ${expandedSections.assets ? 'rotate-90' : ''}`}
            />
            <span className="font-bold text-base text-white">ASSETS</span>
          </div>
          <div className="col-span-2 text-right px-3 tabular-nums font-bold text-sm text-white">
            {formatAmount(totalAssets)}
          </div>
          <div className="col-span-3 text-right px-3 tabular-nums font-bold text-sm text-white">
            {formatAmount(totalPriorYearAssets)}
          </div>
        </button>

        {expandedSections.assets && (
          <div className="bg-white">
            {/* Non-Current Assets */}
            <BalanceSheetSection
              title="Non Current Assets"
              items={Object.entries(balanceSheet.nonCurrentAssets).map(([sarsItem, data]) => ({
                sarsItem,
                amount: data.amount,
                priorYearAmount: data.priorYearAmount,
                subsection: data.subsection,
                mappedAccounts: data.mappedAccounts,
              }))}
              mappedData={mappedData}
              taskId={params.id}
              onMappingUpdate={handleMappingUpdate}
              onOpenModal={() => setIsRemappingModalOpen(true)}
            />

            {/* Current Assets */}
            <BalanceSheetSection
              title="Current Assets"
              items={Object.entries(balanceSheet.currentAssets).map(([sarsItem, data]) => ({
                sarsItem,
                amount: data.amount,
                priorYearAmount: data.priorYearAmount,
                subsection: data.subsection,
                mappedAccounts: data.mappedAccounts,
              }))}
              mappedData={mappedData}
              taskId={params.id}
              onMappingUpdate={handleMappingUpdate}
              onOpenModal={() => setIsRemappingModalOpen(true)}
            />

            {/* Total Assets */}
            <div 
              className="grid grid-cols-12 border-t-2 py-2 shadow-md"
              style={{ 
                background: 'linear-gradient(to right, #2E5AAC, #25488A)',
                borderColor: '#1C3667'
              }}
            >
              <div className="col-span-7 font-bold px-3 text-base text-white">TOTAL ASSETS</div>
              <div className="col-span-2 text-right px-3 tabular-nums font-bold text-sm text-white">
                {formatAmount(totalAssets)}
              </div>
              <div className="col-span-3 text-right px-3 tabular-nums font-bold text-sm text-white">
                {formatAmount(totalPriorYearAssets)}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* EQUITY & RESERVES SECTION */}
      <div className="border-2 rounded-lg overflow-hidden shadow-sm" style={{ borderColor: '#25488A' }}>
        <button
          onClick={() => toggleSection('capitalReserves')}
          className="w-full grid grid-cols-12 py-2 transition-opacity duration-150 hover:opacity-90"
          style={{ background: 'linear-gradient(to right, #2E5AAC, #25488A)' }}
        >
          <div className="col-span-7 flex items-center gap-2 px-3">
            <ChevronRight 
              className={`h-4 w-4 text-white transition-transform duration-200 ${expandedSections.capitalReserves ? 'rotate-90' : ''}`}
            />
            <span className="font-bold text-base text-white">EQUITY & RESERVES</span>
          </div>
          <div className="col-span-2 text-right px-3 tabular-nums font-bold text-sm text-white">
            {formatAmount(totalCapitalAndReserves)}
          </div>
          <div className="col-span-3 text-right px-3 tabular-nums font-bold text-sm text-white">
            {formatAmount(totalPriorYearCapitalAndReserves)}
          </div>
        </button>

        {expandedSections.capitalReserves && (
          <div className="bg-white">
            {/* Capital and Reserves */}
            <div 
              className="grid grid-cols-12 border-b-2 shadow-sm"
              style={{ 
                background: 'linear-gradient(to right, #5B93D7, #2E5AAC)',
                borderColor: '#25488A'
              }}
            >
              <div className="col-span-7 font-bold px-4 py-2 text-sm text-white">Capital and Reserves</div>
              <div className="col-span-2 text-right px-3 py-2 text-sm tabular-nums font-bold text-white">
                {formatAmount(calculateSubsectionTotal(balanceSheet.capitalAndReservesCreditBalances).currentTotal)}
              </div>
              <div className="col-span-3 text-right px-3 py-2 text-sm tabular-nums font-bold text-white">
                {formatAmount(calculateSubsectionTotal(balanceSheet.capitalAndReservesCreditBalances).priorTotal)}
              </div>
            </div>

            <BalanceSheetSection
              title=""
              items={Object.entries(balanceSheet.capitalAndReservesCreditBalances).map(([sarsItem, data]) => ({
                sarsItem,
                amount: data.amount,
                priorYearAmount: data.priorYearAmount,
                subsection: data.subsection,
                mappedAccounts: data.mappedAccounts,
              }))}
              mappedData={mappedData}
              taskId={params.id}
              onMappingUpdate={handleMappingUpdate}
              onOpenModal={() => setIsRemappingModalOpen(true)}
            />

            {/* Current Year Net Profit */}
            <div className="grid grid-cols-12 bg-forvis-blue-50">
              <div className="col-span-7 pl-8 py-2 text-sm flex items-center">
                <ChevronRight className="h-4 w-4 mr-2 opacity-0" />
                <span className="font-medium text-forvis-blue-900">Current Year Net Profit</span>
              </div>
              <div className="col-span-2 text-right px-4 tabular-nums text-sm font-medium text-forvis-blue-900">
                {formatAmount(-currentYearProfitLoss)}
              </div>
              <div className="col-span-3 text-right px-4 tabular-nums text-sm font-medium text-forvis-blue-700">
                {formatAmount(-priorYearProfitLoss)}
              </div>
            </div>

            {/* Total Capital and Reserves */}
            <div 
              className="grid grid-cols-12 border-t-2 shadow-md"
              style={{ 
                background: 'linear-gradient(to right, #2E5AAC, #25488A)',
                borderColor: '#1C3667'
              }}
            >
              <div className="col-span-7 pl-4 py-2 font-bold text-sm text-white">Total Capital and Reserves</div>
              <div className="col-span-2 text-right px-4 tabular-nums font-bold text-sm text-white">
                {formatAmount(totalCapitalAndReserves)}
              </div>
              <div className="col-span-3 text-right px-4 tabular-nums font-bold text-sm text-white">
                {formatAmount(totalPriorYearCapitalAndReserves)}
              </div>
            </div>

            {/* Debit Balances */}
            <div 
              className="grid grid-cols-12 border-t-2 border-b-2 shadow-sm"
              style={{ 
                background: 'linear-gradient(to right, #5B93D7, #2E5AAC)',
                borderColor: '#25488A'
              }}
            >
              <div className="col-span-7 font-bold px-4 py-2 text-sm text-white">Debit balances</div>
              <div className="col-span-2 text-right px-3 py-2 text-sm tabular-nums font-bold text-white">
                {formatAmount(calculateSubsectionTotal(balanceSheet.capitalAndReservesDebitBalances).currentTotal)}
              </div>
              <div className="col-span-3 text-right px-3 py-2 text-sm tabular-nums font-bold text-white">
                {formatAmount(calculateSubsectionTotal(balanceSheet.capitalAndReservesDebitBalances).priorTotal)}
              </div>
            </div>

            <BalanceSheetSection
              title=""
              items={Object.entries(balanceSheet.capitalAndReservesDebitBalances).map(([sarsItem, data]) => ({
                sarsItem,
                amount: data.amount,
                priorYearAmount: data.priorYearAmount,
                subsection: data.subsection,
                mappedAccounts: data.mappedAccounts,
              }))}
              mappedData={mappedData}
              taskId={params.id}
              onMappingUpdate={handleMappingUpdate}
              onOpenModal={() => setIsRemappingModalOpen(true)}
            />
          </div>
        )}
      </div>

      {/* LIABILITIES SECTION */}
      <div className="border-2 rounded-lg overflow-hidden shadow-sm" style={{ borderColor: '#25488A' }}>
        <button
          onClick={() => toggleSection('liabilities')}
          className="w-full grid grid-cols-12 py-2 transition-opacity duration-150 hover:opacity-90"
          style={{ background: 'linear-gradient(to right, #2E5AAC, #25488A)' }}
        >
          <div className="col-span-7 flex items-center gap-2 px-3">
            <ChevronRight 
              className={`h-4 w-4 text-white transition-transform duration-200 ${expandedSections.liabilities ? 'rotate-90' : ''}`}
            />
            <span className="font-bold text-base text-white">LIABILITIES</span>
          </div>
          <div className="col-span-2 text-right px-3 tabular-nums font-bold text-sm text-white">
            {formatAmount(totalLiabilities)}
          </div>
          <div className="col-span-3 text-right px-3 tabular-nums font-bold text-sm text-white">
            {formatAmount(totalPriorYearLiabilities)}
          </div>
        </button>

        {expandedSections.liabilities && (
          <div className="bg-white">
            {/* Non-Current Liabilities */}
            <div 
              className="grid grid-cols-12 border-b-2 shadow-sm"
              style={{ 
                background: 'linear-gradient(to right, #5B93D7, #2E5AAC)',
                borderColor: '#25488A'
              }}
            >
              <div className="col-span-7 font-bold px-4 py-2 text-sm text-white">Non-Current Liabilities</div>
              <div className="col-span-2 text-right px-3 py-2 text-sm tabular-nums font-bold text-white">
                {formatAmount(calculateSubsectionTotal(balanceSheet.nonCurrentLiabilities).currentTotal)}
              </div>
              <div className="col-span-3 text-right px-3 py-2 text-sm tabular-nums font-bold text-white">
                {formatAmount(calculateSubsectionTotal(balanceSheet.nonCurrentLiabilities).priorTotal)}
              </div>
            </div>

            <BalanceSheetSection
              title=""
              items={Object.entries(balanceSheet.nonCurrentLiabilities).map(([sarsItem, data]) => ({
                sarsItem,
                amount: data.amount,
                priorYearAmount: data.priorYearAmount,
                subsection: data.subsection,
                mappedAccounts: data.mappedAccounts,
              }))}
              mappedData={mappedData}
              taskId={params.id}
              onMappingUpdate={handleMappingUpdate}
              onOpenModal={() => setIsRemappingModalOpen(true)}
            />

            {/* Current Liabilities */}
            <div 
              className="grid grid-cols-12 border-t-2 border-b-2 shadow-sm"
              style={{ 
                background: 'linear-gradient(to right, #5B93D7, #2E5AAC)',
                borderColor: '#25488A'
              }}
            >
              <div className="col-span-7 font-bold px-4 py-2 text-sm text-white">Current Liabilities</div>
              <div className="col-span-2 text-right px-3 py-2 text-sm tabular-nums font-bold text-white">
                {formatAmount(calculateSubsectionTotal(balanceSheet.currentLiabilities).currentTotal)}
              </div>
              <div className="col-span-3 text-right px-3 py-2 text-sm tabular-nums font-bold text-white">
                {formatAmount(calculateSubsectionTotal(balanceSheet.currentLiabilities).priorTotal)}
              </div>
            </div>

            <BalanceSheetSection
              title=""
              items={Object.entries(balanceSheet.currentLiabilities).map(([sarsItem, data]) => ({
                sarsItem,
                amount: data.amount,
                priorYearAmount: data.priorYearAmount,
                subsection: data.subsection,
                mappedAccounts: data.mappedAccounts,
              }))}
              mappedData={mappedData}
              taskId={params.id}
              onMappingUpdate={handleMappingUpdate}
              onOpenModal={() => setIsRemappingModalOpen(true)}
            />
          </div>
        )}
      </div>

      {/* Total Reserves & Liabilities */}
      <div 
        className="grid grid-cols-12 border-2 rounded-lg py-2 shadow-md"
        style={{ 
          background: 'linear-gradient(to right, #2E5AAC, #25488A)',
          borderColor: '#1C3667'
        }}
      >
        <div className="col-span-7 font-bold px-3 text-base text-white">TOTAL EQUITY & LIABILITIES</div>
        <div className="col-span-2 text-right px-3 tabular-nums font-bold text-sm text-white">
          {formatAmount(totalReservesAndLiabilities)}
        </div>
        <div className="col-span-3 text-right px-3 tabular-nums font-bold text-sm text-white">
          {formatAmount(totalPriorYearReservesAndLiabilities)}
        </div>
      </div>

      {/* Check row */}
      <div 
        className={`grid grid-cols-12 rounded-lg py-1.5 border ${
          Math.abs(totalAssets - totalReservesAndLiabilities) < 0.01 
            ? 'bg-forvis-gray-50 border-forvis-gray-300' 
            : 'bg-red-50 border-red-300'
        }`}
      >
        <div className={`col-span-7 pl-3 text-xs font-medium ${
          Math.abs(totalAssets - totalReservesAndLiabilities) < 0.01 
            ? 'text-forvis-gray-600' 
            : 'text-red-700'
        }`}>
          Balance Check (should be zero)
        </div>
        <div className={`col-span-2 text-right px-3 text-xs tabular-nums font-semibold ${
          Math.abs(totalAssets - totalReservesAndLiabilities) < 0.01 
            ? 'text-forvis-gray-700' 
            : 'text-red-700'
        }`}>
          {formatAmount(totalAssets - totalReservesAndLiabilities)}
        </div>
        <div className={`col-span-3 text-right px-3 text-xs tabular-nums font-semibold ${
          Math.abs(totalPriorYearAssets - totalPriorYearReservesAndLiabilities) < 0.01 
            ? 'text-forvis-gray-600' 
            : 'text-red-700'
        }`}>
          {formatAmount(totalPriorYearAssets - totalPriorYearReservesAndLiabilities)}
        </div>
      </div>
        </div>
      </div>
    </div>
    </>
  );
} 