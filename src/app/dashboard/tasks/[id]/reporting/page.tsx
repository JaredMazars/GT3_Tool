'use client';

import { useState, useEffect } from 'react';
import { FileDown } from 'lucide-react';
import TrialBalanceReport from '@/components/features/reports/TrialBalanceReport';
import BalanceSheetReport from '@/components/features/reports/BalanceSheetReport';
import IncomeStatementReport from '@/components/features/reports/IncomeStatementReport';
import { TaxCalculationReport } from '@/components/tools/tax-calculation';
import { AITaxReport } from '@/components/tools/tax-opinion';
import { AlertModal } from '@/components/shared/AlertModal';

import { MappedData } from '@/types';
import { AITaxReportData } from '@/lib/tools/tax-opinion/services/aiTaxReportGenerator';
import { useTask, useMappedAccounts, useTaxAdjustments, useTaxCalculation, useTrialBalance } from '@/hooks/tasks/useTaskData';

interface ReportingPageProps {
  params: { id: string };
}

interface TrialBalanceAccount {
  id: number;
  accountCode: string;
  accountName: string;
  balance: number;
  priorYearBalance: number;
  sarsItem: string;
  section: string;
  subsection: string;
}

interface TrialBalanceData {
  accounts: TrialBalanceAccount[];
  totals: { currentYear: number; priorYear: number };
}

interface TaxAdjustment {
  id: number;
  type: 'DEBIT' | 'CREDIT' | 'ALLOWANCE' | 'RECOUPMENT';
  description: string;
  amount: number;
  status: string;
  sarsSection?: string;
}

interface Tab {
  id: string;
  name: string;
  component: React.ReactNode;
}

