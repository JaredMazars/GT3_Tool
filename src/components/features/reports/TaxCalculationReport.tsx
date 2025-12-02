'use client';

import { formatAmount } from '@/lib/utils/formatters';

interface TaxAdjustment {
  id: number;
  type: 'DEBIT' | 'CREDIT' | 'ALLOWANCE' | 'RECOUPMENT';
  description: string;
  amount: number;
  status: string;
  sarsSection?: string;
  notes?: string;
  confidenceScore?: number;
  createdAt?: string;
  updatedAt?: string;
}

interface TaxCalculationReportProps {
  accountingProfit: number;
  adjustments: TaxAdjustment[];
  printMode?: boolean;
}

export default function TaxCalculationReport({ 
  accountingProfit, 
  adjustments, 
  printMode = false 
}: TaxCalculationReportProps) {
  // Filter only approved adjustments for the report
  const approvedAdjustments = adjustments.filter(
    a => a.status === 'APPROVED' || a.status === 'MODIFIED'
  );
  
  const debitAdjustments = approvedAdjustments.filter(a => a.type === 'DEBIT');
  const creditAdjustments = approvedAdjustments.filter(a => a.type === 'CREDIT');
  const allowanceAdjustments = approvedAdjustments.filter(a => a.type === 'ALLOWANCE');
  const recoupmentAdjustments = approvedAdjustments.filter(a => a.type === 'RECOUPMENT');

  const totalDebits = debitAdjustments.reduce((sum, a) => sum + Math.abs(a.amount), 0);
  const totalCredits = creditAdjustments.reduce((sum, a) => sum + Math.abs(a.amount), 0);
  const totalAllowances = allowanceAdjustments.reduce((sum, a) => sum + Math.abs(a.amount), 0);
  const totalRecoupments = recoupmentAdjustments.reduce((sum, a) => sum + Math.abs(a.amount), 0);

  const taxableIncome = accountingProfit + totalDebits - totalCredits - totalAllowances + totalRecoupments;
  const corporateTaxRate = 0.27;
  const taxLiability = Math.max(0, taxableIncome) * corporateTaxRate;

  const renderAdjustmentList = (adjustmentsList: TaxAdjustment[]) => {
    if (adjustmentsList.length === 0) {
      return <p className="text-xs text-gray-500 pl-3">None</p>;
    }

    return (
      <div className="space-y-3">
        {adjustmentsList.map((adj) => (
          <div key={adj.id} className="border border-gray-200 rounded-lg p-3 bg-gray-50">
            <div className="grid grid-cols-12 text-xs items-start mb-2">
              <div className="col-span-9 pl-2">
                <div className="flex items-center gap-2 mb-1">
                  {adj.sarsSection && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-300">
                      {adj.sarsSection}
                    </span>
                  )}
                  {adj.confidenceScore && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-purple-100 text-purple-800">
                      {Math.round(adj.confidenceScore * 100)}% confidence
                    </span>
                  )}
                </div>
                <div className="font-semibold text-gray-900 mb-1">{adj.description}</div>
                {adj.notes && (
                  <div className="mt-2 text-xs text-gray-700 bg-white p-2 rounded border border-gray-200">
                    <div className="font-medium text-gray-600 mb-1">Notes:</div>
                    <div className="whitespace-pre-wrap">{adj.notes}</div>
                  </div>
                )}
              </div>
              <div className="col-span-3 text-right px-2">
                <div className="tabular-nums font-bold text-sm text-gray-900">
                  {formatAmount(Math.abs(adj.amount))}
                </div>
                {adj.createdAt && (
                  <div className="text-[10px] text-gray-500 mt-1">
                    {new Date(adj.createdAt).toLocaleDateString()}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className={printMode ? 'print-section' : ''}>
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-4">
        <div className="space-y-3">
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
            <div className={`col-span-9 ${accountingProfit >= 0 ? 'text-blue-900' : 'text-gray-900'}`}>
              Accounting Profit / (Loss)
            </div>
            <div className={`col-span-3 text-right px-3 text-xs tabular-nums ${
              accountingProfit < 0 ? 'text-red-600' : (accountingProfit >= 0 ? 'text-blue-900' : 'text-gray-900')
            }`}>
              {accountingProfit < 0 
                ? `(${formatAmount(Math.abs(accountingProfit))})` 
                : formatAmount(accountingProfit)}
            </div>
          </div>

          {/* Debit Adjustments */}
          <div className="border-2 rounded-lg overflow-hidden shadow-sm" style={{ borderColor: '#25488A' }}>
            <div className="p-3" style={{ background: 'linear-gradient(to right, #5B93D7, #2E5AAC)' }}>
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                Add: Debit Adjustments
                <span className="text-xs font-normal opacity-90">(increase taxable income)</span>
              </h2>
            </div>
            <div className="bg-white p-3">
              {renderAdjustmentList(debitAdjustments)}
              <div className="grid grid-cols-12 font-bold border-t-2 rounded-b-lg pt-2 mt-2" style={{ background: 'linear-gradient(to right, #5B93D7, #2E5AAC)', borderColor: '#25488A' }}>
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
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                Less: Credit Adjustments
                <span className="text-xs font-normal opacity-90">(decrease taxable income)</span>
              </h2>
            </div>
            <div className="bg-white p-3">
              {renderAdjustmentList(creditAdjustments)}
              <div className="grid grid-cols-12 font-bold border-t-2 rounded-b-lg pt-2 mt-2" style={{ background: 'linear-gradient(to right, #5B93D7, #2E5AAC)', borderColor: '#25488A' }}>
                <div className="col-span-9 px-2 text-xs text-white">Total Credit Adjustments</div>
                <div className="col-span-3 text-right px-3 text-xs tabular-nums text-red-200">
                  ({formatAmount(totalCredits)})
                </div>
              </div>
            </div>
          </div>

          {/* Allowances */}
          <div className="border-2 rounded-lg overflow-hidden shadow-sm" style={{ borderColor: '#25488A' }}>
            <div className="p-3" style={{ background: 'linear-gradient(to right, #5B93D7, #2E5AAC)' }}>
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                Less: Allowances
                <span className="text-xs font-normal opacity-90">(tax deductions allowed by law)</span>
              </h2>
            </div>
            <div className="bg-white p-3">
              {renderAdjustmentList(allowanceAdjustments)}
              <div className="grid grid-cols-12 font-bold border-t-2 rounded-b-lg pt-2 mt-2" style={{ background: 'linear-gradient(to right, #5B93D7, #2E5AAC)', borderColor: '#25488A' }}>
                <div className="col-span-9 px-2 text-xs text-white">Total Allowances</div>
                <div className="col-span-3 text-right px-3 text-xs tabular-nums text-red-200">
                  ({formatAmount(totalAllowances)})
                </div>
              </div>
            </div>
          </div>

          {/* Recoupments */}
          <div className="border-2 rounded-lg overflow-hidden shadow-sm" style={{ borderColor: '#25488A' }}>
            <div className="p-3" style={{ background: 'linear-gradient(to right, #5B93D7, #2E5AAC)' }}>
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                Add: Recoupments
                <span className="text-xs font-normal opacity-90">(previously deducted amounts recovered)</span>
              </h2>
            </div>
            <div className="bg-white p-3">
              {renderAdjustmentList(recoupmentAdjustments)}
              <div className="grid grid-cols-12 font-bold border-t-2 rounded-b-lg pt-2 mt-2" style={{ background: 'linear-gradient(to right, #5B93D7, #2E5AAC)', borderColor: '#25488A' }}>
                <div className="col-span-9 px-2 text-xs text-white">Total Recoupments</div>
                <div className="col-span-3 text-right px-3 text-xs tabular-nums text-white">
                  {formatAmount(totalRecoupments)}
                </div>
              </div>
            </div>
          </div>

          {/* Taxable Income */}
          <div className={`border-2 rounded-lg p-3 shadow-md ${
            taxableIncome >= 0 
              ? '' 
              : 'bg-forvis-gray-100 border-forvis-gray-300'
          }`}
          style={taxableIncome >= 0 ? { background: 'linear-gradient(to right, #2E5AAC, #25488A)', borderColor: '#1C3667' } : undefined}>
            <div className="grid grid-cols-12 font-bold text-base">
              <div className={`col-span-9 ${taxableIncome >= 0 ? 'text-white' : 'text-forvis-gray-900'}`}>
                TAXABLE INCOME
              </div>
              <div className={`col-span-3 text-right px-3 text-sm tabular-nums ${
                taxableIncome < 0 ? 'text-red-600' : (taxableIncome >= 0 ? 'text-white' : 'text-forvis-gray-900')
              }`}>
                {taxableIncome < 0 
                  ? `(${formatAmount(Math.abs(taxableIncome))})` 
                  : formatAmount(taxableIncome)}
              </div>
            </div>
          </div>

          {/* Tax Liability */}
          <div className="border-2 rounded-lg p-3 shadow-lg" style={{ background: 'linear-gradient(to right, #2E5AAC, #25488A)', borderColor: '#1C3667' }}>
            <div className="space-y-2">
              <div className="grid grid-cols-12 text-xs font-medium text-white">
                <div className="col-span-9">Tax Rate (Corporate)</div>
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
    </div>
  );
}

