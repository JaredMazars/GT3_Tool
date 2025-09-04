'use client';

import { useState, useEffect, useRef } from 'react';
import { formatAmount } from '@/lib/formatters';
import { MappedData } from '@/types';
import * as XLSX from 'xlsx';
import { mappingGuide } from '@/lib/mappingGuide';

// Add type at the top of the file after imports
interface SarsItem {
  sarsItem: string;
}

// Add type for section items at the top of the file after imports
type SectionItems = {
  [key: string]: { sarsItem: string }[];
};

// Display names for subsections
const subsectionDisplayNames: Record<string, string> = {
  nonCurrentAssets: 'Non-Current Assets',
  currentAssets: 'Current Assets',
  capitalAndReservesCreditBalances: 'Capital & Reserves (Credit)',
  capitalAndReservesDebitBalances: 'Capital & Reserves (Debit)',
  nonCurrentLiabilities: 'Non-Current Liabilities',
  currentLiabilities: 'Current Liabilities',
  grossProfitOrLoss: 'Gross Profit/Loss',
  incomeItemsCreditAmounts: 'Income Items (Credit)',
  expenseItemsDebitAmounts: 'Expense Items (Debit)',
  incomeItemsOnlyCreditAmounts: 'Income Items (Credit Only)'
};

interface CustomSelectProps {
  value: string;
  onChange: (value: string, section: string, subsection: string) => void;
  disabled?: boolean;
  section: string;
}

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

  // Get all items from both Balance Sheet and Income Statement
  const allSectionItems = {
    'Balance Sheet': mappingGuide.balanceSheet,
    'Income Statement': mappingGuide.incomeStatement
  } as const;

  // Filter items based on search term
  const filteredSectionItems = Object.entries(allSectionItems).reduce((acc, [mainSection, sectionData]) => {
    const filteredSubsections = Object.entries(sectionData as SectionItems).reduce((subAcc, [subsection, items]) => {
      const filteredItems = items.filter(item =>
        item.sarsItem.toLowerCase().includes(searchTerm.toLowerCase())
      );
      if (filteredItems.length > 0) {
        subAcc[subsection] = filteredItems;
      }
      return subAcc;
    }, {} as SectionItems);

    if (Object.keys(filteredSubsections).length > 0) {
      acc[mainSection] = filteredSubsections;
    }
    return acc;
  }, {} as Record<string, SectionItems>);

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
              <div className="text-xs text-gray-500 mt-0.5">All Available Items</div>
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
                {searchTerm && (
                  <button
                    type="button"
                    onClick={() => setSearchTerm('')}
                    className="absolute right-2 top-1.5 text-gray-400 hover:text-gray-600"
                  >
                    <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
            </div>
          </div>
          
          <div className="overflow-y-auto max-h-[300px] relative">
            {Object.entries(filteredSectionItems).length > 0 ? (
              Object.entries(filteredSectionItems).map(([mainSection, sectionData]) => (
                <div key={mainSection}>
                  <div className="sticky top-0 z-20 bg-blue-50 px-2 py-1 border-b border-gray-200 shadow-sm">
                    <div className="text-xs font-bold text-blue-900">
                      {mainSection}
                    </div>
                  </div>
                  {Object.entries(sectionData).map(([subsection, items]) => (
                    <div key={subsection} className="relative">
                      <div className="sticky top-6 z-10 bg-gray-50 px-2 py-1 border-b border-gray-200">
                        <div className="text-xs font-medium text-gray-900">
                          {subsectionDisplayNames[subsection] || subsection}
                        </div>
                      </div>
                      <div className="flex flex-col divide-y divide-gray-100">
                        {items.map((item: SarsItem) => (
                          <button
                            key={item.sarsItem}
                            type="button"
                            onClick={() => {
                              onChange(item.sarsItem, mainSection, subsection);
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
              ))
            ) : (
              <div className="p-2 text-center text-xs text-gray-500">
                No items match your search
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

interface MappingTableProps {
  mappedData: MappedData[];
  onMappingUpdate: (accountId: number, newSarsItem: string, newSection: string, newSubsection: string) => Promise<void>;
}

function MappingTable({ mappedData, onMappingUpdate }: MappingTableProps) {
  const [updatingRow, setUpdatingRow] = useState<number | null>(null);

  const handleMappingChange = async (accountId: number, newSarsItem: string, newSection: string, newSubsection: string) => {
    try {
      setUpdatingRow(accountId);
      await onMappingUpdate(accountId, newSarsItem, newSection, newSubsection);
    } finally {
      setUpdatingRow(null);
    }
  };


  return (
    <div className="overflow-x-auto">
      <table className="w-full divide-y divide-gray-200 table-fixed">
        <thead className="bg-gray-50">
          <tr>
            <th scope="col" className="w-[8%] px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Code
            </th>
            <th scope="col" className="w-[17%] px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Account Name
            </th>
            <th scope="col" className="w-[10%] px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Section
            </th>
            <th scope="col" className="w-[15%] px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Subsection
            </th>
            <th scope="col" className="w-[10%] px-2 py-1 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
              Balance
            </th>
            <th scope="col" className="w-[40%] px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              SARS Item
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {mappedData.map((item) => (
            <tr key={item.id} className="hover:bg-gray-50">
              <td className="px-2 py-1 whitespace-nowrap text-xs text-gray-900">
                {item.accountCode}
              </td>
              <td className="px-2 py-1 text-xs text-gray-900 truncate" title={item.accountName}>
                {item.accountName}
              </td>
              <td className="px-2 py-1 whitespace-nowrap text-xs text-gray-900">
                {item.section}
              </td>
              <td className="px-2 py-1 whitespace-nowrap text-xs text-gray-900 truncate" title={subsectionDisplayNames[item.subsection] || item.subsection}>
                {subsectionDisplayNames[item.subsection] || item.subsection}
              </td>
              <td className={`px-2 py-1 whitespace-nowrap text-xs text-right tabular-nums ${item.balance < 0 ? 'text-red-600' : 'text-gray-900'}`}>
                {item.balance < 0 ? `(${formatAmount(Math.abs(item.balance))})` : formatAmount(item.balance)}
              </td>
              <td className="px-2 py-1 whitespace-nowrap text-xs text-gray-900">
                {updatingRow === item.id ? (
                  <div className="animate-pulse">Updating...</div>
                ) : (
                  <CustomSelect
                    value={item.sarsItem}
                    onChange={(newSarsItem, newSection, newSubsection) => 
                      handleMappingChange(item.id, newSarsItem, newSection, newSubsection)
                    }
                    section={item.section}
                  />
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function MappingPage({ params }: { params: { id: string } }) {
  const [mappedData, setMappedData] = useState<MappedData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [projectName, setProjectName] = useState<string>('');
  const [isUploading, setIsUploading] = useState(false);

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

  const handleMappingUpdate = async (accountId: number, newSarsItem: string, newSection: string, newSubsection: string) => {
    try {
      const response = await fetch(`/api/projects/${params.id}/mapped-accounts/${accountId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          sarsItem: newSarsItem,
          section: newSection,
          subsection: newSubsection
        }),
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

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setIsUploading(true);
      setError(null);
      
      const formData = new FormData();
      formData.append('trialBalance', file);
      formData.append('projectId', params.id);

      const response = await fetch('/api/map', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to upload file');
      }

      // Refresh data
      const updatedData = await fetch(`/api/projects/${params.id}/mapped-accounts`).then(res => res.json());
      setMappedData(updatedData);
    } catch (error) {
      console.error('Error uploading file:', error);
      setError(error instanceof Error ? error.message : 'An error occurred');
    } finally {
      setIsUploading(false);
      // Reset the file input
      event.target.value = '';
    }
  };

  const downloadJson = () => {
    const jsonString = JSON.stringify(mappedData, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${projectName.toLowerCase().replace(/\s+/g, '-')}-mapped-data.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const downloadExcel = () => {
    const worksheet = XLSX.utils.json_to_sheet(mappedData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Mapped Data');
    XLSX.writeFile(workbook, `${projectName.toLowerCase().replace(/\s+/g, '-')}-mapped-data.xlsx`);
  };

  // Calculate totals
  const totals = mappedData.reduce((acc, item) => {
    const isBalanceSheet = item.section.toLowerCase() === 'balance sheet';
    const isIncomeStatement = item.section.toLowerCase() === 'income statement';
    
    if (isBalanceSheet) {
      acc.balanceSheet += item.balance;
    } else if (isIncomeStatement) {
      acc.incomeStatement += item.balance;
    }
    return acc;
  }, { balanceSheet: 0, incomeStatement: 0 });

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

  return (
    <div className="space-y-8">
      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        <div className="px-8 py-6 border-b border-gray-200">
          <h2 className="text-2xl font-semibold text-gray-900">{projectName}</h2>
          <p className="mt-1 text-sm text-gray-500">Mapping</p>
        </div>

        <div className="p-8 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-gray-700">Upload Trial Balance</h3>
              <div className="flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-lg bg-gray-50 transition-colors duration-200 ease-in-out hover:bg-gray-100">
                <div className="space-y-2 text-center">
                  <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48" aria-hidden="true">
                    <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <div className="flex text-sm text-gray-600 justify-center">
                    <label htmlFor="file-upload" className="relative cursor-pointer rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500">
                      <span>{isUploading ? 'Uploading...' : 'Upload a file'}</span>
                      <input 
                        id="file-upload" 
                        name="file-upload" 
                        type="file" 
                        className="sr-only" 
                        onChange={handleFileUpload} 
                        accept=".xlsx,.xls,.csv"
                        disabled={isUploading}
                      />
                    </label>
                    <p className="pl-1">or drag and drop</p>
                  </div>
                  <p className="text-xs text-gray-500">Excel or CSV files</p>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="text-sm font-medium text-gray-700">Download Data</h3>
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={downloadJson}
                  className="inline-flex items-center justify-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200 ease-in-out"
                >
                  Download JSON
                </button>
                <button
                  onClick={downloadExcel}
                  className="inline-flex items-center justify-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200 ease-in-out"
                >
                  Download Excel
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-gray-50 rounded-lg p-6">
              <h3 className="text-sm font-medium text-gray-700 mb-2">Balance Sheet Total</h3>
              <p className={`text-2xl font-semibold tabular-nums ${totals.balanceSheet < 0 ? 'text-red-600' : 'text-gray-900'}`}>
                {totals.balanceSheet < 0 ? `(${formatAmount(Math.abs(totals.balanceSheet))})` : formatAmount(totals.balanceSheet)}
              </p>
            </div>
            <div className="bg-gray-50 rounded-lg p-6">
              <h3 className="text-sm font-medium text-gray-700 mb-2">Income Statement Total</h3>
              <p className={`text-2xl font-semibold tabular-nums ${totals.incomeStatement < 0 ? 'text-red-600' : 'text-gray-900'}`}>
                {totals.incomeStatement < 0 ? `(${formatAmount(Math.abs(totals.incomeStatement))})` : formatAmount(totals.incomeStatement)}
              </p>
            </div>
          </div>

          {mappedData.length > 0 ? (
            <div className="rounded-lg border border-gray-200 overflow-hidden">
              <MappingTable mappedData={mappedData} onMappingUpdate={handleMappingUpdate} />
            </div>
          ) : (
            <div className="text-center py-12 bg-gray-50 rounded-lg">
              <h3 className="text-sm font-medium text-gray-900">No data</h3>
              <p className="mt-1 text-sm text-gray-500">Get started by uploading a trial balance.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 