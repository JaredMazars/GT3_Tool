'use client';

import { useState, useEffect } from 'react';
import { formatAmount } from '@/lib/utils/formatters';
import { MappedData } from '@/types';
import ExcelJS from 'exceljs';
import { mappingGuide } from '@/lib/services/tasks/mappingGuide';
import { ProcessingModal } from '@/components/shared/ProcessingModal';
import { RemappingModal } from '@/components/tools/tax-calculation';
import { useMappedAccounts, useUpdateMappedAccount, useTask } from '@/hooks/tasks/useTaskData';
import { useQueryClient } from '@tanstack/react-query';

// Add type at the top of the file after imports
interface SarsItem {
  sarsItem: string;
}

interface ProcessingStage {
  id: number;
  title: string;
  description: string;
  status: 'pending' | 'in-progress' | 'complete';
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

/* Removed CustomSelect component - now using RemappingModal for all mapping operations */
/*function CustomSelect({ value, onChange, disabled }: CustomSelectProps) {
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
        className="w-full rounded-md border-0 py-1 pl-2 pr-8 text-left text-xs text-forvis-gray-900 shadow-sm ring-1 ring-inset ring-forvis-gray-300 focus:ring-2 focus:ring-inset focus:ring-forvis-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <span className="block truncate">{selectedLabel}</span>
        <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-1.5">
          <svg className="h-4 w-4 text-forvis-gray-400" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 3a1 1 0 01.707.293l3 3a1 1 0 01-1.414 1.414L10 5.414 7.707 7.707a1 1 0 01-1.414-1.414l3-3A1 1 0 0110 3zm-3.707 9.293a1 1 0 011.414 0L10 14.586l2.293-2.293a1 1 0 011.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </span>
      </button>
      {isOpen && (
        <div className="absolute left-0 z-10 mt-1 w-[400px] bg-white shadow-lg ring-1 ring-black ring-opacity-5 rounded-md focus:outline-none">
          <div className="sticky top-0 z-30 bg-white border-b border-forvis-gray-200">
            <div className="p-2">
              <div className="text-sm font-medium text-forvis-gray-900">Select SARS Item</div>
              <div className="text-xs text-forvis-gray-600 mt-0.5">All Available Items</div>
              <div className="mt-2 relative">
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search items..."
                  className="w-full rounded-md border-0 py-1 pl-7 pr-2 text-xs text-forvis-gray-900 ring-1 ring-inset ring-forvis-gray-300 placeholder:text-forvis-gray-400 focus:ring-2 focus:ring-inset focus:ring-forvis-blue-600"
                />
                <svg className="absolute left-2 top-1.5 h-3.5 w-3.5 text-forvis-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                {searchTerm && (
                  <button
                    type="button"
                    onClick={() => setSearchTerm('')}
                    className="absolute right-2 top-1.5 text-forvis-gray-400 hover:text-forvis-gray-600"
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
                  <div className="sticky top-0 z-20 bg-forvis-blue-50 px-2 py-1 border-b border-forvis-gray-200 shadow-sm">
                    <div className="text-xs font-bold text-forvis-blue-900">
                      {mainSection}
                    </div>
                  </div>
                  {Object.entries(sectionData).map(([subsection, items]) => (
                    <div key={subsection} className="relative">
                      <div className="sticky top-6 z-10 bg-forvis-gray-50 px-2 py-1 border-b border-forvis-gray-200">
                        <div className="text-xs font-medium text-forvis-gray-900">
                          {subsectionDisplayNames[subsection] || subsection}
                        </div>
                      </div>
                      <div className="flex flex-col divide-y divide-forvis-gray-100">
                        {items.map((item: SarsItem) => (
                          <button
                            key={item.sarsItem}
                            type="button"
                            onClick={() => {
                              onChange(item.sarsItem, mainSection, subsection);
                              setIsOpen(false);
                              setSearchTerm('');
                            }}
                            className={`w-full px-2 py-1.5 text-left text-xs hover:bg-forvis-gray-50 focus:bg-forvis-gray-50 focus:outline-none ${
                              value === item.sarsItem
                                ? 'bg-forvis-blue-50 text-forvis-blue-900 font-medium'
                                : 'text-forvis-gray-700'
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
              <div className="p-2 text-center text-xs text-forvis-gray-600">
                No items match your search
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}*/

interface MappingTableProps {
  mappedData: MappedData[];
  onMappingUpdate: (accountId: number, newSarsItem: string, newSection: string, newSubsection: string) => Promise<void>;
}

function MappingTable({ mappedData, onMappingUpdate, onRowClick }: MappingTableProps & { onRowClick?: () => void }) {
  return (
    <div className="overflow-x-auto">
      {/* Header Row - matching balance sheet style exactly */}
      <div
        className="grid py-2 shadow-sm"
        style={{
          background: 'linear-gradient(to right, #2E5AAC, #25488A)',
          gridTemplateColumns: '80px 200px 120px 150px 120px 120px 1fr'
        }}
      >
        <div className="px-3 text-left text-xs font-bold text-white uppercase tracking-wider">
          Code
        </div>
        <div className="px-3 text-left text-xs font-bold text-white uppercase tracking-wider">
          Account Name
        </div>
        <div className="px-3 text-left text-xs font-bold text-white uppercase tracking-wider">
          Section
        </div>
        <div className="px-3 text-left text-xs font-bold text-white uppercase tracking-wider">
          Subsection
        </div>
        <div className="px-3 text-right text-xs font-bold text-white uppercase tracking-wider">
          Current Year (R)
        </div>
        <div className="px-3 text-right text-xs font-bold text-white uppercase tracking-wider">
          Prior Year (R)
        </div>
        <div className="px-3 text-left text-xs font-bold text-white uppercase tracking-wider">
          SARS Item
        </div>
      </div>

      {/* Data Rows - matching balance sheet style exactly */}
      <div className="divide-y divide-forvis-gray-100">
        {mappedData.map((item, index) => (
          <div
            key={item.id}
            onClick={onRowClick}
            className={`grid cursor-pointer hover:bg-forvis-blue-50 transition-colors duration-150 ${index % 2 === 0 ? 'bg-white' : 'bg-forvis-gray-50'
              }`}
            style={{ gridTemplateColumns: '80px 200px 120px 150px 120px 120px 1fr' }}
          >
            <div className="px-3 py-1.5 text-xs font-medium text-forvis-gray-900">
              {item.accountCode}
            </div>
            <div className="px-3 py-1.5 text-xs text-forvis-gray-900 truncate" title={item.accountName}>
              {item.accountName}
            </div>
            <div className="px-3 py-1.5 text-xs">
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-forvis-blue-100 text-forvis-blue-800">
                {item.section}
              </span>
            </div>
            <div className="px-3 py-1.5 text-xs text-forvis-gray-700 truncate" title={subsectionDisplayNames[item.subsection] || item.subsection}>
              {subsectionDisplayNames[item.subsection] || item.subsection}
            </div>
            <div className={`px-3 py-1.5 text-xs text-right tabular-nums font-medium ${item.balance < 0 ? 'text-red-600' : 'text-forvis-gray-900'
              }`}>
              {item.balance < 0 ? `(${formatAmount(Math.abs(item.balance))})` : formatAmount(item.balance)}
            </div>
            <div className={`px-3 py-1.5 text-xs text-right tabular-nums font-medium ${item.priorYearBalance < 0 ? 'text-red-600' : 'text-forvis-gray-600'
              }`}>
              {item.priorYearBalance < 0 ? `(${formatAmount(Math.abs(item.priorYearBalance))})` : formatAmount(item.priorYearBalance)}
            </div>
            <div className="px-3 py-1.5 text-xs text-forvis-gray-900 truncate" title={item.sarsItem}>
              {item.sarsItem}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

interface MappingPageProps {
  params: { id: string };
}

export default function MappingPage({ params }: { params: { id: string } }) {
  // Note: In client components, params is already resolved (not a Promise)
  const queryClient = useQueryClient();
  const { data: project } = useTask(params.id);
  const { data: mappedData = [], isLoading, error: queryError } = useMappedAccounts(params.id);
  const updateMappedAccount = useUpdateMappedAccount(params.id);

  const [error, setError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isRemappingModalOpen, setIsRemappingModalOpen] = useState(false);
  const [processingStages, setProcessingStages] = useState<ProcessingStage[]>([
    {
      id: 1,
      title: 'Parsing Trial Balance',
      description: 'Reading and validating your Excel file...',
      status: 'pending'
    },
    {
      id: 2,
      title: 'Mapping Income Statement',
      description: 'Using AI to map income statement accounts to SARS categories...',
      status: 'pending'
    },
    {
      id: 3,
      title: 'Mapping Balance Sheet',
      description: 'Using AI to map balance sheet accounts to SARS categories...',
      status: 'pending'
    },
    {
      id: 4,
      title: 'Saving to Database',
      description: 'Storing mapped accounts in the database...',
      status: 'pending'
    }
  ]);

  const taskName = project?.name || '';

  // Reset stages to initial state when not uploading
  useEffect(() => {
    if (!isUploading) {
      setProcessingStages([
        {
          id: 1,
          title: 'Parsing Trial Balance',
          description: 'Reading and validating your Excel file...',
          status: 'pending'
        },
        {
          id: 2,
          title: 'Mapping Income Statement',
          description: 'Using AI to map income statement accounts to SARS categories...',
          status: 'pending'
        },
        {
          id: 3,
          title: 'Mapping Balance Sheet',
          description: 'Using AI to map balance sheet accounts to SARS categories...',
          status: 'pending'
        },
        {
          id: 4,
          title: 'Saving to Database',
          description: 'Storing mapped accounts in the database...',
          status: 'pending'
        }
      ]);
    }
  }, [isUploading]);

  // Set error from query if it exists
  useEffect(() => {
    if (queryError) {
      setError(queryError instanceof Error ? queryError.message : 'An error occurred');
    }
  }, [queryError]);

  const handleMappingUpdate = async (accountId: number, newSarsItem: string, newSection: string, newSubsection: string) => {
    try {
      await updateMappedAccount.mutateAsync({
        accountId,
        sarsItem: newSarsItem,
        section: newSection,
        subsection: newSubsection,
      });
    } catch (error) {
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
      formData.append('taskId', params.id);
      formData.append('stream', 'true'); // Enable streaming

      const response = await fetch('/api/map', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to upload file');
      }

      // Handle SSE streaming
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let finalData = null;

      while (reader) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = JSON.parse(line.slice(6));

            if (data.type === 'error') {
              throw new Error(data.message);
            } else if (data.type === 'complete') {
              finalData = data.data;
            } else if (data.stage && data.status) {
              // Update stage status
              setProcessingStages(prev => prev.map(stage => {
                if (stage.id === data.stage) {
                  return { ...stage, status: data.status };
                } else if (stage.id < data.stage) {
                  return { ...stage, status: 'complete' };
                } else if (stage.id === data.stage + 1 && data.status === 'complete') {
                  return { ...stage, status: 'in-progress' };
                }
                return stage;
              }));
            }
          }
        }
      }

      if (finalData) {
        // Brief delay to show completion before closing modal
        await new Promise(resolve => setTimeout(resolve, 800));

        // Invalidate mapped accounts query to refetch data
        queryClient.invalidateQueries({ queryKey: ['tasks', params.id, 'mapped-accounts'] });
      } else {
        throw new Error('No data received from server');
      }
    } catch (error) {
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
    a.download = `${taskName.toLowerCase().replace(/\s+/g, '-')}-mapped-data.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const downloadExcel = async () => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Mapped Data');

    worksheet.columns = [
      { header: 'ID', key: 'id', width: 10 },
      { header: 'Account Code', key: 'accountCode', width: 15 },
      { header: 'Account Name', key: 'accountName', width: 30 },
      { header: 'Section', key: 'section', width: 20 },
      { header: 'Subsection', key: 'subsection', width: 20 },
      { header: 'Balance', key: 'balance', width: 15 },
      { header: 'Prior Year Balance', key: 'priorYearBalance', width: 15 },
      { header: 'SARS Item', key: 'sarsItem', width: 30 },
    ];

    worksheet.addRows(mappedData);

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${taskName.toLowerCase().replace(/\s+/g, '-')}-mapped-data.xlsx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
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
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-forvis-blue-600"></div>
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
    <>
      <ProcessingModal isOpen={isUploading} stages={processingStages} />
      <RemappingModal
        isOpen={isRemappingModalOpen}
        onClose={() => setIsRemappingModalOpen(false)}
        mappedData={mappedData}
        onMappingUpdate={handleMappingUpdate}
      />

      <div className="space-y-4">
        {/* Stats Dashboard */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div
            className="rounded-lg p-3 shadow-corporate text-white"
            style={{ background: 'linear-gradient(to bottom right, #2E5AAC, #25488A)' }}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium opacity-90">Total Accounts</p>
                <p className="text-2xl font-bold mt-1">{totalAccounts}</p>
              </div>
              <div className="rounded-full p-2" style={{ backgroundColor: 'rgba(28, 54, 103, 0.5)' }}>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
            </div>
          </div>

          <div
            className="rounded-lg p-3 shadow-corporate text-white"
            style={{ background: 'linear-gradient(to bottom right, #5B93D7, #2E5AAC)' }}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium opacity-90">Completion Rate</p>
                <p className="text-2xl font-bold mt-1">{completionPercentage}%</p>
              </div>
              <div className="rounded-full p-2" style={{ backgroundColor: 'rgba(37, 72, 138, 0.5)' }}>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <div className="mt-2 rounded-full h-1.5" style={{ backgroundColor: 'rgba(28, 54, 103, 0.3)' }}>
              <div
                className="bg-white h-1.5 rounded-full transition-all duration-500"
                style={{ width: `${completionPercentage}%` }}
              />
            </div>
          </div>

          <div
            className="rounded-lg p-3 shadow-corporate text-white"
            style={{ background: 'linear-gradient(to bottom right, #25488A, #1C3667)' }}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium opacity-90">Balance Sheet</p>
                <p className="text-2xl font-bold mt-1">{balanceSheetAccounts}</p>
              </div>
              <div className="rounded-full p-2" style={{ backgroundColor: 'rgba(19, 36, 69, 0.5)' }}>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
              </div>
            </div>
          </div>

          <div
            className="rounded-lg p-3 shadow-corporate text-white"
            style={{ background: 'linear-gradient(to bottom right, #1C3667, #132445)' }}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium opacity-90">Income Statement</p>
                <p className="text-2xl font-bold mt-1">{incomeStatementAccounts}</p>
              </div>
              <div className="rounded-full p-2" style={{ backgroundColor: 'rgba(10, 18, 34, 0.5)' }}>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Actions and Upload Section */}
        <div className="bg-white rounded-lg shadow-corporate border-2 overflow-hidden" style={{ borderColor: '#2E5AAC' }}>
          <div className="space-y-4">
            {/* Action Bar */}
            <div className="flex justify-between items-center p-4" style={{ background: 'linear-gradient(135deg, #5B93D7 0%, #2E5AAC 50%, #1C3667 100%)' }}>
              <h2 className="text-lg font-bold text-white">Account Mapping</h2>
              <div className="flex gap-3">
                <button
                  onClick={() => setIsRemappingModalOpen(true)}
                  disabled={mappedData.length === 0}
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-white/20 hover:bg-white/30 disabled:bg-white/10 rounded-lg border-2 border-white/40 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Bulk Remap
                </button>
                <a
                  href={`/dashboard/tasks/${params.id}/tax-calculation/adjustments`}
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-white/20 hover:bg-white/30 rounded-lg border-2 border-white/40 transition-all duration-200 shadow-lg"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  AI Tax Adjustments
                </a>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 px-4 pb-4">
              {/* Upload Section */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 justify-between px-3 py-2 rounded-lg" style={{ background: 'linear-gradient(135deg, #E0EDFB 0%, #C7DDEF 100%)', borderLeft: '4px solid #2E5AAC' }}>
                  <div className="flex items-center gap-2">
                    <svg className="w-5 h-5" style={{ color: '#2E5AAC' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                    <h3 className="text-sm font-bold" style={{ color: '#1C3667' }}>Upload Trial Balance</h3>
                  </div>
                  <a
                    href="/trial-balance-template.xlsx"
                    download="trial-balance-template.xlsx"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white rounded-lg shadow-lg hover:shadow-xl transition-all"
                    style={{ background: 'linear-gradient(135deg, #5B93D7 0%, #2E5AAC 100%)' }}
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    Download Template
                  </a>
                </div>

                {/* File Format Guidance */}
                <details className="group">
                  <summary className="cursor-pointer text-xs font-bold flex items-center gap-1 px-2 py-1" style={{ color: '#2E5AAC' }}>
                    <svg className="w-4 h-4 transition-transform group-open:rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                    File Format Requirements
                  </summary>
                  <div className="mt-2 p-4 rounded-lg border-2 text-xs space-y-3" style={{ background: 'linear-gradient(135deg, #F8FBFE 0%, #EEF6FC 100%)', borderColor: '#2E5AAC' }}>
                    <div>
                      <p className="font-bold mb-2" style={{ color: '#1C3667' }}>Required Columns:</p>
                      <ul className="list-disc list-inside text-forvis-gray-700 space-y-1 ml-2">
                        <li><span className="font-semibold">Account Code</span> (e.g., &quot;1000&quot;, &quot;2000&quot;)</li>
                        <li><span className="font-semibold">Account Name</span> (e.g., &quot;Cash at Bank&quot;)</li>
                        <li><span className="font-semibold">Section</span> (must be &quot;Balance Sheet&quot; or &quot;Income Statement&quot;)</li>
                        <li><span className="font-semibold">Balance</span> (current year numeric values)</li>
                        <li><span className="font-semibold">Prior Year Balance</span> (prior year numeric values for comparative reporting)</li>
                      </ul>
                    </div>
                    <div>
                      <p className="font-bold mb-2" style={{ color: '#1C3667' }}>Balance Conventions:</p>
                      <ul className="list-disc list-inside text-forvis-gray-700 space-y-1 ml-2">
                        <li><span className="font-semibold">Income Statement:</span> Negative = income, Positive = expenses</li>
                        <li><span className="font-semibold">Balance Sheet:</span> Negative = liabilities/equity, Positive = assets</li>
                      </ul>
                    </div>
                    <div>
                      <p className="font-bold mb-2" style={{ color: '#1C3667' }}>File Requirements:</p>
                      <ul className="list-disc list-inside text-forvis-gray-700 space-y-1 ml-2">
                        <li>Formats: Excel (.xlsx, .xls) or CSV (.csv)</li>
                        <li>System reads the first sheet only</li>
                        <li>Headers must be in the first row</li>
                      </ul>
                    </div>
                  </div>
                </details>

                <div className="flex justify-center px-6 pt-5 pb-6 border-3 border-dashed rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl" style={{ borderColor: '#2E5AAC', borderWidth: '3px', background: 'linear-gradient(135deg, #F0F7FD 0%, #E5F1FB 100%)' }}>
                  <div className="space-y-2 text-center">
                    <svg className="mx-auto h-10 w-10" style={{ color: '#2E5AAC' }} stroke="currentColor" fill="none" viewBox="0 0 48 48" aria-hidden="true">
                      <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <div className="flex text-sm justify-center" style={{ color: '#1C3667' }}>
                      <label htmlFor="file-upload" className="relative cursor-pointer rounded-md font-bold transition-all" style={{ color: '#2E5AAC' }}>
                        <span className="hover:underline">{isUploading ? 'Uploading...' : 'Upload a file'}</span>
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
                      <p className="pl-1 font-medium">or drag and drop</p>
                    </div>
                    <p className="text-xs font-bold" style={{ color: '#2E5AAC' }}>Excel or CSV files</p>
                  </div>
                </div>
              </div>

              {/* Download Section */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ background: 'linear-gradient(135deg, #E0EDFB 0%, #C7DDEF 100%)', borderLeft: '4px solid #2E5AAC' }}>
                  <svg className="w-5 h-5" style={{ color: '#2E5AAC' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  <h3 className="text-sm font-bold" style={{ color: '#1C3667' }}>Download Data</h3>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={downloadJson}
                    className="inline-flex items-center justify-center gap-2 px-4 py-3 text-sm font-bold text-white rounded-lg shadow-lg hover:shadow-xl transition-all duration-200"
                    style={{ background: 'linear-gradient(135deg, #5B93D7 0%, #2E5AAC 100%)' }}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                    JSON
                  </button>
                  <button
                    onClick={downloadExcel}
                    className="inline-flex items-center justify-center gap-2 px-4 py-3 text-sm font-bold text-white rounded-lg shadow-lg hover:shadow-xl transition-all duration-200"
                    style={{ background: 'linear-gradient(135deg, #5B93D7 0%, #2E5AAC 100%)' }}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Excel
                  </button>
                </div>
              </div>
            </div>

            {/* Financial Totals */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 px-4 pb-4 pt-5 border-t-2" style={{ borderColor: '#2E5AAC' }}>
              <div className="rounded-xl p-4 border-2 shadow-corporate" style={{ background: 'linear-gradient(135deg, #F0F7FD 0%, #E0EDFB 100%)', borderColor: '#2E5AAC' }}>
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wide mb-2" style={{ color: '#1C3667' }}>Balance Sheet Total</h3>
                    <p className={`text-2xl font-bold tabular-nums ${totals.balanceSheet < 0 ? 'text-red-600' : ''}`} style={{ color: totals.balanceSheet < 0 ? undefined : '#2E5AAC' }}>
                      {totals.balanceSheet < 0 ? `(${formatAmount(Math.abs(totals.balanceSheet))})` : formatAmount(totals.balanceSheet)}
                    </p>
                  </div>
                  <div className="rounded-full p-3 shadow-lg" style={{ background: 'linear-gradient(135deg, #5B93D7 0%, #2E5AAC 100%)' }}>
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                  </div>
                </div>
              </div>
              <div className="rounded-xl p-4 border-2 shadow-corporate" style={{ background: 'linear-gradient(135deg, #F0F7FD 0%, #E0EDFB 100%)', borderColor: '#2E5AAC' }}>
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wide mb-2" style={{ color: '#1C3667' }}>Income Statement Total</h3>
                    <p className={`text-2xl font-bold tabular-nums ${totals.incomeStatement < 0 ? 'text-red-600' : ''}`} style={{ color: totals.incomeStatement < 0 ? undefined : '#2E5AAC' }}>
                      {totals.incomeStatement < 0 ? `(${formatAmount(Math.abs(totals.incomeStatement))})` : formatAmount(totals.incomeStatement)}
                    </p>
                  </div>
                  <div className="rounded-full p-3 shadow-lg" style={{ background: 'linear-gradient(135deg, #5B93D7 0%, #2E5AAC 100%)' }}>
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>

            {/* Mapping Table */}
            {mappedData.length > 0 ? (
              <div className="px-4 pb-4 pt-4">
                <div className="border-2 rounded-lg overflow-hidden shadow-sm" style={{ borderColor: '#25488A' }}>
                  <div
                    className="px-3 py-2 shadow-sm"
                    style={{ background: 'linear-gradient(to right, #2E5AAC, #25488A)' }}
                  >
                    <h3 className="text-sm font-bold text-white">Account Details</h3>
                  </div>
                  <div className="bg-white">
                    <MappingTable
                      mappedData={mappedData}
                      onMappingUpdate={handleMappingUpdate}
                      onRowClick={() => setIsRemappingModalOpen(true)}
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="mx-4 mb-4 text-center py-16 rounded-xl border-3 border-dashed shadow-lg" style={{ borderColor: '#2E5AAC', borderWidth: '3px', background: 'linear-gradient(135deg, #F8FBFE 0%, #EEF6FC 100%)' }}>
                <svg className="mx-auto h-16 w-16" style={{ color: '#2E5AAC' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <h3 className="mt-4 text-lg font-bold" style={{ color: '#1C3667' }}>No data available</h3>
                <p className="mt-2 text-sm font-medium" style={{ color: '#2E5AAC' }}>Get started by uploading a trial balance file above.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
} 