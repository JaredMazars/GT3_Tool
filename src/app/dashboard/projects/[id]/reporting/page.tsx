'use client';

import { useState, useEffect } from 'react';
import { DocumentArrowDownIcon } from '@heroicons/react/24/outline';
import TrialBalanceReport from '@/components/reports/TrialBalanceReport';
import BalanceSheetReport from '@/components/reports/BalanceSheetReport';
import IncomeStatementReport from '@/components/reports/IncomeStatementReport';
import TaxCalculationReport from '@/components/reports/TaxCalculationReport';
import AITaxReport from '@/components/reports/AITaxReport';
import { generateReportingPackPDF } from '@/lib/pdfExporter';
import { MappedData } from '@/types';
import { AITaxReportData } from '@/lib/aiTaxReportGenerator';

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
  const [activeTab, setActiveTab] = useState('trialBalance');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  
  // Data states
  const [trialBalanceData, setTrialBalanceData] = useState<TrialBalanceData | null>(null);
  const [mappedData, setMappedData] = useState<MappedData[]>([]);
  const [accountingProfit, setAccountingProfit] = useState(0);
  const [adjustments, setAdjustments] = useState<TaxAdjustment[]>([]);
  const [projectName, setProjectName] = useState('');

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

  useEffect(() => {
    fetchAllData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  const fetchAllData = async () => {
    try {
      setIsLoading(true);

      // Fetch project details
      const projectResponse = await fetch(`/api/projects/${params.id}`);
      if (projectResponse.ok) {
        const projectData = await projectResponse.json();
        setProjectName(projectData.name);
      }

      // Fetch trial balance
      const trialBalanceResponse = await fetch(`/api/projects/${params.id}/trial-balance`);
      if (trialBalanceResponse.ok) {
        const data = await trialBalanceResponse.json();
        setTrialBalanceData(data);
      }

      // Fetch mapped accounts for balance sheet and income statement
      const mappedResponse = await fetch(`/api/projects/${params.id}/mapped-accounts`);
      if (mappedResponse.ok) {
        const data = await mappedResponse.json();
        setMappedData(data);
      }

      // Fetch tax calculation data
      const taxCalcResponse = await fetch(`/api/projects/${params.id}/tax-calculation`);
      if (taxCalcResponse.ok) {
        const data = await taxCalcResponse.json();
        setAccountingProfit(data.netProfit || 0);
      }

      // Fetch tax adjustments
      const adjustmentsResponse = await fetch(`/api/projects/${params.id}/tax-adjustments`);
      if (adjustmentsResponse.ok) {
        const data = await adjustmentsResponse.json();
        setAdjustments(data);
      }

      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load reporting data');
    } finally {
      setIsLoading(false);
    }
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
        projectName,
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
        alert('Please select at least one report to export');
        return;
      }

      const pdfBlob = await generateReportingPackPDF(reportData, selectedReportsList);

      // Download the PDF
      const url = URL.createObjectURL(pdfBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${projectName}-reporting-pack-${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error exporting PDF:', err);
      alert('Failed to export PDF. Please try again.');
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
        <p className="text-sm text-red-600">{error}</p>
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
      component: <AITaxReport projectId={parseInt(params.id)} onReportLoaded={handleAIReportLoaded} />,
    },
  ];

  const activeTabData = tabs.find(tab => tab.id === activeTab);

  return (
    <div className="space-y-4">
      {/* Action Bar */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <div>
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
                className="px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
              >
                Select All
              </button>
              <button
                onClick={handleDeselectAll}
                className="px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                Deselect All
              </button>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleExportPDF}
              disabled={isExporting}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 flex items-center gap-2 shadow-md hover:shadow-lg transition-all"
            >
              {isExporting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span className="text-sm font-medium">Generating PDF...</span>
                </>
              ) : (
                <>
                  <DocumentArrowDownIcon className="h-5 w-5" />
                  <span className="text-sm font-medium">Export to PDF</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-4 px-4" aria-label="Tabs">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-3 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.id
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
    </div>
  );
}

