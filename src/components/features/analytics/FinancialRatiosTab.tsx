'use client';

import { Calculator } from 'lucide-react';
import { useFinancialRatios } from '@/hooks/analytics/useClientAnalytics';
import { FinancialRatios } from '@/types/analytics';
import { FinancialRatioCalculator } from '@/lib/services/analytics/financialRatioCalculator';

interface FinancialRatiosTabProps {
  clientId: string | number;  // Can be internal ID or GSClientID depending on context
}

interface RatioCardProps {
  title: string;
  value: number | undefined;
  ratioKey: keyof FinancialRatios;
  suffix?: string;
}

function RatioCard({ title, value, ratioKey, suffix = '' }: RatioCardProps) {
  if (value === undefined) {
    return (
      <div className="rounded-lg p-4 border-2 border-dashed border-forvis-gray-300 bg-forvis-gray-50">
        <h4 className="text-sm font-medium text-forvis-gray-600 mb-2">{title}</h4>
        <p className="text-sm text-forvis-gray-500 italic">No data</p>
      </div>
    );
  }

  const status = FinancialRatioCalculator.assessRatio(ratioKey, value);
  const statusColor = {
    EXCELLENT: { bg: 'bg-green-100', text: 'text-green-800', border: 'border-green-300' },
    GOOD: { bg: 'bg-blue-100', text: 'text-blue-800', border: 'border-blue-300' },
    FAIR: { bg: 'bg-yellow-100', text: 'text-yellow-800', border: 'border-yellow-300' },
    POOR: { bg: 'bg-red-100', text: 'text-red-800', border: 'border-red-300' },
  }[status];

  return (
    <div className={`rounded-lg p-4 border-2 ${statusColor.border} ${statusColor.bg}`}>
      <h4 className="text-sm font-medium text-forvis-gray-900 mb-2">{title}</h4>
      <p className={`text-3xl font-bold ${statusColor.text} mb-1`}>
        {value.toFixed(2)}{suffix}
      </p>
      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${statusColor.bg} ${statusColor.text} border ${statusColor.border}`}>
        {status}
      </span>
    </div>
  );
}

export function FinancialRatiosTab({ clientId }: FinancialRatiosTabProps) {
  const { data, isLoading } = useFinancialRatios(clientId);
  
  const ratios = data?.ratios;
  const ratingDate = data?.ratingDate;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-forvis-blue-600"></div>
      </div>
    );
  }

  if (!ratios) {
    return (
      <div className="text-center py-16 rounded-xl border-3 border-dashed shadow-lg" style={{ borderColor: '#2E5AAC', borderWidth: '3px', background: 'linear-gradient(135deg, #F8FBFE 0%, #EEF6FC 100%)' }}>
        <Calculator className="mx-auto h-16 w-16" style={{ color: '#2E5AAC' }} />
        <h3 className="mt-4 text-lg font-bold" style={{ color: '#1C3667' }}>No financial ratios available</h3>
        <p className="mt-2 text-sm font-medium" style={{ color: '#2E5AAC' }}>
          Generate a credit rating first to see calculated financial ratios
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-xl p-4 border-2 shadow-corporate" style={{ background: 'linear-gradient(135deg, #F0F7FD 0%, #E0EDFB 100%)', borderColor: '#2E5AAC' }}>
        <div className="flex items-center gap-3">
          <Calculator className="h-6 w-6" style={{ color: '#2E5AAC' }} />
          <div>
            <h2 className="font-bold" style={{ color: '#1C3667' }}>Financial Ratios Analysis</h2>
            {ratingDate && (
              <p className="text-xs font-medium mt-1" style={{ color: '#2E5AAC' }}>
                Calculated from rating on {new Date(ratingDate).toLocaleDateString()}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Liquidity Ratios */}
      <div className="card">
        <div className="px-4 py-3 border-b border-forvis-gray-200" style={{ background: 'linear-gradient(to right, #2E5AAC, #25488A)' }}>
          <h3 className="text-sm font-bold text-white">Liquidity Ratios</h3>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <RatioCard
              title="Current Ratio"
              value={ratios.currentRatio}
              ratioKey="currentRatio"
            />
            <RatioCard
              title="Quick Ratio"
              value={ratios.quickRatio}
              ratioKey="quickRatio"
            />
            <RatioCard
              title="Cash Ratio"
              value={ratios.cashRatio}
              ratioKey="cashRatio"
            />
          </div>
          <div className="mt-4 p-3 rounded-lg" style={{ background: 'linear-gradient(135deg, #F8FBFE 0%, #EEF6FC 100%)', borderLeft: '4px solid #2E5AAC' }}>
            <p className="text-xs font-medium" style={{ color: '#1C3667' }}>
              <strong>About:</strong> Liquidity ratios measure the company's ability to meet short-term obligations.
              A current ratio above 1.5 and quick ratio above 1.0 are generally considered healthy.
            </p>
          </div>
        </div>
      </div>

      {/* Profitability Ratios */}
      <div className="card">
        <div className="px-4 py-3 border-b border-forvis-gray-200" style={{ background: 'linear-gradient(to right, #2E5AAC, #25488A)' }}>
          <h3 className="text-sm font-bold text-white">Profitability Ratios</h3>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <RatioCard
              title="Gross Margin"
              value={ratios.grossMargin}
              ratioKey="grossMargin"
              suffix="%"
            />
            <RatioCard
              title="Net Margin"
              value={ratios.netMargin}
              ratioKey="netMargin"
              suffix="%"
            />
            <RatioCard
              title="Return on Assets (ROA)"
              value={ratios.returnOnAssets}
              ratioKey="returnOnAssets"
              suffix="%"
            />
            <RatioCard
              title="Return on Equity (ROE)"
              value={ratios.returnOnEquity}
              ratioKey="returnOnEquity"
              suffix="%"
            />
          </div>
          <div className="mt-4 p-3 rounded-lg" style={{ background: 'linear-gradient(135deg, #F8FBFE 0%, #EEF6FC 100%)', borderLeft: '4px solid #2E5AAC' }}>
            <p className="text-xs font-medium" style={{ color: '#1C3667' }}>
              <strong>About:</strong> Profitability ratios assess the company's ability to generate earnings relative to revenue, assets, and equity.
              Higher margins and returns generally indicate better financial health.
            </p>
          </div>
        </div>
      </div>

      {/* Leverage Ratios */}
      <div className="card">
        <div className="px-4 py-3 border-b border-forvis-gray-200" style={{ background: 'linear-gradient(to right, #2E5AAC, #25488A)' }}>
          <h3 className="text-sm font-bold text-white">Leverage Ratios</h3>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <RatioCard
              title="Debt-to-Equity"
              value={ratios.debtToEquity}
              ratioKey="debtToEquity"
            />
            <RatioCard
              title="Interest Coverage"
              value={ratios.interestCoverage}
              ratioKey="interestCoverage"
            />
            <RatioCard
              title="Debt Ratio"
              value={ratios.debtRatio}
              ratioKey="debtRatio"
            />
          </div>
          <div className="mt-4 p-3 rounded-lg" style={{ background: 'linear-gradient(135deg, #F8FBFE 0%, #EEF6FC 100%)', borderLeft: '4px solid #2E5AAC' }}>
            <p className="text-xs font-medium" style={{ color: '#1C3667' }}>
              <strong>About:</strong> Leverage ratios evaluate the company's debt levels and ability to service debt obligations.
              Lower debt-to-equity and higher interest coverage indicate better financial stability.
            </p>
          </div>
        </div>
      </div>

      {/* Efficiency Ratios */}
      <div className="card">
        <div className="px-4 py-3 border-b border-forvis-gray-200" style={{ background: 'linear-gradient(to right, #2E5AAC, #25488A)' }}>
          <h3 className="text-sm font-bold text-white">Efficiency Ratios</h3>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <RatioCard
              title="Asset Turnover"
              value={ratios.assetTurnover}
              ratioKey="assetTurnover"
            />
            <RatioCard
              title="Inventory Turnover"
              value={ratios.inventoryTurnover}
              ratioKey="inventoryTurnover"
            />
            <RatioCard
              title="Receivables Turnover"
              value={ratios.receivablesTurnover}
              ratioKey="receivablesTurnover"
            />
          </div>
          <div className="mt-4 p-3 rounded-lg" style={{ background: 'linear-gradient(135deg, #F8FBFE 0%, #EEF6FC 100%)', borderLeft: '4px solid #2E5AAC' }}>
            <p className="text-xs font-medium" style={{ color: '#1C3667' }}>
              <strong>About:</strong> Efficiency ratios measure how effectively the company uses its assets and manages operations.
              Higher turnover ratios generally indicate more efficient asset utilization.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}















































