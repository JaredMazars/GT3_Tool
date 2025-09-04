'use client';

import { useState, useEffect, useRef } from 'react';
import { mappingGuide } from '@/lib/mappingGuide';
import { formatAmount } from '@/lib/formatters';
import { MappedData } from '@/types';
import { ChevronRightIcon } from '@heroicons/react/24/outline';

interface BalanceSheetSectionProps {
  title: string;
  items: Array<{
    sarsItem: string;
    subsection: string;
    amount: number;
    mappedAccounts: Array<{
      id: number;
      accountCode: string;
      accountName: string;
      subsection: string;
      balance: number;
      section: string;
      sarsItem: string;
    }>;
  }>;
  mappedData: MappedData[];
  projectId: string;
  onMappingUpdate: (accountId: number, newSarsItem: string) => Promise<void>;
}

interface SarsItem {
  sarsItem: string;
}

interface CustomSelectProps {
  value: string;
  onChange: (value: string, section: string, subsection: string) => void;
  disabled?: boolean;
  section: string;
}

const subsectionDisplayNames: Record<string, string> = {
  nonCurrentAssets: 'Non-Current Assets',
  currentAssets: 'Current Assets',
  capitalAndReservesCreditBalances: 'Capital & Reserves (Credit)',
  capitalAndReservesDebitBalances: 'Capital & Reserves (Debit)',
  nonCurrentLiabilities: 'Non-Current Liabilities',
  currentLiabilities: 'Current Liabilities'
};

