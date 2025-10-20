'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { formatAmount } from '@/lib/formatters';
import TaxAdjustmentCard from '@/components/TaxAdjustmentCard';
import ExportMenu from '@/components/ExportMenu';
import AddAdjustmentModal from '@/components/AddAdjustmentModal';

interface TaxCalculationProps {
  params: { id: string };
}

interface TaxAdjustment {
  id: number;
  type: 'DEBIT' | 'CREDIT' | 'ALLOWANCE' | 'RECOUPMENT';
  description: string;
  amount: number;
  status: string;
  sarsSection?: string;
  confidenceScore?: number;
  notes?: string;
}

export default function TaxCalculationPage({ params }: TaxCalculationProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [adjustments, setAdjustments] = useState<TaxAdjustment[]>([]);
  const [accountingProfit, setAccountingProfit] = useState(0);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showAddModal, setShowAddModal] = useState<'DEBIT' | 'CREDIT' | 'ALLOWANCE' | 'RECOUPMENT' | null>(null);

  useEffect(() => {
    fetchData();
  }, [params.id]);

  const fetchData = async () => {
    try {
      setIsLoading(true);

      // Fetch accounting profit from income statement
      const incomeResponse = await fetch(`/api/projects/${params.id}/tax-calculation`);
      if (incomeResponse.ok) {
        const response = await incomeResponse.json();
        const incomeData = response.data || response;
        setAccountingProfit(incomeData.netProfit || 0);
      }

      // Fetch tax adjustments
      const adjustmentsResponse = await fetch(`/api/projects/${params.id}/tax-adjustments`);
      if (adjustmentsResponse.ok) {
        const adjustmentsData = await adjustmentsResponse.json();
        setAdjustments(adjustmentsData.data || adjustmentsData);
      }

      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateSuggestions = async () => {
    try {
      setIsGenerating(true);
      const response = await fetch(
        `/api/projects/${params.id}/tax-adjustments/suggestions`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ useAI: true, autoSave: true }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate suggestions');
      }

      await fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate suggestions');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleApprove = async (id: number) => {
    try {
      const response = await fetch(
        `/api/projects/${params.id}/tax-adjustments/${id}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'APPROVED' }),
        }
      );

      if (!response.ok) throw new Error('Failed to approve adjustment');
      await fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to approve');
    }
  };

  const handleReject = async (id: number) => {
    try {
      const response = await fetch(
        `/api/projects/${params.id}/tax-adjustments/${id}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'REJECTED' }),
        }
      );

      if (!response.ok) throw new Error('Failed to reject adjustment');
      await fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reject');
    }
  };

  const handleModify = (id: number) => {
    router.push(`/dashboard/projects/${params.id}/tax-calculation/adjustments/${id}`);
  };

  const handleModalSuccess = async () => {
    await fetchData();
  };

  // Calculate totals
  const suggestedAdjustments = adjustments.filter(a => a.status === 'SUGGESTED');
  const approvedAdjustments = adjustments.filter(a => a.status === 'APPROVED' || a.status === 'MODIFIED');
  
  const debitAdjustments = approvedAdjustments.filter(a => a.type === 'DEBIT');
  const creditAdjustments = approvedAdjustments.filter(a => a.type === 'CREDIT');
  const allowanceAdjustments = approvedAdjustments.filter(a => a.type === 'ALLOWANCE');
  const recoupmentAdjustments = approvedAdjustments.filter(a => a.type === 'RECOUPMENT');

  const totalDebits = debitAdjustments.reduce((sum, a) => sum + Math.abs(a.amount), 0);
  const totalCredits = creditAdjustments.reduce((sum, a) => sum + Math.abs(a.amount), 0);
  const totalAllowances = allowanceAdjustments.reduce((sum, a) => sum + Math.abs(a.amount), 0);
  const totalRecoupments = recoupmentAdjustments.reduce((sum, a) => sum + Math.abs(a.amount), 0);

  const taxableIncome = accountingProfit + totalDebits - totalCredits - totalAllowances + totalRecoupments;
  const corporateTaxRate = 0.27; // 27% for companies
  const taxLiability = Math.max(0, taxableIncome) * corporateTaxRate;

  const renderAdjustmentList = (adjustmentsList: TaxAdjustment[]) => {
    if (adjustmentsList.length === 0) {
      return <p className="text-xs text-gray-500 pl-3">None</p>;
    }

    return (
      <div className="space-y-0.5">
        {adjustmentsList.map((adj) => (
          <div 
            key={adj.id} 
            className="hover:bg-blue-50 py-1 cursor-pointer transition-colors"
            onClick={() => router.push(`/dashboard/projects/${params.id}/tax-calculation/adjustments/${adj.id}`)}
          >
            <div className="grid grid-cols-12 text-xs items-center">
              <div className="col-span-9 pl-3">
                <div className="flex items-center gap-2">
                  {adj.sarsSection && (
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-gray-100 text-gray-700 border border-gray-300">
                      {adj.sarsSection}
                    </span>
                  )}
                  <span>{adj.description}</span>
                </div>
              </div>
              <div className="col-span-3 text-right px-3 tabular-nums font-medium">
                {formatAmount(Math.abs(adj.amount))}
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Calculate completion percentage
  const totalAdjustments = adjustments.length;
  const processedAdjustments = adjustments.filter(a => a.status !== 'SUGGESTED').length;
  const completionPercentage = totalAdjustments > 0 ? Math.round((processedAdjustments / totalAdjustments) * 100) : 0;

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg shadow-lg p-3 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-xs font-medium">Accounting Profit</p>
              <p className="text-xl font-bold mt-1">{formatAmount(accountingProfit)}</p>
            </div>
            <div className="bg-blue-400 bg-opacity-30 rounded-full p-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg shadow-lg p-3 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-100 text-xs font-medium">Taxable Income</p>
              <p className="text-xl font-bold mt-1">{formatAmount(taxableIncome)}</p>
            </div>
            <div className="bg-purple-400 bg-opacity-30 rounded-full p-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg shadow-lg p-3 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-100 text-xs font-medium">Tax Liability</p>
              <p className="text-xl font-bold mt-1">{formatAmount(taxLiability)}</p>
            </div>
            <div className="bg-green-400 bg-opacity-30 rounded-full p-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg shadow-lg p-3 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-orange-100 text-xs font-medium">Adjustments</p>
              <p className="text-xl font-bold mt-1">{approvedAdjustments.length}</p>
              <div className="flex gap-2 mt-1 text-xs text-orange-100">
                <span>{debitAdjustments.length} Debit</span>
                <span>•</span>
                <span>{creditAdjustments.length} Credit</span>
                <span>•</span>
                <span>{allowanceAdjustments.length} Allow</span>
                <span>•</span>
                <span>{recoupmentAdjustments.length} Recoup</span>
              </div>
            </div>
            <div className="bg-orange-400 bg-opacity-30 rounded-full p-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Action Bar */}
      <div className="flex items-center justify-end bg-white rounded-lg shadow-sm border border-gray-200 p-3">
        <div className="flex gap-2">
          <ExportMenu projectId={parseInt(params.id)} />
          <button
            onClick={() => router.push(`/dashboard/projects/${params.id}/tax-calculation/adjustments`)}
            className="px-3 py-1.5 text-xs bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors shadow-md hover:shadow-lg"
          >
            Manage All Adjustments
          </button>
          <button
            onClick={handleGenerateSuggestions}
            disabled={isGenerating}
            className="px-3 py-1.5 text-xs bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-400 flex items-center gap-2 transition-colors shadow-md hover:shadow-lg"
          >
            {isGenerating ? (
              <>
                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                Generating...
              </>
            ) : (
              <>
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                Generate AI Suggestions
              </>
            )}
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {/* Suggested Adjustments */}
      {suggestedAdjustments.length > 0 && showSuggestions && (
        <div className="mb-4 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-semibold text-yellow-900">
              AI Suggested Adjustments ({suggestedAdjustments.length})
            </h2>
            <button
              onClick={() => setShowSuggestions(false)}
              className="text-yellow-600 hover:text-yellow-800"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="space-y-2">
            {suggestedAdjustments.map((adj) => (
              <TaxAdjustmentCard
                key={adj.id}
                adjustment={adj}
                onApprove={handleApprove}
                onReject={handleReject}
                onModify={handleModify}
                showActions={true}
              />
            ))}
          </div>
        </div>
      )}

      {/* Main Calculation */}
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-4">
        <div className="space-y-3">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-gray-400 pb-2">
            <h1 className="text-xl font-bold text-gray-900">TAX COMPUTATION</h1>
            <div className="text-right font-semibold text-gray-700">R</div>
          </div>

          {/* Accounting Profit */}
          <div className={`grid grid-cols-12 font-bold text-sm border rounded-lg p-3 ${
            accountingProfit >= 0 
              ? 'bg-gradient-to-r from-blue-50 to-blue-100 border-blue-300' 
              : 'bg-gradient-to-r from-gray-50 to-gray-100 border-gray-300'
          }`}>
            <div className={`col-span-9 ${accountingProfit >= 0 ? 'text-blue-900' : 'text-gray-900'}`}>Accounting Profit / (Loss)</div>
            <div className={`col-span-3 text-right px-3 text-xs tabular-nums ${accountingProfit < 0 ? 'text-red-600' : (accountingProfit >= 0 ? 'text-blue-900' : 'text-gray-900')}`}>
              {accountingProfit < 0 ? `(${formatAmount(Math.abs(accountingProfit))})` : formatAmount(accountingProfit)}
            </div>
          </div>

          {/* Debit Adjustments */}
          <div className="border border-orange-200 rounded-lg overflow-hidden">
            <div className="bg-gradient-to-r from-orange-100 to-orange-200 p-3">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold text-orange-900 flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Add: Debit Adjustments
                  <span className="text-xs font-normal text-orange-700">(increase taxable income)</span>
                </h2>
                <button
                  onClick={() => setShowAddModal('DEBIT')}
                  className="px-2 py-1 text-xs bg-orange-600 text-white rounded hover:bg-orange-700 flex items-center gap-1 transition-colors"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Add Manual
                </button>
              </div>
            </div>
            <div className="bg-white p-3">
              {renderAdjustmentList(debitAdjustments)}
              <div className="grid grid-cols-12 font-bold border-t border-orange-300 bg-orange-50 rounded-b-lg pt-2 mt-2">
                <div className="col-span-9 px-2 text-xs text-orange-900">Total Debit Adjustments</div>
                <div className="col-span-3 text-right px-3 text-xs tabular-nums text-orange-900">
                  {formatAmount(totalDebits)}
                </div>
              </div>
            </div>
          </div>

          {/* Credit Adjustments */}
          <div className="border border-green-200 rounded-lg overflow-hidden">
            <div className="bg-gradient-to-r from-green-100 to-green-200 p-3">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold text-green-900 flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                  </svg>
                  Less: Credit Adjustments
                  <span className="text-xs font-normal text-green-700">(decrease taxable income)</span>
                </h2>
                <button
                  onClick={() => setShowAddModal('CREDIT')}
                  className="px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700 flex items-center gap-1 transition-colors"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Add Manual
                </button>
              </div>
            </div>
            <div className="bg-white p-3">
              {renderAdjustmentList(creditAdjustments)}
              <div className="grid grid-cols-12 font-bold border-t border-green-300 bg-green-50 rounded-b-lg pt-2 mt-2">
                <div className="col-span-9 px-2 text-xs text-green-900">Total Credit Adjustments</div>
                <div className="col-span-3 text-right px-3 text-xs tabular-nums text-red-600">
                  ({formatAmount(totalCredits)})
                </div>
              </div>
            </div>
          </div>

          {/* Allowances */}
          <div className="border border-blue-200 rounded-lg overflow-hidden">
            <div className="bg-gradient-to-r from-blue-100 to-blue-200 p-3">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold text-blue-900 flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                  </svg>
                  Less: Allowances
                  <span className="text-xs font-normal text-blue-700">(tax deductions allowed by law)</span>
                </h2>
                <button
                  onClick={() => setShowAddModal('ALLOWANCE')}
                  className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-1 transition-colors"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Add Manual
                </button>
              </div>
            </div>
            <div className="bg-white p-3">
              {renderAdjustmentList(allowanceAdjustments)}
              <div className="grid grid-cols-12 font-bold border-t border-blue-300 bg-blue-50 rounded-b-lg pt-2 mt-2">
                <div className="col-span-9 px-2 text-xs text-blue-900">Total Allowances</div>
                <div className="col-span-3 text-right px-3 text-xs tabular-nums text-red-600">
                  ({formatAmount(totalAllowances)})
                </div>
              </div>
            </div>
          </div>

          {/* Recoupments */}
          <div className="border border-purple-200 rounded-lg overflow-hidden">
            <div className="bg-gradient-to-r from-purple-100 to-purple-200 p-3">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold text-purple-900 flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Add: Recoupments
                  <span className="text-xs font-normal text-purple-700">(previously deducted amounts recovered)</span>
                </h2>
                <button
                  onClick={() => setShowAddModal('RECOUPMENT')}
                  className="px-2 py-1 text-xs bg-purple-600 text-white rounded hover:bg-purple-700 flex items-center gap-1 transition-colors"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Add Manual
                </button>
              </div>
            </div>
            <div className="bg-white p-3">
              {renderAdjustmentList(recoupmentAdjustments)}
              <div className="grid grid-cols-12 font-bold border-t border-purple-300 bg-purple-50 rounded-b-lg pt-2 mt-2">
                <div className="col-span-9 px-2 text-xs text-purple-900">Total Recoupments</div>
                <div className="col-span-3 text-right px-3 text-xs tabular-nums text-purple-900">
                  {formatAmount(totalRecoupments)}
                </div>
              </div>
            </div>
          </div>

          {/* Taxable Income */}
          <div className={`border rounded-lg p-3 ${
            taxableIncome >= 0 
              ? 'bg-gradient-to-r from-purple-100 to-purple-200 border-purple-300' 
              : 'bg-gradient-to-r from-gray-100 to-gray-200 border-gray-300'
          }`}>
            <div className="grid grid-cols-12 font-bold text-base">
              <div className={`col-span-9 ${taxableIncome >= 0 ? 'text-purple-900' : 'text-gray-900'}`}>TAXABLE INCOME</div>
              <div className={`col-span-3 text-right px-3 text-sm tabular-nums ${taxableIncome < 0 ? 'text-red-600' : (taxableIncome >= 0 ? 'text-purple-900' : 'text-gray-900')}`}>
                {taxableIncome < 0 ? `(${formatAmount(Math.abs(taxableIncome))})` : formatAmount(taxableIncome)}
              </div>
            </div>
          </div>

          {/* Tax Liability */}
          <div className="bg-gradient-to-r from-green-100 to-green-200 border border-green-300 rounded-lg p-3 shadow-lg">
            <div className="space-y-2">
              <div className="grid grid-cols-12 text-xs font-medium text-green-800">
                <div className="col-span-9 flex items-center gap-2">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                  Tax Rate (Corporate)
                </div>
                <div className="col-span-3 text-right px-3">27%</div>
              </div>
              <div className="grid grid-cols-12 font-bold text-base border-t border-green-400 pt-2">
                <div className="col-span-9 text-green-900">TAX LIABILITY</div>
                <div className="col-span-3 text-right px-3 text-sm tabular-nums text-green-900">
                  {formatAmount(taxLiability)}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Add Adjustment Modal */}
      {showAddModal && (
        <AddAdjustmentModal
          isOpen={true}
          adjustmentType={showAddModal}
          projectId={parseInt(params.id)}
          onClose={() => setShowAddModal(null)}
          onSuccess={handleModalSuccess}
        />
      )}
    </div>
  );
} 