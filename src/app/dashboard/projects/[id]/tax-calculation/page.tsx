'use client';

import { useState, useEffect } from 'react';
import { formatAmount } from '@/lib/formatters';

interface TaxCalculationProps {
  params: { id: string };
}

interface TaxAdjustment {
  description: string;
  amount: number;
  isDebit?: boolean;
}

export default function TaxCalculationPage({ params }: TaxCalculationProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<{ calculatedProfit?: number } | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const response = await fetch(`/api/projects/${params.id}/tax-calculation`);
        if (!response.ok) {
          throw new Error('Failed to fetch tax calculation data');
        }
        const data = await response.json();
        setData(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
  }, [params.id]);

  const renderSection = (title: string, adjustments: TaxAdjustment[], showTotal = true) => {
    if (!adjustments || adjustments.length === 0) return null;

    const total = adjustments.reduce((sum, adj) => sum + (adj.amount || 0), 0);

    return (
      <div className="space-y-1">
        <h3 className="font-bold text-gray-700">{title}</h3>
        {adjustments.map((adjustment, index) => (
          <div key={index} className="grid grid-cols-12 text-sm">
            <div className="col-span-9 pl-4">{adjustment.description}</div>
            <div className={`col-span-3 text-right px-4 tabular-nums ${adjustment.amount < 0 ? 'text-red-600' : ''}`}>
              {adjustment.amount < 0 ? `(${formatAmount(Math.abs(adjustment.amount))})` : formatAmount(adjustment.amount)}
            </div>
          </div>
        ))}
        {showTotal && (
          <div className="grid grid-cols-12 font-bold border-t border-gray-300 pt-1 mt-1">
            <div className="col-span-9">Total {title}</div>
            <div className={`col-span-3 text-right px-4 tabular-nums ${total < 0 ? 'text-red-600' : ''}`}>
              {total < 0 ? `(${formatAmount(Math.abs(total))})` : formatAmount(total)}
            </div>
          </div>
        )}
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

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-sm text-red-600">{error}</p>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="space-y-6">
        {/* Header */}
        <div className="grid grid-cols-12">
          <div className="col-span-9 text-lg font-bold">TAX COMPUTATION</div>
          <div className="col-span-3 text-right font-semibold">R</div>
        </div>

        {/* Debit Adjustments */}
        <div className="border-b-2 border-gray-300 pb-4">
          <h2 className="font-bold text-gray-900 mb-2">Debit Adjustments (increase net profit/decrease net loss)</h2>
          {renderSection("", [
            { description: "Non-Taxable amounts credited to the income statement", amount: 5000 },
            { description: "Accounting income payable", amount: 3000 },
            { description: "Amounts claimed in respect of other years", amount: 2000 },
            { description: "Adjustments to comply with IAS/Accounting", amount: 211214.16 },
            // Add more adjustments as needed
          ])}
        </div>

        {/* Credit Adjustments */}
        <div className="border-b-2 border-gray-300 pb-4">
          <h2 className="font-bold text-gray-900 mb-2">Credit Adjustments (decrease net profit/increase net loss)</h2>
          {renderSection("", [
            { description: "Depreciation and allowances", amount: -425394 },
            { description: "Capital expenditure write off/lease", amount: -17188.89 },
            { description: "Expenses attributed to exempt income - local", amount: -95152 },
            // Add more adjustments as needed
          ])}
        </div>

        {/* Allowances */}
        <div className="border-b-2 border-gray-300 pb-4">
          <h2 className="font-bold text-gray-900 mb-2">Allowances / Deductions Granted in Previous Years of Assessment and now Recouped</h2>
          {renderSection("", [
            { description: "Allowance for future expenditure s24C - prior year", amount: 0 },
            { description: "Doubtful debt allowance s11(j) - prior year", amount: 0 },
            // Add more allowances as needed
          ])}
        </div>

        {/* Calculated profit / (loss) */}
        <div className="bg-gray-100 p-4 rounded-lg">
          <div className="grid grid-cols-12 font-bold">
            <div className="col-span-9">CALCULATED PROFIT / (LOSS)</div>
            <div className="col-span-3 text-right px-4 tabular-nums">
              {formatAmount(data?.calculatedProfit || 0)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 