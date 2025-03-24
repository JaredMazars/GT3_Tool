'use client';

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { FileUpload } from '@/components/FileUpload';
import { utils, write } from 'xlsx';
import { ArrowLeftIcon, ChevronDownIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import { mappingGuide } from '@/lib/mappingGuide';

interface MappedData {
  id: number;
  accountCode: string;
  account: string;
  section: string;
  balance: number;
  sarsItem: string;
  createdAt: string;
  updatedAt: string;
  projectId: number;
}

interface TabProps {
  selected: boolean;
  children: React.ReactNode;
  onClick: () => void;
  className?: string;
}

function Tab({ selected, children, onClick, className = '' }: TabProps) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 text-sm font-medium rounded-md ${
        selected
          ? 'bg-blue-100 text-blue-700'
          : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
      } ${className}`}
    >
      {children}
    </button>
  );
}

interface BalanceSheetData {
  nonCurrentAssets: {
    fixedAssets: {
      fixedProperty: number;
      fixedAssetsOther: number;
      fixedAssetsProperty: number;
      plantAndEquipment: number;
      other: number;
      goodwillAndIntellectual: number;
    };
    investments: {
      inSubsidiaries: number;
    };
    loans: {
      interestFreeConnectedLocal: number;
      interestFreeNonConnectedLocal: number;
      interestFreeConnectedForeign: number;
      interestFreeNonConnectedForeign: number;
      interestBearingConnectedLocal: number;
      interestBearingNonConnectedLocal: number;
      interestBearingConnectedForeign: number;
      interestBearingNonConnectedForeign: number;
    };
    deferredTax: number;
    otherNonCurrentAssets: number;
  };
  currentAssets: {
    inventory: {
      gross: number;
      provisions: number;
    };
    tradeReceivables: {
      gross: number;
      provisions: number;
    };
    debtors: {
      gross: number;
      provisions: number;
    };
    prepayments: number;
    groupCompaniesAccounts: number;
    shortTermInvestments: number;
    saRevenueService: number;
    cashAndEquivalents: number;
    otherCurrentAssets: number;
  };
  capitalAndReserves: {
    shareCapital: number;
    sharePremium: number;
    nonDistributableReserves: number;
    distributableReserves: number;
    retainedIncome: number;
    otherCapitalAndReserves: number;
  };
  debitBalances: {
    accumulatedLoss: number;
    otherCapitalAndReservesDebit: number;
  };
  nonCurrentLiabilities: {
    loans: {
      interestFreeNonConnectedLocal: number;
      interestFreeConnectedLocal: number;
      interestFreeConnectedForeign: number;
      interestFreeNonConnectedForeign: number;
      interestBearingConnectedLocal: number;
      interestBearingNonConnectedLocal: number;
      interestBearingConnectedForeign: number;
      interestBearingNonConnectedForeign: number;
      interestBearingConnectedForeing: number;
    };
    deferredTax: number;
    otherNonCurrentLiabilities: number;
  };
  currentLiabilities: {
    tradePayables: {
      notOlderThanThreeYears: number;
      olderThanThreeYears: number;
    };
    provisions: number;
    deposits: number;
    groupCompaniesAccounts: number;
    contractProgress: number;
    currentPortionInterestBearing: number;
    currentPortionInterestFree: number;
    overdraft: number;
    saRevenueService: number;
    shareholdersDividend: number;
    otherCurrentLiabilities: number;
  };
}

interface BalanceSheetSectionProps {
  title: string;
  amount?: number | null;
  children?: React.ReactNode;
  isTotal?: boolean;
  isNegative?: boolean;
  className?: string;
}

function BalanceSheetSection({ title, amount, children, isTotal, isNegative, className }: BalanceSheetSectionProps) {
  const formattedAmount = amount?.toLocaleString('en-ZA', {
    style: 'currency',
    currency: 'ZAR',
    minimumFractionDigits: 2
  }) || 'R 0.00';

  return (
    <div className={`flex justify-between items-center py-2 ${isTotal ? 'font-semibold' : ''} ${className || ''}`}>
      <span>{title}</span>
      {children || (
        <span className={isNegative ? 'text-red-600' : ''}>
          {amount !== undefined && amount !== null ? formattedAmount : '-'}
        </span>
      )}
    </div>
  );
}

interface BalanceSheetGroupProps {
  title: string;
  children: React.ReactNode;
  defaultExpanded?: boolean;
}

function BalanceSheetGroup({ title, children, defaultExpanded = true }: BalanceSheetGroupProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  return (
    <div className="border rounded-lg p-4">
      <div
        className="flex items-center cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        {isExpanded ? (
          <ChevronDownIcon className="h-5 w-5 text-gray-500" />
        ) : (
          <ChevronRightIcon className="h-5 w-5 text-gray-500" />
        )}
        <h3 className="text-lg font-semibold ml-2">{title}</h3>
      </div>
      {isExpanded && <div className="mt-4 space-y-2">{children}</div>}
    </div>
  );
}

function transformMappedDataToBalanceSheet(mappedData: MappedData[]) {
  // Initialize balance sheet structure
  const balanceSheet = {
    nonCurrentAssets: {} as Record<string, number>,
    currentAssets: {} as Record<string, number>,
    capitalAndReserves: {} as Record<string, number>,
    debitBalances: {} as Record<string, number>,
    nonCurrentLiabilities: {} as Record<string, number>,
    currentLiabilities: {} as Record<string, number>,
  };

  // First, aggregate balances for the same SARS items
  const aggregatedBalances = mappedData.reduce((acc, { sarsItem, balance }) => {
    if (!acc[sarsItem]) {
      acc[sarsItem] = 0;
    }
    acc[sarsItem] += balance;
    return acc;
  }, {} as Record<string, number>);

  // Initialize all possible SARS items from the mapping guide with 0
  Object.entries(mappingGuide.balanceSheet).forEach(([section, items]) => {
    items.forEach(({ sarsItem }) => {
      // Skip SA Revenue Service initialization as it will be handled specially
      if (sarsItem === 'SA Revenue Service') return;

      switch (section) {
        case 'nonCurrentAssets':
          balanceSheet.nonCurrentAssets[sarsItem] = 0;
          break;
        case 'currentAssets':
          balanceSheet.currentAssets[sarsItem] = 0;
          break;
        case 'capitalAndReservesCreditBalances':
          balanceSheet.capitalAndReserves[sarsItem] = 0;
          break;
        case 'capitalAndReservesDebitBalances':
          balanceSheet.debitBalances[sarsItem] = 0;
          break;
        case 'nonCurrentLiabilities':
          balanceSheet.nonCurrentLiabilities[sarsItem] = 0;
          break;
        case 'currentLiabilities':
          balanceSheet.currentLiabilities[sarsItem] = 0;
          break;
      }
    });
  });

  // Map aggregated balances to the balance sheet structure
  Object.entries(aggregatedBalances).forEach(([sarsItem, balance]) => {
    // Special handling for SA Revenue Service
    if (sarsItem === 'SA Revenue Service') {
      if (balance > 0) {
        balanceSheet.currentAssets[sarsItem] = balance;
      } else {
        balanceSheet.currentLiabilities[sarsItem] = balance;
      }
      return;
    }

    // Find which section this SARS item belongs to
    Object.entries(mappingGuide.balanceSheet).forEach(([section, items]) => {
      const matchingItem = items.find(item => item.sarsItem === sarsItem);
      if (matchingItem) {
        // For assets: keep original sign (positive is positive, negative is negative)
        if (section === 'nonCurrentAssets' || section === 'currentAssets') {
          balanceSheet[section][sarsItem] = balance;
        }
        // For equity and liabilities: positive is positive, negative is negative
        else {
          switch (section) {
            case 'capitalAndReservesCreditBalances':
              balanceSheet.capitalAndReserves[sarsItem] = balance;
              break;
            case 'capitalAndReservesDebitBalances':
              balanceSheet.debitBalances[sarsItem] = balance;
              break;
            case 'nonCurrentLiabilities':
            case 'currentLiabilities':
              balanceSheet[section][sarsItem] = balance;
              break;
          }
        }
      }
    });
  });

  return balanceSheet;
}

function calculateNestedTotal(obj: Record<string, any>): number {
  return Object.values(obj).reduce((sum, val) => {
    if (typeof val === 'number') {
      return sum + val;
    }
    if (typeof val === 'object' && val !== null) {
      return sum + calculateNestedTotal(val);
    }
    return sum;
  }, 0);
}

interface BalanceSheetItemProps {
  sarsItem: string;
  balance: number;
  mappedAccounts: MappedData[];
  isAsset: boolean;
  projectId: string;
  onMappingUpdate: (accountId: number, newSarsItem: string) => Promise<void>;
}

interface MappingEditorProps {
  currentSarsItem: string;
  currentSection: string;
  onUpdate: (newSarsItem: string) => Promise<void>;
}

function MappingEditor({ currentSarsItem, currentSection, onUpdate }: MappingEditorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Get available SARS items based on section with their categories
  const getAvailableSarsItems = () => {
    const section = currentSection.toLowerCase();
    if (section === 'balance sheet') {
      return [
        ...mappingGuide.balanceSheet.nonCurrentAssets.map(item => ({
          sarsItem: item.sarsItem,
          category: 'Non Current Assets'
        })),
        ...mappingGuide.balanceSheet.currentAssets.map(item => ({
          sarsItem: item.sarsItem,
          category: 'Current Assets'
        })),
        ...mappingGuide.balanceSheet.capitalAndReservesCreditBalances.map(item => ({
          sarsItem: item.sarsItem,
          category: 'Capital and Reserves (Credit)'
        })),
        ...mappingGuide.balanceSheet.capitalAndReservesDebitBalances.map(item => ({
          sarsItem: item.sarsItem,
          category: 'Capital and Reserves (Debit)'
        })),
        ...mappingGuide.balanceSheet.nonCurrentLiabilities.map(item => ({
          sarsItem: item.sarsItem,
          category: 'Non Current Liabilities'
        })),
        ...mappingGuide.balanceSheet.currentLiabilities.map(item => ({
          sarsItem: item.sarsItem,
          category: 'Current Liabilities'
        }))
      ];
    } else {
      return [
        ...mappingGuide.incomeStatement.grossProfitOrLoss.map(item => ({
          sarsItem: item.sarsItem,
          category: 'Gross Profit or Loss'
        })),
        ...mappingGuide.incomeStatement.incomeItemsCreditAmounts.map(item => ({
          sarsItem: item.sarsItem,
          category: 'Income Items (Credit)'
        })),
        ...mappingGuide.incomeStatement.expenseItemsDebitAmounts.map(item => ({
          sarsItem: item.sarsItem,
          category: 'Expense Items (Debit)'
        })),
        ...mappingGuide.incomeStatement.incomeItemsOnlyCreditAmounts.map(item => ({
          sarsItem: item.sarsItem,
          category: 'Income Items (Credit Only)'
        }))
      ];
    }
  };

  const filteredItems = useMemo(() => {
    const items = getAvailableSarsItems();
    if (!searchTerm) return items;
    return items.filter(item => 
      item.sarsItem.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [searchTerm, currentSection]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = async (sarsItem: string) => {
    if (sarsItem === currentSarsItem) {
      setIsOpen(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      await onUpdate(sarsItem);
      setIsOpen(false);
    } catch (error) {
      console.error('Failed to update mapping:', error);
      setError('Failed to update mapping. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={isLoading}
        className={`w-full text-left px-2 py-1 text-sm rounded hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
          isLoading ? 'opacity-50 cursor-not-allowed' : ''
        }`}
      >
        <div className="flex items-center justify-between">
          <span className="truncate">{currentSarsItem}</span>
          {isLoading ? (
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
          ) : (
            <ChevronDownIcon className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
          )}
        </div>
      </button>

      {error && (
        <div className="absolute top-full left-0 right-0 mt-1 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-600">
          {error}
        </div>
      )}

      {isOpen && (
        <div className="absolute z-50 mt-1 w-96 bg-white rounded-md shadow-lg">
          <div className="p-2">
            <input
              type="text"
              placeholder="Search SARS items..."
              className="w-full px-3 py-2 border rounded-md text-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              autoFocus
            />
          </div>
          <div className="max-h-96 overflow-y-auto">
            {filteredItems.map((item, index) => (
              <div key={`${item.category}-${item.sarsItem}`}>
                {(index === 0 || filteredItems[index - 1].category !== item.category) && (
                  <div className="px-4 py-1 bg-gray-50 text-xs font-medium text-gray-500">
                    {item.category}
                  </div>
                )}
                <button
                  onClick={() => handleSelect(item.sarsItem)}
                  className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 focus:outline-none focus:bg-gray-50 ${
                    item.sarsItem === currentSarsItem ? 'bg-blue-50 text-blue-700' : ''
                  }`}
                >
                  {item.sarsItem}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function BalanceSheetItem({ sarsItem, balance, mappedAccounts, isAsset, projectId, onMappingUpdate }: BalanceSheetItemProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const isNegative = isAsset ? balance < 0 : balance > 0;

  const handleUpdateMapping = async (accountId: number, newSarsItem: string) => {
    setIsUpdating(true);
    try {
      await onMappingUpdate(accountId, newSarsItem);
    } catch (error) {
      console.error('Error updating mapping:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <>
      <div 
        className={`grid grid-cols-12 gap-4 cursor-pointer hover:bg-gray-50 ${isUpdating ? 'opacity-50' : ''}`}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className={`col-span-8 pl-4 ${isNegative ? 'text-red-600' : ''} flex items-center`}>
          <ChevronRightIcon 
            className={`h-4 w-4 mr-2 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
          />
          {sarsItem}
          {isUpdating && (
            <div className="ml-2 animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
          )}
        </div>
        <div className={`col-span-4 text-right tabular-nums ${isNegative ? 'text-red-600' : ''}`}>
          {isNegative 
            ? `(${formatAmount(Math.abs(balance))})` 
            : formatAmount(Math.abs(balance))}
        </div>
      </div>
      
      {isExpanded && mappedAccounts.length > 0 && (
        <div className="ml-8 mt-2 mb-2 border-l-2 border-gray-200 pl-4">
          <div className="text-sm text-gray-500 mb-2">Mapped Accounts:</div>
          {mappedAccounts.map((account) => (
            <div key={account.id} className="grid grid-cols-12 gap-4 text-sm items-center">
              <div className="col-span-2 text-gray-600">{account.accountCode}</div>
              <div className="col-span-3 text-gray-800 truncate">{account.account}</div>
              <div className="col-span-3">
                <MappingEditor
                  currentSarsItem={account.sarsItem}
                  currentSection={account.section}
                  onUpdate={(newSarsItem) => handleUpdateMapping(account.id, newSarsItem)}
                />
              </div>
              <div className={`col-span-4 text-right tabular-nums ${account.balance < 0 ? 'text-red-600' : ''}`}>
                {account.balance < 0 
                  ? `(${formatAmount(Math.abs(account.balance))})` 
                  : formatAmount(account.balance)}
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

function renderBalanceSheet(
  balanceSheet: {
    nonCurrentAssets: Record<string, number>;
    currentAssets: Record<string, number>;
    capitalAndReserves: Record<string, number>;
    debitBalances: Record<string, number>;
    nonCurrentLiabilities: Record<string, number>;
    currentLiabilities: Record<string, number>;
  }, 
  totals: { balanceSheet: number; incomeStatement: number },
  mappedData: MappedData[],
  projectId: string,
  onMappingUpdate: (accountId: number, newSarsItem: string) => Promise<void>
) {
  // Helper function to get mapped accounts for a SARS item
  const getMappedAccounts = (sarsItem: string) => {
    return mappedData.filter(item => item.sarsItem === sarsItem);
  };

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="text-center mb-8">
      </div>

      <div className="space-y-6">
        {/* Non Current Assets */}
        <div>
          <h2 className="font-bold mb-2">Non Current Assets</h2>
          <div className="space-y-1">
            {Object.entries(balanceSheet.nonCurrentAssets).map(([sarsItem, balance]: [string, number]) => (
              balance !== 0 && (
                <BalanceSheetItem
                  key={sarsItem}
                  sarsItem={sarsItem}
                  balance={balance}
                  mappedAccounts={getMappedAccounts(sarsItem)}
                  isAsset={true}
                  projectId={projectId}
                  onMappingUpdate={onMappingUpdate}
                />
              )
            ))}
            {calculateNestedTotal(balanceSheet.nonCurrentAssets) !== 0 && (
              <div className="grid grid-cols-12 gap-4 font-bold border-t border-gray-300 pt-1 mt-1">
                <div className="col-span-8">Total Non Current Assets</div>
                <div className="col-span-4 text-right tabular-nums">
                  {formatAmount(calculateNestedTotal(balanceSheet.nonCurrentAssets))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Current Assets */}
        <div>
          <h2 className="font-bold mb-2">Current Assets</h2>
          <div className="space-y-1">
            {Object.entries(balanceSheet.currentAssets).map(([sarsItem, balance]: [string, number]) => (
              balance !== 0 && (
                <BalanceSheetItem
                  key={sarsItem}
                  sarsItem={sarsItem}
                  balance={balance}
                  mappedAccounts={getMappedAccounts(sarsItem)}
                  isAsset={true}
                  projectId={projectId}
                  onMappingUpdate={onMappingUpdate}
                />
              )
            ))}
            {calculateNestedTotal(balanceSheet.currentAssets) !== 0 && (
              <div className="grid grid-cols-12 gap-4 font-bold border-t border-gray-300 pt-1 mt-1">
                <div className="col-span-8">Total Current Assets</div>
                <div className="col-span-4 text-right tabular-nums">
                  {formatAmount(calculateNestedTotal(balanceSheet.currentAssets))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Total Assets */}
        <div className="grid grid-cols-12 gap-4 font-bold border-t border-b border-gray-300 py-2">
          <div className="col-span-8">TOTAL ASSETS</div>
          <div className="col-span-4 text-right tabular-nums">
            {formatAmount(calculateNestedTotal(balanceSheet.nonCurrentAssets) + calculateNestedTotal(balanceSheet.currentAssets))}
          </div>
        </div>

        {/* Capital and Reserves */}
        <div>
          <h2 className="font-bold mb-2">Capital and Reserves</h2>
          <div className="space-y-1">
            {Object.entries(balanceSheet.capitalAndReserves).map(([sarsItem, balance]: [string, number]) => (
              balance !== 0 && (
                <BalanceSheetItem
                  key={sarsItem}
                  sarsItem={sarsItem}
                  balance={balance}
                  mappedAccounts={getMappedAccounts(sarsItem)}
                  isAsset={false}
                  projectId={projectId}
                  onMappingUpdate={onMappingUpdate}
                />
              )
            ))}
            {Object.entries(balanceSheet.debitBalances).map(([sarsItem, balance]: [string, number]) => (
              balance !== 0 && (
                <BalanceSheetItem
                  key={sarsItem}
                  sarsItem={sarsItem}
                  balance={balance}
                  mappedAccounts={getMappedAccounts(sarsItem)}
                  isAsset={false}
                  projectId={projectId}
                  onMappingUpdate={onMappingUpdate}
                />
              )
            ))}
            {totals.incomeStatement !== 0 && (
              <div className="grid grid-cols-12 gap-4">
                <div className={`col-span-8 pl-4 ${totals.incomeStatement > 0 ? 'text-red-600' : ''}`}>
                  Current year's profit/(loss)
                </div>
                <div className={`col-span-4 text-right tabular-nums ${totals.incomeStatement > 0 ? 'text-red-600' : ''}`}>
                  {totals.incomeStatement > 0 
                    ? `(${formatAmount(Math.abs(totals.incomeStatement))})` 
                    : formatAmount(Math.abs(totals.incomeStatement))}
                </div>
              </div>
            )}
            <div className="grid grid-cols-12 gap-4 font-bold border-t border-gray-300 pt-1 mt-1">
              <div className="col-span-8">Total Capital and Reserves</div>
              <div className="col-span-4 text-right tabular-nums">
                {formatAmount(calculateNestedTotal(balanceSheet.capitalAndReserves) - calculateNestedTotal(balanceSheet.debitBalances) + totals.incomeStatement)}
              </div>
            </div>
          </div>
        </div>

        {/* Non-Current Liabilities */}
        <div>
          <h2 className="font-bold mb-2">Non-Current Liabilities</h2>
          <div className="space-y-1">
            {Object.entries(balanceSheet.nonCurrentLiabilities).map(([sarsItem, balance]: [string, number]) => (
              balance !== 0 && (
                <BalanceSheetItem
                  key={sarsItem}
                  sarsItem={sarsItem}
                  balance={balance}
                  mappedAccounts={getMappedAccounts(sarsItem)}
                  isAsset={false}
                  projectId={projectId}
                  onMappingUpdate={onMappingUpdate}
                />
              )
            ))}
            {calculateNestedTotal(balanceSheet.nonCurrentLiabilities) !== 0 && (
              <div className="grid grid-cols-12 gap-4 font-bold border-t border-gray-300 pt-1 mt-1">
                <div className="col-span-8">Total Non-Current Liabilities</div>
                <div className="col-span-4 text-right tabular-nums">
                  {formatAmount(Math.abs(calculateNestedTotal(balanceSheet.nonCurrentLiabilities)))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Current Liabilities */}
        <div>
          <h2 className="font-bold mb-2">Current Liabilities</h2>
          <div className="space-y-1">
            {Object.entries(balanceSheet.currentLiabilities).map(([sarsItem, balance]: [string, number]) => (
              balance !== 0 && (
                <BalanceSheetItem
                  key={sarsItem}
                  sarsItem={sarsItem}
                  balance={balance}
                  mappedAccounts={getMappedAccounts(sarsItem)}
                  isAsset={false}
                  projectId={projectId}
                  onMappingUpdate={onMappingUpdate}
                />
              )
            ))}
            {calculateNestedTotal(balanceSheet.currentLiabilities) !== 0 && (
              <div className="grid grid-cols-12 gap-4 font-bold border-t border-gray-300 pt-1 mt-1">
                <div className="col-span-8">Total Current Liabilities</div>
                <div className="col-span-4 text-right tabular-nums">
                  {formatAmount(Math.abs(calculateNestedTotal(balanceSheet.currentLiabilities)))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Total Equity and Liabilities */}
        <div className="grid grid-cols-12 gap-4 font-bold border-t border-b border-gray-300 py-2">
          <div className="col-span-8">TOTAL EQUITY AND LIABILITIES</div>
          <div className="col-span-4 text-right tabular-nums">
            {formatAmount(
              calculateNestedTotal(balanceSheet.capitalAndReserves) - 
              calculateNestedTotal(balanceSheet.debitBalances) + 
              totals.incomeStatement +
              calculateNestedTotal(balanceSheet.nonCurrentLiabilities) + 
              calculateNestedTotal(balanceSheet.currentLiabilities)
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function formatAmount(amount: number) {
  return new Intl.NumberFormat('en-ZA', {
    style: 'currency',
    currency: 'ZAR',
    minimumFractionDigits: 2
  }).format(amount);
}

// Convert renderMappingTable to a proper React component
interface MappingTableProps {
  mappedData: MappedData[];
  projectId: string;
  onMappingUpdate: (accountId: number, newSarsItem: string) => Promise<void>;
}

function MappingTable({ mappedData, projectId, onMappingUpdate }: MappingTableProps) {
  const [updatingRows, setUpdatingRows] = useState<Record<number, boolean>>({});

  const handleUpdateMapping = async (accountId: number, newSarsItem: string) => {
    setUpdatingRows(prev => ({ ...prev, [accountId]: true }));
    try {
      await onMappingUpdate(accountId, newSarsItem);
    } catch (error) {
      console.error('Error updating mapping:', error);
    } finally {
      setUpdatingRows(prev => ({ ...prev, [accountId]: false }));
    }
  };

  return (
    <table className="min-w-full table-fixed divide-y divide-gray-200">
      <thead className="bg-gray-50">
        <tr>
          <th scope="col" className="w-24 px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
            Code
          </th>
          <th scope="col" className="w-1/4 px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
            Account
          </th>
          <th scope="col" className="w-28 px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
            Section
          </th>
          <th scope="col" className="w-32 px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
            Balance
          </th>
          <th scope="col" className="w-1/3 px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
            SARS Item
          </th>
        </tr>
      </thead>
      <tbody className="bg-white divide-y divide-gray-200">
        {mappedData.map((item) => {
          const isBalanceSheet = item.section.toLowerCase() === 'balance sheet';
          const rowClass = isBalanceSheet 
            ? 'bg-blue-50/30 even:bg-blue-50/20'
            : 'bg-green-50/30 even:bg-green-50/20';

          return (
            <tr key={item.id} className={`${rowClass} ${updatingRows[item.id] ? 'opacity-50' : ''}`}>
              <td className="px-3 py-2 text-sm text-gray-900 truncate">
                {item.accountCode}
              </td>
              <td className="px-3 py-2 text-sm text-gray-900 truncate">
                {item.account}
              </td>
              <td className="px-3 py-2 text-sm">
                <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium truncate
                  ${isBalanceSheet ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'}`}>
                  {item.section}
                </span>
              </td>
              <td className="px-3 py-2 text-sm text-gray-900 text-right tabular-nums">
                {formatAmount(item.balance)}
              </td>
              <td className="px-3 py-2 text-sm relative">
                <MappingEditor
                  currentSarsItem={item.sarsItem}
                  currentSection={item.section}
                  onUpdate={(newSarsItem) => handleUpdateMapping(item.id, newSarsItem)}
                />
                {updatingRows[item.id] && (
                  <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-50">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                  </div>
                )}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

export default function ProjectPage({ params }: { params: { id: string } }) {
  const [activeTab, setActiveTab] = useState('mapping');
  const [mappedData, setMappedData] = useState<MappedData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [projectName, setProjectName] = useState<string>('');

  // Fetch project name
  useEffect(() => {
    async function fetchProjectName() {
      try {
        const response = await fetch(`/api/projects/${params.id}`);
        if (!response.ok) {
          throw new Error('Failed to fetch project details');
        }
        const data = await response.json();
        setProjectName(data.name);
      } catch (err) {
        console.error('Error fetching project name:', err);
        setProjectName('Project'); // Fallback name
      }
    }

    fetchProjectName();
  }, [params.id]);

  // Optimized refresh function
  const refreshMappedData = useCallback(async () => {
    try {
      const response = await fetch(`/api/projects/${params.id}/mapped-accounts`);
      if (!response.ok) {
        throw new Error('Failed to fetch mapped data');
      }
      const data = await response.json();
      setMappedData(data);
      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      throw err;
    }
  }, [params.id]);

  useEffect(() => {
    async function fetchMappedData() {
      try {
        await refreshMappedData();
      } catch (err) {
        // Error already handled in refreshMappedData
      } finally {
        setIsLoading(false);
      }
    }

    fetchMappedData();
  }, [refreshMappedData]);

  // Optimized mapping update handler
  const handleMappingUpdate = async (accountId: number, newSarsItem: string) => {
    try {
      // Optimistic update
      setMappedData(prevData => 
        prevData.map(item => 
          item.id === accountId 
            ? { ...item, sarsItem: newSarsItem }
            : item
        )
      );

      // Make API call
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

      // Refresh data in background
      refreshMappedData();
    } catch (error) {
      console.error('Error updating mapping:', error);
      // Revert optimistic update on error
      refreshMappedData();
      throw error;
    }
  };

  const renderContent = () => {
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

    switch (activeTab) {
      case 'mapping':
        return (
          <div className="space-y-8">
            <FileUpload onFileUpload={setMappedData} projectId={parseInt(params.id, 10)} />
            
            {mappedData && mappedData.length > 0 ? (
              <div className="space-y-4 bg-white rounded-xl shadow-lg p-6">
                <div className="flex justify-between items-center mb-4">
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900">{projectName}</h2>
                    <p className="text-sm text-gray-500">Trial Balance</p>
                  </div>
                  <div className="flex space-x-4">
                    <button
                      onClick={downloadJSON}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      Download JSON
                    </button>
                    
                    <button
                      onClick={downloadExcel}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                    >
                      Download Excel
                    </button>
                  </div>
                </div>

                {/* Summary Section */}
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <h3 className="text-sm font-medium text-blue-800 mb-2">Balance Sheet Total</h3>
                    <p className="text-lg font-semibold text-blue-900">
                      {formatAmount(totals.balanceSheet)}
                    </p>
                  </div>
                  <div className="bg-green-50 p-4 rounded-lg">
                    <h3 className="text-sm font-medium text-green-800 mb-2">Income Statement Total</h3>
                    <p className="text-lg font-semibold text-green-900">
                      {formatAmount(totals.incomeStatement)}
                    </p>
                  </div>
                </div>

                <div className="overflow-x-auto rounded-lg border border-gray-200">
                  <MappingTable
                    mappedData={mappedData}
                    projectId={params.id}
                    onMappingUpdate={handleMappingUpdate}
                  />
                </div>
              </div>
            ) : (
              <div className="text-center py-12">
                <p className="text-gray-500">No mapped data available. Upload a trial balance file to get started.</p>
              </div>
            )}
          </div>
        );
      case 'balance-sheet':
        return (
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="mb-6 border-b border-gray-200 pb-4">
              <h2 className="text-xl font-semibold text-gray-900">{projectName}</h2>
              <p className="text-sm text-gray-500">Balance Sheet</p>
              <p className="text-sm text-gray-500">As at {new Date().toLocaleDateString('en-ZA')}</p>
            </div>
            {mappedData.length === 0 ? (
              <div className="text-gray-500 text-center py-8">
                No mapped data available. Upload a trial balance to get started.
              </div>
            ) : (
              renderBalanceSheet(
                transformMappedDataToBalanceSheet(mappedData),
                calculateTotals(),
                mappedData,
                params.id,
                handleMappingUpdate
              )
            )}
          </div>
        );
      case 'settings':
        return <div>Settings content</div>;
      default:
        return null;
    }
  };

  // Add back the download functions and totals calculation
  const downloadJSON = () => {
    if (!mappedData) return;
    
    const dataStr = JSON.stringify(mappedData, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'mapped_trial_balance.json';
    link.click();
    URL.revokeObjectURL(url);
  };

  const downloadExcel = () => {
    if (!mappedData) return;
    
    const worksheet = utils.json_to_sheet(mappedData);
    const workbook = utils.book_new();
    utils.book_append_sheet(workbook, worksheet, 'Mapped Trial Balance');

    const wbout = write(workbook, { type: 'array', bookType: 'xlsx' });
    const blob = new Blob([wbout], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'mapped_trial_balance.xlsx';
    link.click();
    URL.revokeObjectURL(url);
  };

  // Calculate totals
  const calculateTotals = () => {
    if (!mappedData) return { balanceSheet: 0, incomeStatement: 0 };
    
    return mappedData.reduce((acc, item) => {
      if (item.section.toLowerCase() === 'balance sheet') {
        acc.balanceSheet += item.balance;
      } else if (item.section.toLowerCase() === 'income statement') {
        acc.incomeStatement += item.balance;
      }
      return acc;
    }, { balanceSheet: 0, incomeStatement: 0 });
  };

  const totals = calculateTotals();

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <Link
          href="/dashboard"
          className="flex items-center text-gray-600 hover:text-gray-900"
        >
          <ArrowLeftIcon className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Link>
      </div>

      <div className="bg-white rounded-lg shadow mb-6">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6" aria-label="Tabs">
            <Tab
              onClick={() => setActiveTab('mapping')}
              selected={activeTab === 'mapping'}
            >
              Mapping
            </Tab>
            <Tab
              onClick={() => setActiveTab('balance-sheet')}
              selected={activeTab === 'balance-sheet'}
            >
              Balance Sheet
            </Tab>
            <Tab
              onClick={() => setActiveTab('settings')}
              selected={activeTab === 'settings'}
            >
              Settings
            </Tab>
          </nav>
        </div>
        <div className="p-6">
          {renderContent()}
        </div>
      </div>
    </div>
  );
} 