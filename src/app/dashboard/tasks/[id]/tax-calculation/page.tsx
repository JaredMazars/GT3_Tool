'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { formatAmount } from '@/lib/utils/formatters';
import ExportMenu from '@/components/shared/ExportMenu';
import {
  TaxAdjustmentCard,
  AddAdjustmentModal,
  useTaxAdjustments,
  useTaxCalculation,
  useUpdateTaxAdjustment,
  useGenerateTaxSuggestions,
} from '@/components/tools/tax-calculation';

interface TaxCalculationProps {
  params: Promise<{ id: string }>;
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

export default function TaxCalculationPage({ params }: { params: { id: string } }) {
  // Note: In client components, params is already resolved (not a Promise)
  const router = useRouter();
  const { data: taxCalcData, isLoading: isLoadingCalc } = useTaxCalculation(params.id);
  const { data: adjustments = [], isLoading: isLoadingAdjustments, error: queryError } = useTaxAdjustments(params.id);
  const updateAdjustment = useUpdateTaxAdjustment(params.id);
  const generateSuggestions = useGenerateTaxSuggestions(params.id);
  
  const [error, setError] = useState<string | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const [showAddModal, setShowAddModal] = useState<'DEBIT' | 'CREDIT' | 'ALLOWANCE' | 'RECOUPMENT' | null>(null);

  const isLoading = isLoadingCalc || isLoadingAdjustments;
  const accountingProfit = taxCalcData?.netProfit || 0;
  
  // Set error from query if it exists
  useEffect(() => {
    if (queryError) {
      setError(queryError instanceof Error ? queryError.message : 'An error occurred');
    }
  }, [queryError]);

  const handleGenerateSuggestions = async () => {
    try {
      await generateSuggestions.mutateAsync();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate suggestions');
    }
  };

  const handleApprove = async (id: number) => {
    try {
      await updateAdjustment.mutateAsync({ adjustmentId: id, status: 'APPROVED' });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to approve');
    }
  };

  const handleReject = async (id: number) => {
    try {
      await updateAdjustment.mutateAsync({ adjustmentId: id, status: 'REJECTED' });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reject');
    }
  };

  const handleModify = (id: number) => {
    router.push(`/dashboard/tasks/${params.id}/tax-calculation/adjustments/${id}`);
  };

  const handleModalSuccess = async () => {
    // No need to do anything - mutations handle cache invalidation
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
      return <p className="text-xs text-forvis-gray-500 pl-3">None</p>;
    }

    return (
      <div className="space-y-0.5">
        {adjustmentsList.map((adj) => (
          <div 
            key={adj.id} 
            className="hover:bg-forvis-blue-50 py-1 cursor-pointer transition-colors"
            onClick={() => router.push(`/dashboard/tasks/${params.id}/tax-calculation/adjustments/${adj.id}`)}
          >
            <div className="grid grid-cols-12 text-xs items-center">
              <div className="col-span-9 pl-3">
                <div className="flex items-center gap-2">
                  {adj.sarsSection && (
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-forvis-blue-100 text-forvis-blue-800 border border-forvis-blue-200">
                      {adj.sarsSection}
                    </span>
                  )}
                  <span className="text-forvis-gray-900">{adj.description}</span>
                </div>
              </div>
              <div className="col-span-3 text-right px-3 tabular-nums font-medium text-forvis-gray-900">
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
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-forvis-blue-600"></div>
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
        <div 
          className="rounded-lg shadow-corporate p-3 text-white"
          style={{ background: 'linear-gradient(to bottom right, #2E5AAC, #25488A)' }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium opacity-90">Accounting Profit</p>
              <p className="text-xl font-bold mt-1">{formatAmount(accountingProfit)}</p>
            </div>
            <div className="rounded-full p-2" style={{ backgroundColor: 'rgba(28, 54, 103, 0.5)' }}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
            </div>
          </div>
        </div>

        <div 
          className="rounded-lg shadow-corporate p-3 text-white"
          style={{ background: 'linear-gradient(to bottom right, #5B93D7, #2E5AAC)' }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium opacity-90">Total Adjustments</p>
              <p className="text-xl font-bold mt-1">{formatAmount(totalDebits - totalCredits - totalAllowances + totalRecoupments)}</p>
              <div className="flex gap-2 mt-1 text-xs opacity-90">
                <span>{debitAdjustments.length} Debit</span>
                <span>•</span>
                <span>{creditAdjustments.length} Credit</span>
                <span>•</span>
                <span>{allowanceAdjustments.length} Allow</span>
                <span>•</span>
                <span>{recoupmentAdjustments.length} Recoup</span>
              </div>
            </div>
            <div className="rounded-full p-2" style={{ backgroundColor: 'rgba(37, 72, 138, 0.5)' }}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </div>
          </div>
        </div>

        <div 
          className="rounded-lg shadow-corporate p-3 text-white"
          style={{ background: 'linear-gradient(to bottom right, #25488A, #1C3667)' }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium opacity-90">Taxable Income</p>
              <p className="text-xl font-bold mt-1">{formatAmount(taxableIncome)}</p>
            </div>
            <div className="rounded-full p-2" style={{ backgroundColor: 'rgba(19, 36, 69, 0.5)' }}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>

        <div 
          className="rounded-lg shadow-corporate p-3 text-white"
          style={{ background: 'linear-gradient(to bottom right, #1C3667, #132445)' }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium opacity-90">Tax Liability</p>
              <p className="text-xl font-bold mt-1">{formatAmount(taxLiability)}</p>
            </div>
            <div className="rounded-full p-2" style={{ backgroundColor: 'rgba(10, 18, 34, 0.5)' }}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Action Bar */}
      <div 
        className="flex items-center justify-between rounded-lg shadow-corporate border-2 p-5"
        style={{ 
          background: 'linear-gradient(to right, #F5F7FA, #E8EDF5)',
          borderColor: '#2E5AAC'
        }}
      >
        <div className="text-forvis-blue-900">
          <h3 className="text-base font-bold">Tax Adjustments Management</h3>
          <p className="text-xs opacity-80 mt-0.5">Manage adjustments and generate AI suggestions</p>
        </div>
        <div className="flex items-center gap-3">
          <ExportMenu taskId={parseInt(params.id)} />
          <button
            onClick={() => router.push(`/dashboard/tasks/${params.id}/tax-calculation/adjustments`)}
            className="px-5 py-2.5 text-sm font-semibold bg-white text-forvis-blue-900 rounded-lg hover:bg-forvis-blue-50 transition-colors shadow-corporate hover:shadow-corporate-md border-2 border-forvis-blue-300 whitespace-nowrap"
          >
            Manage All Adjustments
          </button>
          <button
            onClick={handleGenerateSuggestions}
            disabled={generateSuggestions.isPending}
            className="px-5 py-2.5 text-sm font-semibold rounded-lg flex items-center gap-2 transition-all shadow-corporate-md hover:shadow-corporate-lg disabled:cursor-not-allowed whitespace-nowrap"
            style={{ 
              backgroundColor: generateSuggestions.isPending ? '#9CA3AF' : '#2E5AAC',
              color: 'white'
            }}
          >
            {generateSuggestions.isPending ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span style={{ color: 'white', fontWeight: '600' }}>Generating...</span>
              </>
            ) : (
              <>
                <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="white" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                <span style={{ color: 'white', fontWeight: '600' }}>Generate AI Suggestions</span>
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
        <div 
          className="mb-4 rounded-lg p-5 shadow-corporate-lg border-2"
          style={{ 
            background: 'linear-gradient(135deg, #5B93D7 0%, #2E5AAC 100%)',
            borderColor: '#1C3667'
          }}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white bg-opacity-20 rounded-lg">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">
                  AI Suggested Adjustments
                </h2>
                <p className="text-xs text-white opacity-90">
                  {suggestedAdjustments.length} adjustment{suggestedAdjustments.length !== 1 ? 's' : ''} identified for review
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowSuggestions(false)}
              className="text-white hover:bg-white hover:bg-opacity-20 p-2 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="space-y-3">
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
      <div className="bg-white border border-forvis-gray-200 rounded-lg shadow-corporate p-4">
        <div className="space-y-3">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-forvis-gray-400 pb-2">
            <h1 className="text-xl font-bold text-forvis-gray-900">TAX COMPUTATION</h1>
            <div className="text-right font-semibold text-forvis-gray-700">R</div>
          </div>

          {/* Accounting Profit */}
          <div className={`grid grid-cols-12 font-bold text-sm border rounded-lg p-3 ${
            accountingProfit >= 0 
              ? 'bg-gradient-to-r from-forvis-blue-50 to-forvis-blue-100 border-forvis-blue-300' 
              : 'bg-gradient-to-r from-forvis-gray-50 to-forvis-gray-100 border-forvis-gray-300'
          }`}>
            <div className={`col-span-9 ${accountingProfit >= 0 ? 'text-forvis-blue-900' : 'text-forvis-gray-900'}`}>Accounting Profit / (Loss)</div>
            <div className={`col-span-3 text-right px-3 text-xs tabular-nums ${accountingProfit < 0 ? 'text-red-600' : (accountingProfit >= 0 ? 'text-forvis-blue-900' : 'text-forvis-gray-900')}`}>
              {accountingProfit < 0 ? `(${formatAmount(Math.abs(accountingProfit))})` : formatAmount(accountingProfit)}
            </div>
          </div>

          {/* Debit Adjustments */}
          <div className="border-2 rounded-lg overflow-hidden shadow-sm" style={{ borderColor: '#25488A' }}>
            <div className="p-3" style={{ background: 'linear-gradient(to right, #5B93D7, #2E5AAC)' }}>
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold text-white flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Add: Debit Adjustments
                  <span className="text-xs font-normal opacity-90">(increase taxable income)</span>
                </h2>
                <button
                  onClick={() => setShowAddModal('DEBIT')}
                  className="px-2 py-1 text-xs bg-white text-forvis-blue-900 rounded hover:bg-forvis-blue-50 flex items-center gap-1 transition-colors font-semibold"
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
              <div 
                className="grid grid-cols-12 font-bold border-t-2 rounded-b-lg pt-2 mt-2"
                style={{ 
                  background: 'linear-gradient(to right, #5B93D7, #2E5AAC)',
                  borderColor: '#25488A'
                }}
              >
                <div className="col-span-9 px-2 text-xs text-white">Total Debit Adjustments</div>
                <div className="col-span-3 text-right px-3 text-xs tabular-nums text-white">
                  {formatAmount(totalDebits)}
                </div>
              </div>
            </div>
          </div>

          {/* Credit Adjustments */}
          <div className="border-2 rounded-lg overflow-hidden shadow-sm" style={{ borderColor: '#25488A' }}>
            <div className="p-3" style={{ background: 'linear-gradient(to right, #5B93D7, #2E5AAC)' }}>
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold text-white flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                  </svg>
                  Less: Credit Adjustments
                  <span className="text-xs font-normal opacity-90">(decrease taxable income)</span>
                </h2>
                <button
                  onClick={() => setShowAddModal('CREDIT')}
                  className="px-2 py-1 text-xs bg-white text-forvis-blue-900 rounded hover:bg-forvis-blue-50 flex items-center gap-1 transition-colors font-semibold"
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
              <div 
                className="grid grid-cols-12 font-bold border-t-2 rounded-b-lg pt-2 mt-2"
                style={{ 
                  background: 'linear-gradient(to right, #5B93D7, #2E5AAC)',
                  borderColor: '#25488A'
                }}
              >
                <div className="col-span-9 px-2 text-xs text-white">Total Credit Adjustments</div>
                <div className="col-span-3 text-right px-3 text-xs tabular-nums text-red-200">
                  ({formatAmount(totalCredits)})
                </div>
              </div>
            </div>
          </div>

          {/* Allowances */}
          <div className="border-2 rounded-lg overflow-hidden shadow-sm" style={{ borderColor: '#25488A' }}>
            <div 
              className="p-3"
              style={{ background: 'linear-gradient(to right, #5B93D7, #2E5AAC)' }}
            >
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold text-white flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="white" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M20 12H4" />
                  </svg>
                  Less: Allowances
                  <span className="text-xs font-normal opacity-90">(tax deductions allowed by law)</span>
                </h2>
                <button
                  onClick={() => setShowAddModal('ALLOWANCE')}
                  className="px-2 py-1 text-xs rounded flex items-center gap-1 transition-colors font-semibold shadow-corporate"
                  style={{ backgroundColor: 'white', color: '#2E5AAC' }}
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                  </svg>
                  <span>Add Manual</span>
                </button>
              </div>
            </div>
            <div className="bg-white p-3">
              {renderAdjustmentList(allowanceAdjustments)}
              <div 
                className="grid grid-cols-12 font-bold border-t-2 rounded-b-lg pt-2 mt-2"
                style={{ 
                  background: 'linear-gradient(to right, #5B93D7, #2E5AAC)',
                  borderColor: '#25488A'
                }}
              >
                <div className="col-span-9 px-2 text-xs text-white">Total Allowances</div>
                <div className="col-span-3 text-right px-3 text-xs tabular-nums text-red-200">
                  ({formatAmount(totalAllowances)})
                </div>
              </div>
            </div>
          </div>

          {/* Recoupments */}
          <div className="border-2 rounded-lg overflow-hidden shadow-sm" style={{ borderColor: '#25488A' }}>
            <div 
              className="p-3"
              style={{ background: 'linear-gradient(to right, #5B93D7, #2E5AAC)' }}
            >
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold text-white flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="white" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Add: Recoupments
                  <span className="text-xs font-normal opacity-90">(previously deducted amounts recovered)</span>
                </h2>
                <button
                  onClick={() => setShowAddModal('RECOUPMENT')}
                  className="px-2 py-1 text-xs rounded flex items-center gap-1 transition-colors font-semibold shadow-corporate"
                  style={{ backgroundColor: 'white', color: '#2E5AAC' }}
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                  </svg>
                  <span>Add Manual</span>
                </button>
              </div>
            </div>
            <div className="bg-white p-3">
              {renderAdjustmentList(recoupmentAdjustments)}
              <div 
                className="grid grid-cols-12 font-bold border-t-2 rounded-b-lg pt-2 mt-2"
                style={{ 
                  background: 'linear-gradient(to right, #5B93D7, #2E5AAC)',
                  borderColor: '#25488A'
                }}
              >
                <div className="col-span-9 px-2 text-xs text-white">Total Recoupments</div>
                <div className="col-span-3 text-right px-3 text-xs tabular-nums text-white">
                  {formatAmount(totalRecoupments)}
                </div>
              </div>
            </div>
          </div>

          {/* Taxable Income */}
          <div 
            className="border-2 rounded-lg p-3 shadow-md"
            style={{ 
              background: taxableIncome >= 0 
                ? 'linear-gradient(to right, #2E5AAC, #25488A)'
                : 'linear-gradient(to right, #6B7280, #4B5563)',
              borderColor: taxableIncome >= 0 ? '#1C3667' : '#374151'
            }}
          >
            <div className="grid grid-cols-12 font-bold text-base">
              <div className="col-span-9 text-white">TAXABLE INCOME</div>
              <div className={`col-span-3 text-right px-3 text-base tabular-nums ${taxableIncome < 0 ? 'text-red-200' : 'text-white'}`}>
                {taxableIncome < 0 ? `(${formatAmount(Math.abs(taxableIncome))})` : formatAmount(taxableIncome)}
              </div>
            </div>
          </div>

          {/* Tax Liability */}
          <div 
            className="border-2 rounded-lg p-3 shadow-md"
            style={{ 
              background: 'linear-gradient(to right, #2E5AAC, #25488A)',
              borderColor: '#1C3667'
            }}
          >
            <div className="space-y-2">
              <div className="grid grid-cols-12 text-xs font-medium text-white">
                <div className="col-span-9 flex items-center gap-2">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                  Tax Rate (Corporate)
                </div>
                <div className="col-span-3 text-right px-3">27%</div>
              </div>
              <div className="grid grid-cols-12 font-bold text-base border-t border-white border-opacity-30 pt-2">
                <div className="col-span-9 text-white">TAX LIABILITY</div>
                <div className="col-span-3 text-right px-3 text-sm tabular-nums text-white">
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
          taskId={parseInt(params.id)}
          onClose={() => setShowAddModal(null)}
          onSuccess={handleModalSuccess}
        />
      )}
    </div>
  );
} 