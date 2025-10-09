'use client';

import { useState, useEffect, useRef } from 'react';
import { mappingGuide } from '@/lib/mappingGuide';
import { formatAmount } from '@/lib/formatters';
import { MappedData } from '@/types';
import { ChevronRightIcon } from '@heroicons/react/24/outline';


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
  grossProfitOrLoss: 'Gross Profit/Loss',
  incomeItemsCreditAmounts: 'Income Items (Credit)',
  expenseItemsDebitAmounts: 'Expense Items (Debit)',
  incomeItemsOnlyCreditAmounts: 'Income Items (Credit Only)'
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
  const filteredItems = Object.entries(mappingGuide.incomeStatement).reduce((acc, [subsection, items]) => {
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
              <div className="text-xs text-gray-500 mt-0.5">Income Statement Items</div>
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
                        onChange(item.sarsItem, 'Income Statement', subsection);
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


export default function IncomeStatementPage({ params }: { params: { id: string } }) {
  const [mappedData, setMappedData] = useState<MappedData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({});
  const [updatingAccount, setUpdatingAccount] = useState<number | null>(null);

  // Fetch mapped data
  useEffect(() => {
    async function fetchMappedData() {
      try {
        const response = await fetch(`/api/projects/${params.id}/mapped-accounts`);
        if (!response.ok) {
          throw new Error('Failed to fetch mapped data');
        }
        const data = await response.json();
        // Filter only Income Statement items
        const incomeStatementItems = data.filter((item: { sarsItem: string }) => {
          return Object.values(mappingGuide.incomeStatement).flat().some(
            guide => guide.sarsItem === item.sarsItem
          );
        });
        setMappedData(incomeStatementItems);
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
      setUpdatingAccount(accountId);
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
      // Filter only Income Statement items
      const incomeStatementItems = updatedData.filter((item: { sarsItem: string }) => {
        return Object.values(mappingGuide.incomeStatement).flat().some(
          guide => guide.sarsItem === item.sarsItem
        );
      });
      setMappedData(incomeStatementItems);
    } catch (error) {
      console.error('Error updating mapping:', error);
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
    return mappedData.filter(item => item.sarsItem === sarsItem && item.balance !== 0);
  };

  const renderSection = (title: string, _subsection: string, items: [string, number][], color: string = 'gray') => {
    if (items.length === 0) return null;
    
    const colorClasses = {
      green: 'bg-green-50 text-green-900 border-green-200',
      red: 'bg-red-50 text-red-900 border-red-200',
      blue: 'bg-blue-50 text-blue-900 border-blue-200',
      gray: 'bg-gray-50 text-gray-900 border-gray-200'
    }[color];
    
    return (
      <div className="space-y-0.5">
        {title && (
          <div className={`text-xs font-semibold px-3 py-1 rounded-t-lg border-t border-x ${colorClasses}`}>
            {title}
          </div>
        )}
        {items.map(([sarsItem, balance]) => (
          <div key={sarsItem} className="group">
            <div 
              className="grid grid-cols-12 cursor-pointer hover:bg-blue-50 transition-colors duration-150"
              onClick={() => toggleItem(sarsItem)}
            >
              <div className="col-span-9 pl-4 py-1.5 flex items-center gap-2">
                <ChevronRightIcon 
                  className={`h-3.5 w-3.5 text-gray-500 group-hover:text-blue-600 transition-all duration-200 ${expandedItems[sarsItem] ? 'rotate-90' : ''}`}
                />
                <span className="group-hover:text-blue-900 text-xs">{sarsItem}</span>
              </div>
              <div className="col-span-3 text-right px-3 py-1.5 tabular-nums font-medium text-xs">
                {formatAmount(Math.abs(balance))}
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
      <div className="pl-6 pr-3 py-1.5 bg-gradient-to-r from-blue-50 to-indigo-50 border-t border-blue-200 border-b border-blue-200">
        <div className="px-3 py-1 mb-1 border-b border-blue-300 bg-gradient-to-r from-blue-100 to-indigo-100 rounded-t">
          <div className="text-xs font-semibold text-blue-900 uppercase tracking-wide">Mapped Accounts</div>
        </div>
        <div className="space-y-0.5">
          {accounts.map((account, accIndex) => (
            <div 
              key={account.id} 
              className={`grid grid-cols-12 text-xs items-center py-1.5 px-2 rounded hover:bg-blue-100 transition-colors duration-150 ${
                accIndex % 2 === 0 ? 'bg-white bg-opacity-40' : 'bg-blue-50 bg-opacity-60'
              }`}
            >
              <div className="col-span-1 text-gray-600 font-medium">{account.accountCode}</div>
              <div className="col-span-3 truncate font-medium">{account.accountName}</div>
              <div className="col-span-2 text-gray-500 text-xs truncate">{subsectionName}</div>
              <div className="col-span-4">
                {updatingAccount === account.id ? (
                  <div className="flex items-center gap-2 text-blue-600">
                    <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600"></div>
                    <span className="text-xs">Updating...</span>
                  </div>
                ) : (
                  <CustomSelect
                    value={account.sarsItem}
                    onChange={(newSarsItem) => handleMappingUpdate(account.id, newSarsItem)}
                    section="Income Statement"
                  />
                )}
              </div>
              <div className={`col-span-2 text-right tabular-nums font-semibold ${account.balance < 0 ? 'text-red-600' : 'text-gray-900'}`}>
                {account.balance < 0 ? `(${formatAmount(Math.abs(account.balance))})` : formatAmount(account.balance)}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
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

  // Transform and aggregate data
  const aggregatedData = mappedData.reduce((acc, item) => {
    if (!acc[item.sarsItem]) {
      acc[item.sarsItem] = 0;
    }
    acc[item.sarsItem] += item.balance;
    return acc;
  }, {} as Record<string, number>);

  // Calculate section totals - using absolute values
  const totalIncome = Object.entries(aggregatedData)
    .filter(([sarsItem]) => sarsItem.includes('Sales'))
    .reduce((sum, [, balance]) => sum + Math.abs(balance), 0);

  // For Cost of Sales, keep the original sign from the sum of accounts
  const costOfSales = Object.entries(aggregatedData)
    .filter(([sarsItem]) => sarsItem.includes('Purchases') || sarsItem.includes('stock'))
    .reduce((sum, [, balance]) => sum + balance, 0);

  // Gross profit = Total Income - Cost of Sales
  const grossProfit = totalIncome - costOfSales;

  const otherIncome = Object.entries(aggregatedData)
    .filter(([sarsItem, balance]) => !sarsItem.includes('Sales') && !sarsItem.includes('Purchases') && !sarsItem.includes('stock') && balance < 0)
    .reduce((sum, [, balance]) => sum + Math.abs(balance), 0);

  const expenses = Object.entries(aggregatedData)
    .filter(([sarsItem, balance]) => !sarsItem.includes('Sales') && !sarsItem.includes('Purchases') && !sarsItem.includes('stock') && balance > 0)
    .reduce((sum, [, balance]) => sum + Math.abs(balance), 0);

  // Net profit = Gross Profit + Other Income - Expenses
  const netProfitBeforeTax = grossProfit + otherIncome - expenses;

  // Calculate total of all income statement items for verification
  const totalOfAllItems = Object.values(aggregatedData).reduce((sum, balance) => sum + balance, 0);

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg shadow-lg p-3 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-100 text-xs font-medium">Total Income</p>
              <p className="text-xl font-bold mt-1">{formatAmount(totalIncome)}</p>
            </div>
            <div className="bg-green-400 bg-opacity-30 rounded-full p-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg shadow-lg p-3 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-xs font-medium">Gross Profit</p>
              <p className="text-xl font-bold mt-1">{formatAmount(grossProfit)}</p>
            </div>
            <div className="bg-blue-400 bg-opacity-30 rounded-full p-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-lg shadow-lg p-3 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-red-100 text-xs font-medium">Total Expenses</p>
              <p className="text-xl font-bold mt-1">{formatAmount(expenses)}</p>
            </div>
            <div className="bg-red-400 bg-opacity-30 rounded-full p-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
              </svg>
            </div>
          </div>
        </div>

        <div className={`bg-gradient-to-br ${netProfitBeforeTax >= 0 ? 'from-purple-500 to-purple-600' : 'from-gray-500 to-gray-600'} rounded-lg shadow-lg p-3 text-white`}>
          <div className="flex items-center justify-between">
            <div>
              <p className={`${netProfitBeforeTax >= 0 ? 'text-purple-100' : 'text-gray-100'} text-xs font-medium`}>Net Profit</p>
              <p className="text-xl font-bold mt-1">{formatAmount(netProfitBeforeTax)}</p>
            </div>
            <div className={`${netProfitBeforeTax >= 0 ? 'bg-purple-400' : 'bg-gray-400'} bg-opacity-30 rounded-full p-2`}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Action Bar */}
      <div className="flex items-center justify-end bg-white rounded-lg shadow-sm border border-gray-200 p-3">
        <a
          href={`/dashboard/projects/${params.id}/tax-calculation`}
          className="px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 text-xs shadow-md hover:shadow-lg"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
          Generate Tax Adjustments
        </a>
      </div>

      {/* Main Income Statement Card */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="space-y-3">
          <div className="flex items-center justify-between border-b border-gray-400 pb-2">
            <h1 className="text-xl font-bold text-gray-900">INCOME STATEMENT</h1>
            <div className="text-right font-semibold text-gray-700">R</div>
          </div>

        {/* REVENUE SECTION */}
        <div className="border border-green-200 rounded-lg overflow-hidden">
          <div className="grid grid-cols-12 font-bold bg-gradient-to-r from-green-100 to-green-200 py-1.5">
            <div className="col-span-9 px-3 text-sm text-green-900">REVENUE & SALES</div>
            <div className="col-span-3 text-right px-3 text-xs tabular-nums text-green-900">
              {formatAmount(totalIncome)}
            </div>
          </div>

          <div className="bg-white p-3">
            {renderSection("Sales Revenue", "grossProfitOrLoss", 
              Object.entries(aggregatedData)
                .filter(([sarsItem]) => sarsItem.includes('Sales'))
                .map(([sarsItem, balance]) => [sarsItem, Math.abs(balance)]),
              'green'
            )}

            <div className="grid grid-cols-12 mt-2 italic bg-green-50 py-1.5 rounded border border-green-200">
              <div className="col-span-9 px-3 text-xs text-green-900 font-medium">Turnover per Annual Financial Statements</div>
              <div className="col-span-3 text-right px-3 text-xs tabular-nums text-green-900 font-semibold">
                {formatAmount(totalIncome)}
              </div>
            </div>
          </div>
        </div>

        {/* COST OF SALES SECTION */}
        <div className="border border-red-200 rounded-lg overflow-hidden">
          <div className="grid grid-cols-12 font-bold bg-gradient-to-r from-red-100 to-red-200 py-1.5">
            <div className="col-span-9 px-3 text-sm text-red-900">COST OF SALES</div>
            <div className={`col-span-3 text-right px-3 text-xs tabular-nums text-red-900`}>
              {formatAmount(costOfSales)}
            </div>
          </div>

          <div className="bg-white p-3">
            {renderSection("Direct Costs", "grossProfitOrLoss", 
              Object.entries(aggregatedData)
                .filter(([sarsItem]) => sarsItem.includes('Purchases') || sarsItem.includes('stock'))
                .map(([sarsItem, balance]) => [sarsItem, Math.abs(balance)]),
              'red'
            )}
          </div>
        </div>

        {/* GROSS PROFIT/LOSS */}
        <div className={`grid grid-cols-12 font-bold border rounded-lg py-2 ${
          grossProfit >= 0 
            ? 'bg-gradient-to-r from-blue-100 to-blue-200 border-blue-300' 
            : 'bg-gradient-to-r from-gray-100 to-gray-200 border-gray-300'
        }`}>
          <div className={`col-span-9 px-3 text-sm ${grossProfit >= 0 ? 'text-blue-900' : 'text-gray-900'}`}>GROSS PROFIT / (LOSS)</div>
          <div className={`col-span-3 text-right px-3 text-xs tabular-nums ${grossProfit >= 0 ? 'text-blue-900' : 'text-gray-900'}`}>
            {formatAmount(grossProfit)}
          </div>
        </div>

        {/* OTHER INCOME SECTION */}
        <div className="border border-green-200 rounded-lg overflow-hidden">
          <div className="grid grid-cols-12 font-bold bg-gradient-to-r from-green-50 to-green-100 py-1.5">
            <div className="col-span-9 px-3 text-sm text-green-900">OTHER INCOME</div>
            <div className="col-span-3 text-right px-3 text-xs tabular-nums text-green-900">
              {formatAmount(otherIncome)}
            </div>
          </div>

          <div className="bg-white p-3">
            {renderSection("Income Items", "incomeItemsOnlyCreditAmounts", 
              Object.entries(aggregatedData)
                .filter(([sarsItem, val]) => !sarsItem.includes('Sales') && !sarsItem.includes('Purchases') && !sarsItem.includes('stock') && val < 0)
                .map(([sarsItem, balance]) => [sarsItem, Math.abs(balance)]),
              'green'
            )}
          </div>
        </div>

        {/* EXPENSES SECTION */}
        <div className="border border-red-200 rounded-lg overflow-hidden">
          <div className="grid grid-cols-12 font-bold bg-gradient-to-r from-red-100 to-red-200 py-1.5">
            <div className="col-span-9 px-3 text-sm text-red-900">OPERATING EXPENSES</div>
            <div className="col-span-3 text-right px-3 text-xs tabular-nums text-red-900">
              {formatAmount(expenses)}
            </div>
          </div>

          <div className="bg-white p-3">
            {renderSection("Expense Items", "expenseItemsDebitAmounts", 
              Object.entries(aggregatedData)
                .filter(([sarsItem, val]) => !sarsItem.includes('Sales') && !sarsItem.includes('Purchases') && !sarsItem.includes('stock') && val > 0)
                .map(([sarsItem, balance]) => [sarsItem, Math.abs(balance)]),
              'red'
            )}
          </div>
        </div>

        {/* NET PROFIT/LOSS BEFORE TAX */}
        <div className={`grid grid-cols-12 font-bold border rounded-lg py-2 ${
          netProfitBeforeTax >= 0 
            ? 'bg-gradient-to-r from-purple-100 to-purple-200 border-purple-300' 
            : 'bg-gradient-to-r from-gray-100 to-gray-200 border-gray-300'
        }`}>
          <div className={`col-span-9 px-3 text-base ${netProfitBeforeTax >= 0 ? 'text-purple-900' : 'text-gray-900'}`}>NET PROFIT / (LOSS) BEFORE TAX</div>
          <div className={`col-span-3 text-right px-3 text-sm tabular-nums ${netProfitBeforeTax >= 0 ? 'text-purple-900' : 'text-gray-900'}`}>
            {formatAmount(netProfitBeforeTax)}
          </div>
        </div>

        {/* Verification total */}
        <div className="grid grid-cols-12 text-xs bg-gray-50 border border-gray-300 rounded-lg py-1.5">
          <div className="col-span-9 px-3 text-gray-600">Total of all items (for verification)</div>
          <div className="col-span-3 text-right px-3 tabular-nums text-gray-700 font-medium">
            {formatAmount(Math.abs(totalOfAllItems))}
          </div>
        </div>
        </div>
      </div>
    </div>
  );
} 