function CustomSelect({ value, onChange, disabled }: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchTerm('');
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen]);

  const selectedLabel = value || 'Select SARS Item';

  // Filter items based on search term and section
  const filteredItems = Object.entries(mappingGuide.balanceSheet).reduce((acc, [subsection, items]) => {
    const filteredItems = items.filter(item =>
      item.sarsItem.toLowerCase().includes(searchTerm.toLowerCase())
    );
    if (filteredItems.length > 0) {
      acc[subsection] = filteredItems;
    }
    return acc;
  }, {} as Record<string, SarsItem[]>);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        disabled={disabled}
        className="w-full rounded-md border-0 py-1 pl-2 pr-8 text-left text-xs text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <span className="block truncate">{selectedLabel}</span>
        <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-1.5">
          <svg className="h-4 w-4 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 3a1 1 0 01.707.293l3 3a1 1 0 01-1.414 1.414L10 5.414 7.707 7.707a1 1 0 01-1.414-1.414l3-3A1 1 0 0110 3zm-3.707 9.293a1 1 0 011.414 0L10 14.586l2.293-2.293a1 1 0 011.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </span>
      </button>
      {isOpen && (
        <div className="absolute left-0 z-10 mt-1 w-[400px] bg-white shadow-lg ring-1 ring-black ring-opacity-5 rounded-md focus:outline-none">
          <div className="sticky top-0 z-30 bg-white border-b border-gray-200">
            <div className="p-2">
              <div className="text-sm font-medium text-gray-900">Select SARS Item</div>
              <div className="text-xs text-gray-500 mt-0.5">Balance Sheet Items</div>
              <div className="mt-2 relative">
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search items..."
                  className="w-full rounded-md border-0 py-1 pl-7 pr-2 text-xs text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-blue-600"
                />
                <svg className="absolute left-2 top-1.5 h-3.5 w-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>
          </div>
          
          <div className="overflow-y-auto max-h-[300px]">
            {Object.entries(filteredItems).map(([subsection, items]) => (
              <div key={subsection}>
                <div className="sticky top-0 z-10 bg-gray-50 px-2 py-1 border-b border-gray-200">
                  <div className="text-xs font-medium text-gray-900">
                    {subsectionDisplayNames[subsection] || subsection}
                  </div>
                </div>
                <div className="divide-y divide-gray-100">
                  {items.map((item) => (
                    <button
                      key={item.sarsItem}
                      type="button"
                      onClick={() => {
                        onChange(item.sarsItem, 'Balance Sheet', subsection);
                        setIsOpen(false);
                        setSearchTerm('');
                      }}
                      className={`w-full px-2 py-1.5 text-left text-xs hover:bg-gray-50 focus:bg-gray-50 focus:outline-none ${
                        value === item.sarsItem
                          ? 'bg-blue-50 text-blue-900 font-medium'
                          : 'text-gray-700'
                      }`}
                    >
                      {item.sarsItem}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function BalanceSheetSection({ title, items, onMappingUpdate }: BalanceSheetSectionProps) {
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({});
  const [updatingAccount, setUpdatingAccount] = useState<number | null>(null);

  // Filter out items with zero amount
  const nonZeroItems = items.filter(item => item.amount !== 0);
  const totalAmount = nonZeroItems.reduce((sum, item) => sum + item.amount, 0);
  const isNegative = totalAmount < 0;

  const toggleItem = (sarsItem: string) => {
    setExpandedItems(prev => ({
      ...prev,
      [sarsItem]: !prev[sarsItem]
    }));
  };

  const handleMappingChange = async (accountId: number, newSarsItem: string) => {
    try {
      setUpdatingAccount(accountId);
      await onMappingUpdate(accountId, newSarsItem);
    } finally {
      setUpdatingAccount(null);
    }
  };

  if (nonZeroItems.length === 0) return null;

  return (
    <div>
      {/* Section header */}
      <div className="grid grid-cols-12 border-b border-gray-200">
        <div className="col-span-9 font-semibold px-4 py-1">{title}</div>
        <div className="col-span-3 text-right px-4 tabular-nums font-semibold">
          {isNegative 
            ? `(${formatAmount(Math.abs(totalAmount))})` 
            : formatAmount(totalAmount)}
        </div>
      </div>

      {/* SARS Items */}
      <div className="divide-y divide-gray-100">
        {nonZeroItems.map((item, index) => (
          <div key={index}>
            <div 
              className="grid grid-cols-12 cursor-pointer hover:bg-gray-50"
              onClick={() => toggleItem(item.sarsItem)}
            >
              <div className="col-span-9 pl-8 py-2 text-sm flex items-center">
                <ChevronRightIcon 
                  className={`h-4 w-4 mr-2 transition-transform ${expandedItems[item.sarsItem] ? 'rotate-90' : ''}`}
                />
                {item.sarsItem}
              </div>
              <div className={`col-span-3 text-right px-4 py-2 text-sm tabular-nums ${item.amount < 0 ? 'text-red-600' : ''}`}>
                {item.amount !== 0 && (item.amount < 0 
                  ? `(${formatAmount(Math.abs(item.amount))})` 
                  : formatAmount(item.amount))}
              </div>
            </div>

            {/* Expanded account details */}
            {expandedItems[item.sarsItem] && (
              <div className="bg-gray-50 border-t border-gray-200">
                <div className="px-4 py-2 border-b border-gray-200 bg-gray-100">
                  <div className="text-xs font-medium text-gray-500">Mapped Accounts</div>
                </div>
                {item.mappedAccounts.map((account) => (
                  <div 
                    key={account.id} 
                    className="grid grid-cols-12 px-10 py-2 text-sm hover:bg-gray-100 border-b border-gray-200 last:border-b-0"
                  >
                    <div className="col-span-2 text-gray-500">{account.accountCode}</div>
                    <div className="col-span-4">
                      <div className="text-gray-900">{account.accountName}</div>
                    </div>
                    <div className="col-span-3">
                      {updatingAccount === account.id ? (
                        <div className="animate-pulse text-xs text-gray-500">Updating...</div>
                      ) : (
                        <CustomSelect
                          value={account.sarsItem}
                          onChange={(newSarsItem) => 
                            handleMappingChange(account.id, newSarsItem)
                          }
                          section="Balance Sheet"
                        />
                      )}
                    </div>
                    <div className={`col-span-3 text-right tabular-nums ${account.balance < 0 ? 'text-red-600' : ''}`}>
                      {account.balance < 0 
                        ? `(${formatAmount(Math.abs(account.balance))})` 
                        : formatAmount(account.balance)}
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

export default function BalanceSheetPage({ params }: { params: { id: string } }) {
  const [mappedData, setMappedData] = useState<MappedData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);


  // Fetch mapped data
  useEffect(() => {
    async function fetchMappedData() {
      try {
        const response = await fetch(`/api/projects/${params.id}/mapped-accounts`);
        if (!response.ok) {
          throw new Error('Failed to fetch mapped data');
        }
        const data = await response.json();
        setMappedData(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setIsLoading(false);
      }
    }

    fetchMappedData();
  }, [params.id]);

  const handleMappingUpdate = async (accountId: number, newSarsItem: string) => {
    try {
      const response = await fetch(`/api/projects/${params.id}/mapped-accounts/${accountId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sarsItem: newSarsItem }),
      });

      if (!response.ok) {
        throw new Error('Failed to update mapping');
      }

      // Refresh data
      const updatedData = await fetch(`/api/projects/${params.id}/mapped-accounts`).then(res => res.json());
      setMappedData(updatedData);
    } catch (error) {
      console.error('Error updating mapping:', error);
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

  function transformMappedDataToBalanceSheet(mappedData: MappedData[]) {
    // Initialize balance sheet structure
    const balanceSheet = {
      nonCurrentAssets: {} as Record<string, { amount: number; subsection: string; mappedAccounts: MappedData[] }>,
      currentAssets: {} as Record<string, { amount: number; subsection: string; mappedAccounts: MappedData[] }>,
      capitalAndReservesCreditBalances: {} as Record<string, { amount: number; subsection: string; mappedAccounts: MappedData[] }>,
      capitalAndReservesDebitBalances: {} as Record<string, { amount: number; subsection: string; mappedAccounts: MappedData[] }>,
      nonCurrentLiabilities: {} as Record<string, { amount: number; subsection: string; mappedAccounts: MappedData[] }>,
      currentLiabilities: {} as Record<string, { amount: number; subsection: string; mappedAccounts: MappedData[] }>,
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
          mappedAccounts: []
        };
      }

      acc[key].amount += item.balance;
      acc[key].mappedAccounts.push(item);
      return acc;
    }, {} as Record<string, { sarsItem: string; subsection: string; amount: number; mappedAccounts: MappedData[] }>);

    // Distribute items to their respective sections based on database subsection
    Object.values(aggregatedBalances).forEach(item => {
      const { sarsItem, subsection, amount, mappedAccounts } = item;
      const data = { amount, subsection, mappedAccounts };

      switch (subsection.toLowerCase()) {
        case 'noncurrentassets':
          balanceSheet.nonCurrentAssets[sarsItem] = data;
          break;
        case 'currentassets':
          balanceSheet.currentAssets[sarsItem] = data;
          break;
        case 'capitalandreservescreditbalances':
          // For credit balances, negative in DB means positive on BS
          balanceSheet.capitalAndReservesCreditBalances[sarsItem] = { ...data, amount: -amount };
          break;
        case 'capitalandreservesdebitbalances':
          // For debit balances, positive in DB means negative on BS
          balanceSheet.capitalAndReservesDebitBalances[sarsItem] = { ...data, amount: -amount };
          break;
        case 'noncurrentliabilities':
          // For liabilities, negative in DB means positive on BS
          balanceSheet.nonCurrentLiabilities[sarsItem] = { ...data, amount: -amount };
          break;
        case 'currentliabilities':
          // For liabilities, negative in DB means positive on BS
          balanceSheet.currentLiabilities[sarsItem] = { ...data, amount: -amount };
          break;
        default:
          console.warn(`Unknown subsection: ${subsection} for SARS item: ${sarsItem}`);
          balanceSheet.currentAssets[sarsItem] = data;
      }
    });

    return balanceSheet;
  }

  // Calculate totals
  const calculateTotals = () => {
    if (!mappedData) return { balanceSheet: 0, incomeStatement: 0 };
    
    return mappedData.reduce((acc, item) => {
      const isBalanceSheet = item.section.toLowerCase() === 'balance sheet';
      const isIncomeStatement = item.section.toLowerCase() === 'income statement';
      
      if (isBalanceSheet) {
        acc.balanceSheet += item.balance;
      } else if (isIncomeStatement) {
        acc.incomeStatement += item.balance;
      }
      return acc;
    }, { balanceSheet: 0, incomeStatement: 0 });
  };

  if (isLoading) {
    return <div className="flex justify-center items-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
    </div>;
  }

  if (error) {
    return <div className="bg-red-50 border border-red-200 rounded-lg p-4">
      <p className="text-sm text-red-600">{error}</p>
    </div>;
  }

  if (mappedData.length === 0) {
    return (
      <div className="text-gray-500 text-center py-8">
        No mapped data available. Upload a trial balance to get started.
      </div>
    );
  }

  const balanceSheet = transformMappedDataToBalanceSheet(mappedData);
  const totals = calculateTotals();
  
  // Calculate totals with proper sign handling
  const totalAssets = calculateNestedTotal(balanceSheet.nonCurrentAssets) + calculateNestedTotal(balanceSheet.currentAssets);
  const currentYearProfitLoss = totals.incomeStatement;
  
  // Calculate total capital and reserves (including current year profit/loss)
  const totalCapitalAndReserves = calculateNestedTotal(balanceSheet.capitalAndReservesCreditBalances) + 
                                 calculateNestedTotal(balanceSheet.capitalAndReservesDebitBalances) - 
                                 currentYearProfitLoss;
  
  // For liabilities, credit balances should be positive
  const totalLiabilities = calculateNestedTotal(balanceSheet.nonCurrentLiabilities) + 
                          calculateNestedTotal(balanceSheet.currentLiabilities);

  // Total reserves & liabilities is the sum of capital and reserves plus liabilities
  const totalReservesAndLiabilities = totalCapitalAndReserves + totalLiabilities;

  return (
    <div className="space-y-2 p-8">
      {/* Header */}
      <div className="grid grid-cols-12 mb-4">
        <div className="col-span-9"></div>
        <div className="col-span-3 text-center font-semibold">R</div>
      </div>

      {/* Balance Sheet Title */}
      <div className="grid grid-cols-12">
        <div className="col-span-9 font-bold">Balance Sheet</div>
        <div className="col-span-3"></div>
      </div>

      {/* Non-Current Assets */}
      <BalanceSheetSection
        title="Non Current Assets"
        items={Object.entries(balanceSheet.nonCurrentAssets).map(([sarsItem, data]) => ({
          sarsItem,
          amount: data.amount,
          subsection: data.subsection,
          mappedAccounts: data.mappedAccounts,
        }))}
        mappedData={mappedData}
        projectId={params.id}
        onMappingUpdate={handleMappingUpdate}
      />

      {/* Current Assets */}
      <BalanceSheetSection
        title="Current Assets"
        items={Object.entries(balanceSheet.currentAssets).map(([sarsItem, data]) => ({
          sarsItem,
          amount: data.amount,
          subsection: data.subsection,
          mappedAccounts: data.mappedAccounts,
        }))}
        mappedData={mappedData}
        projectId={params.id}
        onMappingUpdate={handleMappingUpdate}
      />

      {/* Total Assets */}
      <div className="grid grid-cols-12 border-t border-b border-gray-200 py-1">
        <div className="col-span-9 font-bold">TOTAL ASSETS</div>
        <div className="col-span-3 text-right px-4 tabular-nums font-bold">
          {formatAmount(totalAssets)}
        </div>
      </div>

      {/* Capital and Reserves */}
      <div className="grid grid-cols-12 mt-4">
        <div className="col-span-9 font-bold">Capital and Reserves</div>
        <div className="col-span-3"></div>
      </div>

      <BalanceSheetSection
        title=""
        items={Object.entries(balanceSheet.capitalAndReservesCreditBalances).map(([sarsItem, data]) => ({
          sarsItem,
          amount: data.amount,
          subsection: data.subsection,
          mappedAccounts: data.mappedAccounts,
        }))}
        mappedData={mappedData}
        projectId={params.id}
        onMappingUpdate={handleMappingUpdate}
      />

      {/* Current Year Net Profit */}
      <div className="grid grid-cols-12">
        <div className="col-span-9 pl-8 py-2 text-sm flex items-center">
          <ChevronRightIcon className="h-4 w-4 mr-2 opacity-0" />
          Current Year Net Profit
        </div>
        <div className="col-span-3 text-right px-4 tabular-nums text-sm">
          {formatAmount(-currentYearProfitLoss)}
        </div>
      </div>

      {/* Total Capital and Reserves */}
      <div className="grid grid-cols-12 border-t border-gray-200">
        <div className="col-span-9 pl-4 py-1 font-semibold">Total Capital and Reserves</div>
        <div className="col-span-3 text-right px-4 tabular-nums font-semibold">
          {formatAmount(
            calculateNestedTotal(balanceSheet.capitalAndReservesCreditBalances) + 
            calculateNestedTotal(balanceSheet.capitalAndReservesDebitBalances) - 
            currentYearProfitLoss
          )}
        </div>
      </div>

      {/* Debit Balances */}
      <div className="grid grid-cols-12 mt-4">
        <div className="col-span-9 font-bold">Debit balances</div>
        <div className="col-span-3"></div>
      </div>

      <BalanceSheetSection
        title=""
        items={Object.entries(balanceSheet.capitalAndReservesDebitBalances).map(([sarsItem, data]) => ({
          sarsItem,
          amount: data.amount,
          subsection: data.subsection,
          mappedAccounts: data.mappedAccounts,
        }))}
        mappedData={mappedData}
        projectId={params.id}
        onMappingUpdate={handleMappingUpdate}
      />

      {/* Non-Current Liabilities */}
      <div className="grid grid-cols-12 mt-4">
        <div className="col-span-9 font-bold">Non-Current Liabilities</div>
        <div className="col-span-3"></div>
      </div>

      <BalanceSheetSection
        title=""
        items={Object.entries(balanceSheet.nonCurrentLiabilities).map(([sarsItem, data]) => ({
          sarsItem,
          amount: data.amount,
          subsection: data.subsection,
          mappedAccounts: data.mappedAccounts,
        }))}
        mappedData={mappedData}
        projectId={params.id}
        onMappingUpdate={handleMappingUpdate}
      />

      {/* Current Liabilities */}
      <div className="grid grid-cols-12 mt-4">
        <div className="col-span-9 font-bold">Current Liabilities</div>
        <div className="col-span-3"></div>
      </div>

      <BalanceSheetSection
        title=""
        items={Object.entries(balanceSheet.currentLiabilities).map(([sarsItem, data]) => ({
          sarsItem,
          amount: data.amount,
          subsection: data.subsection,
          mappedAccounts: data.mappedAccounts,
        }))}
        mappedData={mappedData}
        projectId={params.id}
        onMappingUpdate={handleMappingUpdate}
      />

      {/* Total Reserves & Liabilities */}
      <div className="grid grid-cols-12 border-t border-b border-gray-200 py-1">
        <div className="col-span-9 font-bold">TOTAL RESERVES & LIABILITIES</div>
        <div className="col-span-3 text-right px-4 tabular-nums font-bold">
          {formatAmount(totalReservesAndLiabilities)}
        </div>
      </div>

      {/* Check row */}
      <div className="grid grid-cols-12">
        <div className="col-span-9 pl-4">Check (should be nil)</div>
        <div className="col-span-3 text-right px-4 tabular-nums">
          {formatAmount(totalAssets - totalReservesAndLiabilities)}
        </div>
      </div>
    </div>
  );
} 