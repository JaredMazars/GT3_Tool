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
        <thead className="bg-gradient-to-r from-gray-50 to-gray-100 sticky top-0">
          <tr>
            <th scope="col" className="w-[8%] px-2 py-1.5 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-b border-gray-300">
              Code
            </th>
            <th scope="col" className="w-[17%] px-2 py-1.5 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-b border-gray-300">
              Account Name
            </th>
            <th scope="col" className="w-[10%] px-2 py-1.5 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-b border-gray-300">
              Section
            </th>
            <th scope="col" className="w-[15%] px-2 py-1.5 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-b border-gray-300">
              Subsection
            </th>
            <th scope="col" className="w-[10%] px-2 py-1.5 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider border-b border-gray-300">
              Balance
            </th>
            <th scope="col" className="w-[40%] px-2 py-1.5 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-b border-gray-300">
              SARS Item
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {mappedData.map((item, index) => (
            <tr 
              key={item.id} 
              className={`transition-colors duration-150 ${
                index % 2 === 0 ? 'bg-white hover:bg-blue-50' : 'bg-gray-50 hover:bg-blue-50'
              }`}
            >
              <td className="px-2 py-1 whitespace-nowrap text-xs font-medium text-gray-900">
                {item.accountCode}
              </td>
              <td className="px-2 py-1 text-xs text-gray-900 truncate" title={item.accountName}>
                {item.accountName}
              </td>
              <td className="px-2 py-1 whitespace-nowrap text-xs text-gray-700">
                <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${
                  item.section.toLowerCase() === 'balance sheet' 
                    ? 'bg-blue-100 text-blue-800' 
                    : 'bg-green-100 text-green-800'
                }`}>
                  {item.section}
                </span>
              </td>
              <td className="px-2 py-1 whitespace-nowrap text-xs text-gray-700 truncate" title={subsectionDisplayNames[item.subsection] || item.subsection}>
                {subsectionDisplayNames[item.subsection] || item.subsection}
              </td>
              <td className={`px-2 py-1 whitespace-nowrap text-xs text-right tabular-nums font-medium ${
                item.balance < 0 ? 'text-red-600' : 'text-gray-900'
              }`}>
                {item.balance < 0 ? `(${formatAmount(Math.abs(item.balance))})` : formatAmount(item.balance)}
              </td>
              <td className="px-2 py-1 whitespace-nowrap text-xs text-gray-900">
                {updatingRow === item.id ? (
                  <div className="flex items-center gap-2 text-blue-600">
                    <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600"></div>
                    <span>Updating...</span>
                  </div>
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

  // Calculate mapping stats
  const totalAccounts = mappedData.length;
  const mappedAccounts = mappedData.filter(item => item.sarsItem && item.sarsItem !== '').length;
  const completionPercentage = totalAccounts > 0 ? Math.round((mappedAccounts / totalAccounts) * 100) : 0;
  const balanceSheetAccounts = mappedData.filter(item => item.section.toLowerCase() === 'balance sheet').length;
  const incomeStatementAccounts = mappedData.filter(item => item.section.toLowerCase() === 'income statement').length;

  return (
    <div className="space-y-4">
      {/* Stats Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg shadow-lg p-3 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-xs font-medium">Total Accounts</p>
              <p className="text-xl font-bold mt-1">{totalAccounts}</p>
            </div>
            <div className="bg-blue-400 bg-opacity-30 rounded-full p-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg shadow-lg p-3 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-100 text-xs font-medium">Completion Rate</p>
              <p className="text-xl font-bold mt-1">{completionPercentage}%</p>
            </div>
            <div className="bg-green-400 bg-opacity-30 rounded-full p-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <div className="mt-2 bg-green-400 bg-opacity-30 rounded-full h-1.5">
            <div 
              className="bg-white h-1.5 rounded-full transition-all duration-500"
              style={{ width: `${completionPercentage}%` }}
            />
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg shadow-lg p-3 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-100 text-xs font-medium">Balance Sheet</p>
              <p className="text-xl font-bold mt-1">{balanceSheetAccounts}</p>
            </div>
            <div className="bg-purple-400 bg-opacity-30 rounded-full p-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg shadow-lg p-3 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-orange-100 text-xs font-medium">Income Statement</p>
              <p className="text-xl font-bold mt-1">{incomeStatementAccounts}</p>
            </div>
            <div className="bg-orange-400 bg-opacity-30 rounded-full p-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Actions and Upload Section */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-4 space-y-4">
          {/* Action Bar */}
          <div className="flex justify-between items-center pb-2 border-b border-gray-200">
            <h2 className="text-base font-semibold text-gray-900">Account Mapping</h2>
            <a
              href={`/dashboard/projects/${params.id}/tax-calculation/adjustments`}
              className="px-3 py-1.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2 text-xs shadow-md hover:shadow-lg"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              AI Tax Adjustments
            </a>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Upload Section */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                <h3 className="text-sm font-semibold text-gray-900">Upload Trial Balance</h3>
              </div>
              <div className="flex justify-center px-4 pt-3 pb-4 border-2 border-blue-300 border-dashed rounded-lg bg-blue-50 transition-all duration-200 ease-in-out hover:bg-blue-100 hover:border-blue-400">
                <div className="space-y-1 text-center">
                  <svg className="mx-auto h-8 w-8 text-blue-500" stroke="currentColor" fill="none" viewBox="0 0 48 48" aria-hidden="true">
                    <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <div className="flex text-xs text-gray-700 justify-center">
                    <label htmlFor="file-upload" className="relative cursor-pointer rounded-md font-semibold text-blue-600 hover:text-blue-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500">
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
                  <p className="text-xs text-gray-600 font-medium">Excel or CSV files</p>
                </div>
              </div>
            </div>

            {/* Download Section */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                <h3 className="text-sm font-semibold text-gray-900">Download Data</h3>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={downloadJson}
                  className="inline-flex items-center justify-center gap-2 px-3 py-2 border border-gray-300 shadow-sm text-xs font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200 ease-in-out"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                  JSON
                </button>
                <button
                  onClick={downloadExcel}
                  className="inline-flex items-center justify-center gap-2 px-3 py-2 border border-gray-300 shadow-sm text-xs font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200 ease-in-out"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Excel
                </button>
              </div>
            </div>
          </div>

          {/* Financial Totals */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3 border-t border-gray-200">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-3 border border-blue-200 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-medium text-blue-900 mb-1">Balance Sheet Total</h3>
                  <p className={`text-xl font-bold tabular-nums ${totals.balanceSheet < 0 ? 'text-red-600' : 'text-blue-900'}`}>
                    {totals.balanceSheet < 0 ? `(${formatAmount(Math.abs(totals.balanceSheet))})` : formatAmount(totals.balanceSheet)}
                  </p>
                </div>
                <div className="bg-blue-200 bg-opacity-50 rounded-full p-2">
                  <svg className="w-5 h-5 text-blue-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                </div>
              </div>
            </div>
            <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-3 border border-green-200 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-medium text-green-900 mb-1">Income Statement Total</h3>
                  <p className={`text-xl font-bold tabular-nums ${totals.incomeStatement < 0 ? 'text-red-600' : 'text-green-900'}`}>
                    {totals.incomeStatement < 0 ? `(${formatAmount(Math.abs(totals.incomeStatement))})` : formatAmount(totals.incomeStatement)}
                  </p>
                </div>
                <div className="bg-green-200 bg-opacity-50 rounded-full p-2">
                  <svg className="w-5 h-5 text-green-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
            </div>
          </div>

          {/* Mapping Table */}
          {mappedData.length > 0 ? (
            <div className="pt-3">
              <h3 className="text-sm font-semibold text-gray-900 mb-2">Account Details</h3>
              <div className="rounded-lg border border-gray-200 overflow-hidden shadow-sm">
                <MappingTable mappedData={mappedData} onMappingUpdate={handleMappingUpdate} />
              </div>
            </div>
          ) : (
            <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <h3 className="mt-3 text-base font-medium text-gray-900">No data available</h3>
              <p className="mt-1 text-xs text-gray-500">Get started by uploading a trial balance file.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 