export default function ReportingPage({ params }: ReportingPageProps) {
  // Note: In client components, params is already resolved (not a Promise)
  const [activeTab, setActiveTab] = useState('trialBalance');
  const [isExporting, setIsExporting] = useState(false);

  // Modal state
  const [alertModal, setAlertModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    variant?: 'success' | 'error' | 'warning' | 'info';
  }>({
    isOpen: false,
    title: '',
    message: '',
    variant: 'info',
  });

  const { data: project } = useTask(params.id);
  const { data: trialBalanceData, isLoading: isLoadingTrialBalance, error: trialBalanceError } = useTrialBalance(params.id);
  const { data: mappedData = [], isLoading: isLoadingMapped, error: mappedError } = useMappedAccounts(params.id);
  const { data: taxCalcData, isLoading: isLoadingTaxCalc, error: taxCalcError } = useTaxCalculation(params.id);
  const { data: adjustments = [], isLoading: isLoadingAdjustments, error: adjustmentsError } = useTaxAdjustments(params.id);

  const taskName = project?.name || '';
  const accountingProfit = taxCalcData?.netProfit || 0;

  // Determine overall loading and error states
  const isLoading = isLoadingTrialBalance || isLoadingMapped || isLoadingTaxCalc || isLoadingAdjustments;
  const error = trialBalanceError || mappedError || taxCalcError || adjustmentsError;

  // Selected reports for PDF export
  const [selectedReports, setSelectedReports] = useState({
    trialBalance: true,
    balanceSheet: true,
    incomeStatement: true,
    taxCalculation: true,
    aiReport: false,
  });

  // AI Report state
  const [aiReportData, setAiReportData] = useState<AITaxReportData | null>(null);

  // Callback to receive AI report data from the component
  const handleAIReportLoaded = (report: AITaxReportData | null) => {
    setAiReportData(report);
  };

  const handleSelectAll = () => {
    setSelectedReports({
      trialBalance: true,
      balanceSheet: true,
      incomeStatement: true,
      taxCalculation: true,
      aiReport: aiReportData !== null,
    });
  };

  const handleDeselectAll = () => {
    setSelectedReports({
      trialBalance: false,
      balanceSheet: false,
      incomeStatement: false,
      taxCalculation: false,
      aiReport: false,
    });
  };

  const handleExportPDF = async () => {
    try {
      setIsExporting(true);

      // Prepare report data
      const reportData = {
        taskName,
        trialBalance: selectedReports.trialBalance && trialBalanceData ? trialBalanceData : undefined,
        balanceSheet: selectedReports.balanceSheet ? { mappedData, totals: {} } : undefined,
        incomeStatement: selectedReports.incomeStatement ? { mappedData, totals: {} } : undefined,
        taxCalculation: selectedReports.taxCalculation ? { accountingProfit, adjustments } : undefined,
        aiReport: selectedReports.aiReport && aiReportData ? aiReportData : undefined,
      };

      const selectedReportsList = Object.entries(selectedReports)
        .filter(([, selected]) => selected)
        .map(([key]) => key);

      if (selectedReportsList.length === 0) {
        setAlertModal({
          isOpen: true,
          title: 'No Reports Selected',
          message: 'Please select at least one report to export',
          variant: 'warning',
        });
        return;
      }

      const response = await fetch(`/api/tasks/${params.id}/reporting/export`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          reportData,
          selectedReports: selectedReportsList,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate PDF');
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${taskName}-reporting-pack-${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      setAlertModal({
        isOpen: true,
        title: 'Export Failed',
        message: 'Failed to export PDF. Please try again.',
        variant: 'error',
      });
    } finally {
      setIsExporting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-sm text-red-600">
          {error instanceof Error ? error.message : 'Failed to load reporting data'}
        </p>
      </div>
    );
  }

  const tabs: Tab[] = [
    {
      id: 'trialBalance',
      name: 'Trial Balance',
      component: trialBalanceData ? (
        <TrialBalanceReport accounts={trialBalanceData.accounts} />
      ) : (
        <div className="text-center py-8 text-gray-500">No trial balance data available</div>
      ),
    },
    {
      id: 'balanceSheet',
      name: 'Balance Sheet',
      component: mappedData.length > 0 ? (
        <BalanceSheetReport mappedData={mappedData} />
      ) : (
        <div className="text-center py-8 text-gray-500">No balance sheet data available</div>
      ),
    },
    {
      id: 'incomeStatement',
      name: 'Income Statement',
      component: mappedData.length > 0 ? (
        <IncomeStatementReport mappedData={mappedData} />
      ) : (
        <div className="text-center py-8 text-gray-500">No income statement data available</div>
      ),
    },
    {
      id: 'taxCalculation',
      name: 'Tax Calculation',
      component: (
        <TaxCalculationReport
          accountingProfit={accountingProfit}
          adjustments={adjustments}
        />
      ),
    },
    {
      id: 'aiReport',
      name: 'AI Tax Report',
      component: <AITaxReport taskId={parseInt(params.id)} onReportLoaded={handleAIReportLoaded} />,
    },
  ];

  const activeTabData = tabs.find(tab => tab.id === activeTab);

  return (
    <div className="space-y-4">
      {/* Action Bar */}
      <div className="bg-white rounded-lg shadow-md border border-gray-200 p-4">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
          <div className="flex-1">
            <h2 className="text-base font-semibold text-gray-900 mb-3">Select Reports for PDF Export</h2>
            <div className="flex flex-wrap gap-4">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedReports.trialBalance}
                  onChange={(e) =>
                    setSelectedReports({ ...selectedReports, trialBalance: e.target.checked })
                  }
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Trial Balance</span>
              </label>
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedReports.balanceSheet}
                  onChange={(e) =>
                    setSelectedReports({ ...selectedReports, balanceSheet: e.target.checked })
                  }
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Balance Sheet</span>
              </label>
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedReports.incomeStatement}
                  onChange={(e) =>
                    setSelectedReports({ ...selectedReports, incomeStatement: e.target.checked })
                  }
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Income Statement</span>
              </label>
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedReports.taxCalculation}
                  onChange={(e) =>
                    setSelectedReports({ ...selectedReports, taxCalculation: e.target.checked })
                  }
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Tax Calculation</span>
              </label>
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedReports.aiReport}
                  onChange={(e) =>
                    setSelectedReports({ ...selectedReports, aiReport: e.target.checked })
                  }
                  disabled={!aiReportData}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 disabled:opacity-50"
                />
                <span className={`text-sm ${aiReportData ? 'text-gray-700' : 'text-gray-400'}`}>
                  AI Tax Report {!aiReportData && '(Generate first)'}
                </span>
              </label>
            </div>
            <div className="flex gap-2 mt-3">
              <button
                onClick={handleSelectAll}
                className="px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors shadow-sm"
              >
                Select All
              </button>
              <button
                onClick={handleDeselectAll}
                className="px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors shadow-sm"
              >
                Deselect All
              </button>
            </div>
          </div>
          <div className="flex-shrink-0">
            <button
              onClick={handleExportPDF}
              disabled={isExporting}
              className="w-full lg:w-auto px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all font-medium"
              style={{ backgroundColor: isExporting ? '#9CA3AF' : '#2E5AAC' }}
            >
              {isExporting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span className="text-sm font-medium">Generating PDF...</span>
                </>
              ) : (
                <>
                  <FileDown className="h-5 w-5" />
                  <span className="text-sm font-medium">Export to PDF</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-4 px-4" aria-label="Tabs">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-3 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === tab.id
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
              >
                {tab.name}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-4">
          {activeTabData?.component}
        </div>
      </div>

      {/* Modals */}
      <AlertModal
        isOpen={alertModal.isOpen}
        onClose={() => setAlertModal((prev) => ({ ...prev, isOpen: false }))}
        title={alertModal.title}
        message={alertModal.message}
        variant={alertModal.variant}
      />
    </div>
  );
}
