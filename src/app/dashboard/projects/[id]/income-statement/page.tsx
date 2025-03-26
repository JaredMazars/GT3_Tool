'use client';

import { useState, useEffect, useRef } from 'react';
import { mappingGuide } from '@/lib/mappingGuide';
import { formatAmount } from '@/lib/formatters';
import { MappedData } from '@/types';
import { ChevronRightIcon } from '@heroicons/react/24/outline';

interface IncomeStatementSectionProps {
  title: string;
  items: { sarsItem: string; balance: number }[];
  mappedData: MappedData[];
  projectId: string;
  onMappingUpdate: (accountId: number, newSarsItem: string) => Promise<void>;
  showTotal?: boolean;
  isSubtotal?: boolean;
  isGrossProfit?: boolean;
  isNetProfit?: boolean;
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
  grossProfitOrLoss: 'Gross Profit/Loss',
  incomeItemsCreditAmounts: 'Income Items (Credit)',
  expenseItemsDebitAmounts: 'Expense Items (Debit)',
  incomeItemsOnlyCreditAmounts: 'Income Items (Credit Only)'
};

function CustomSelect({ value, onChange, disabled, section }: CustomSelectProps) {
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

function IncomeStatementSection({ 
  title, 
  items, 
  mappedData,
  projectId,
  onMappingUpdate,
  showTotal = true,
  isSubtotal = false,
  isGrossProfit = false,
  isNetProfit = false
}: IncomeStatementSectionProps) {
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({});
  const [updatingAccount, setUpdatingAccount] = useState<number | null>(null);

  const total = items.reduce((sum, item) => sum + item.balance, 0);

  const toggleItem = (sarsItem: string) => {
    setExpandedItems(prev => ({
      ...prev,
      [sarsItem]: !prev[sarsItem]
    }));
  };

  const getMappedAccounts = (sarsItem: string) => {
    return mappedData.filter(item => item.sarsItem === sarsItem && item.balance !== 0);
  };

  const handleMappingChange = async (accountId: number, newSarsItem: string) => {
    try {
      setUpdatingAccount(accountId);
      await onMappingUpdate(accountId, newSarsItem);
    } finally {
      setUpdatingAccount(null);
    }
  };

  const renderMappedAccounts = (sarsItem: string) => {
    if (!expandedItems[sarsItem]) return null;

    const accounts = getMappedAccounts(sarsItem);
    if (accounts.length === 0) return null;

    // Find the subsection for this SARS item
    const subsectionEntry = Object.entries(mappingGuide.incomeStatement).find(([_, items]) =>
      items.some(item => item.sarsItem === sarsItem)
    );
    
    const subsectionName = subsectionEntry 
      ? subsectionDisplayNames[subsectionEntry[0]] || subsectionEntry[0]
      : '';

    return (
      <div className="pl-8 pr-4 py-2 bg-gray-50 border-t border-b border-gray-200">
        <div className="space-y-1">
          {accounts.map((account) => (
            <div key={account.id} className="grid grid-cols-12 text-sm items-center">
              <div className="col-span-1 text-gray-500">{account.accountCode}</div>
              <div className="col-span-3 truncate">{account.accountName}</div>
              <div className="col-span-2 text-gray-500 text-xs truncate">{subsectionName}</div>
              <div className="col-span-4">
                {updatingAccount === account.id ? (
                  <div className="animate-pulse text-xs text-gray-500">Updating...</div>
                ) : (
                  <CustomSelect
                    value={account.sarsItem}
                    onChange={(newSarsItem) => handleMappingChange(account.id, newSarsItem)}
                    section="Income Statement"
                  />
                )}
              </div>
              <div className={`col-span-2 text-right tabular-nums ${account.balance < 0 ? 'text-red-600' : ''}`}>
                {account.balance < 0 ? `(${formatAmount(Math.abs(account.balance))})` : formatAmount(account.balance)}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  if (items.length === 0) return null;

  const bgClass = isGrossProfit ? 'bg-gray-50' : isNetProfit ? 'bg-gray-100' : '';

  return (
    <div className={`space-y-1 ${isSubtotal ? 'mt-2' : 'mt-4'}`}>
      <h3 className="font-bold text-gray-700">{title}</h3>
      {items.map(({ sarsItem, balance }) => (
        balance !== 0 && (
          <div key={sarsItem} className="space-y-1">
            <div 
              className="grid grid-cols-12 cursor-pointer hover:bg-gray-50 rounded-lg p-1" 
              onClick={() => toggleItem(sarsItem)}
            >
              <div className="col-span-8 pl-4 flex items-center">
                <ChevronRightIcon 
                  className={`h-4 w-4 mr-2 transition-transform ${expandedItems[sarsItem] ? 'rotate-90' : ''}`}
                />
                {sarsItem}
              </div>
              <div className={`col-span-4 text-right tabular-nums ${balance > 0 ? 'text-red-600' : ''}`}>
                {balance > 0 ? `(${formatAmount(Math.abs(balance))})` : formatAmount(Math.abs(balance))}
              </div>
            </div>
            {renderMappedAccounts(sarsItem)}
          </div>
        )
      ))}
      {showTotal && (
        <div className={`grid grid-cols-12 gap-4 font-bold border-t border-gray-300 pt-1 mt-1 ${bgClass}`}>
          <div className="col-span-8">Total {title}</div>
          <div className={`col-span-4 text-right tabular-nums ${total > 0 ? 'text-red-600' : ''}`}>
            {total > 0 ? `(${formatAmount(Math.abs(total))})` : formatAmount(Math.abs(total))}
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

  const renderSection = (title: string, subsection: string, items: [string, number][], isTotal = false) => {
    if (items.length === 0) return null;
    
    return (
      <div className="space-y-1">
        {!isTotal && (
          <div className="text-sm font-medium text-gray-900">
            {title}
            {subsection && (
              <span className="text-gray-500 ml-2">({subsectionDisplayNames[subsection] || subsection})</span>
            )}
          </div>
        )}
        {items.map(([sarsItem, balance]) => (
          <div key={sarsItem} className="group">
            <div 
              className="grid grid-cols-12 cursor-pointer hover:bg-gray-50"
              onClick={() => toggleItem(sarsItem)}
            >
              <div className="col-span-9 pl-4 flex items-center gap-2">
                <ChevronRightIcon 
                  className={`h-3 w-3 transition-transform ${expandedItems[sarsItem] ? 'rotate-90' : ''}`}
                />
                {sarsItem}
              </div>
              <div className="col-span-3 text-right px-4 tabular-nums">
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
    const subsectionEntry = Object.entries(mappingGuide.incomeStatement).find(([_, items]) =>
      items.some(item => item.sarsItem === sarsItem)
    );
    
    const subsectionName = subsectionEntry 
      ? subsectionDisplayNames[subsectionEntry[0]] || subsectionEntry[0]
      : '';

    return (
      <div className="pl-8 pr-4 py-2 bg-gray-50 border-t border-b border-gray-200">
        <div className="space-y-1">
          {accounts.map((account) => (
            <div key={account.id} className="grid grid-cols-12 text-sm items-center">
              <div className="col-span-1 text-gray-500">{account.accountCode}</div>
              <div className="col-span-3 truncate">{account.accountName}</div>
              <div className="col-span-2 text-gray-500 text-xs truncate">{subsectionName}</div>
              <div className="col-span-4">
                {updatingAccount === account.id ? (
                  <div className="animate-pulse text-xs text-gray-500">Updating...</div>
                ) : (
                  <CustomSelect
                    value={account.sarsItem}
                    onChange={(newSarsItem) => handleMappingUpdate(account.id, newSarsItem)}
                    section="Income Statement"
                  />
                )}
              </div>
              <div className={`col-span-2 text-right tabular-nums ${account.balance < 0 ? 'text-red-600' : ''}`}>
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
    .reduce((sum, [_, balance]) => sum + Math.abs(balance), 0);

  // For Cost of Sales, keep the original sign from the sum of accounts
  const costOfSales = Object.entries(aggregatedData)
    .filter(([sarsItem]) => sarsItem.includes('Purchases') || sarsItem.includes('stock'))
    .reduce((sum, [_, balance]) => sum + balance, 0);

  // Gross profit = Total Income - Cost of Sales
  const grossProfit = totalIncome - costOfSales;

  const otherIncome = Object.entries(aggregatedData)
    .filter(([sarsItem, balance]) => !sarsItem.includes('Sales') && !sarsItem.includes('Purchases') && !sarsItem.includes('stock') && balance < 0)
    .reduce((sum, [_, balance]) => sum + Math.abs(balance), 0);

  const expenses = Object.entries(aggregatedData)
    .filter(([sarsItem, balance]) => !sarsItem.includes('Sales') && !sarsItem.includes('Purchases') && !sarsItem.includes('stock') && balance > 0)
    .reduce((sum, [_, balance]) => sum + Math.abs(balance), 0);

  // Net profit = Gross Profit + Other Income - Expenses
  const netProfitBeforeTax = grossProfit + otherIncome - expenses;

  // Calculate total of all income statement items for verification
  const totalOfAllItems = Object.values(aggregatedData).reduce((sum, balance) => sum + balance, 0);

  return (
    <div className="p-8">
      <div className="space-y-4">
        {/* Header */}
        <div className="grid grid-cols-12">
          <div className="col-span-9 text-lg font-bold">Income Statement</div>
          <div className="col-span-3 text-right font-semibold">R</div>
        </div>

        {/* TOTAL INCOME */}
        <div>
          <div className="grid grid-cols-12 font-bold border-b border-gray-200 pb-1">
            <div className="col-span-9">TOTAL INCOME (SALES & OTHER INCOME)</div>
            <div className="col-span-3 text-right px-4 tabular-nums">
              {formatAmount(totalIncome)}
            </div>
          </div>

          {renderSection("Sales", "grossProfitOrLoss", 
            Object.entries(aggregatedData)
              .filter(([sarsItem]) => sarsItem.includes('Sales'))
              .map(([sarsItem, balance]) => [sarsItem, Math.abs(balance)])
          )}

          <div className="grid grid-cols-12 mt-2 italic border-t border-gray-200 pt-1">
            <div className="col-span-9">Turnover per AFS</div>
            <div className="col-span-3 text-right px-4 tabular-nums">
              {formatAmount(totalIncome)}
            </div>
          </div>
        </div>

        {/* Cost of Sales */}
        <div>
          {renderSection("Cost of Sales", "grossProfitOrLoss", 
            Object.entries(aggregatedData)
              .filter(([sarsItem]) => sarsItem.includes('Purchases') || sarsItem.includes('stock'))
              .map(([sarsItem, balance]) => [sarsItem, Math.abs(balance)])
          )}
          <div className="grid grid-cols-12 font-bold border-t border-gray-200 pt-1">
            <div className="col-span-9">TOTAL COST OF SALES</div>
            <div className={`col-span-3 text-right px-4 tabular-nums ${costOfSales < 0 ? 'text-red-600' : ''}`}>
              {costOfSales < 0 ? `(${formatAmount(Math.abs(costOfSales))})` : formatAmount(costOfSales)}
            </div>
          </div>
        </div>

        {/* GROSS PROFIT/LOSS */}
        <div className="grid grid-cols-12 font-bold bg-gray-50 p-2 rounded-t-lg">
          <div className="col-span-9">GROSS PROFIT/LOSS</div>
          <div className="col-span-3 text-right px-4 tabular-nums">
            {formatAmount(grossProfit)}
          </div>
        </div>

        {/* Income Items */}
        <div>
          {renderSection("Income Items", "incomeItemsOnlyCreditAmounts", 
            Object.entries(aggregatedData)
              .filter(([sarsItem, val]) => !sarsItem.includes('Sales') && !sarsItem.includes('Purchases') && !sarsItem.includes('stock') && val < 0)
              .map(([sarsItem, balance]) => [sarsItem, Math.abs(balance)])
          )}
          <div className="grid grid-cols-12 font-bold border-t border-gray-200 pt-1">
            <div className="col-span-9">TOTAL OTHER INCOME</div>
            <div className="col-span-3 text-right px-4 tabular-nums">
              {formatAmount(otherIncome)}
            </div>
          </div>
        </div>

        {/* Expense Items */}
        <div>
          {renderSection("Expense Items", "expenseItemsDebitAmounts", 
            Object.entries(aggregatedData)
              .filter(([sarsItem, val]) => !sarsItem.includes('Sales') && !sarsItem.includes('Purchases') && !sarsItem.includes('stock') && val > 0)
              .map(([sarsItem, balance]) => [sarsItem, Math.abs(balance)])
          )}
          <div className="grid grid-cols-12 font-bold border-t border-gray-200 pt-1">
            <div className="col-span-9">TOTAL OTHER EXPENSES</div>
            <div className="col-span-3 text-right px-4 tabular-nums">
              {formatAmount(expenses)}
            </div>
          </div>
        </div>

        {/* NET PROFIT/LOSS BEFORE TAX */}
        <div className="grid grid-cols-12 font-bold bg-gray-100 p-2 rounded-lg">
          <div className="col-span-9">NET PROFIT/(LOSS) BEFORE TAX</div>
          <div className="col-span-3 text-right px-4 tabular-nums">
            {formatAmount(netProfitBeforeTax)}
          </div>
        </div>

        {/* Verification total */}
        <div className="grid grid-cols-12 text-sm text-gray-500 border-t border-gray-200 pt-2">
          <div className="col-span-9">Total of all items (for verification)</div>
          <div className="col-span-3 text-right px-4 tabular-nums">
            {formatAmount(Math.abs(totalOfAllItems))}
          </div>
        </div>
      </div>
    </div>
  );
} 