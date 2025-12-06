'use client';

import { useState } from 'react';
import { BriefcaseIcon, ClockIcon, CurrencyDollarIcon, CalendarIcon, ChartBarIcon, ArrowTrendingUpIcon, ArrowTrendingDownIcon } from '@heroicons/react/24/outline';
import { useClientWip, ProfitabilityMetrics } from '@/hooks/clients/useClientWip';

interface ProfitabilityTabProps {
  clientId: string;
}

interface ProfitabilityCardProps {
  label: string;
  value: number;
  isCurrency?: boolean;
  isPercentage?: boolean;
  showTrend?: boolean;
  customBgColor?: string;
  customTextColor?: string;
}

function ProfitabilityCard({ 
  label, 
  value, 
  isCurrency = true, 
  isPercentage = false, 
  showTrend = false,
  customBgColor,
  customTextColor
}: ProfitabilityCardProps) {
  const formatValue = (val: number) => {
    if (isPercentage) {
      return `${val.toFixed(2)}%`;
    }
    if (isCurrency) {
      return new Intl.NumberFormat('en-ZA', {
        style: 'currency',
        currency: 'ZAR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(val);
    }
    return val.toLocaleString('en-ZA', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  };

  const isPositive = value >= 0;
  const trendColor = customTextColor || (isPositive ? 'text-green-600' : 'text-red-600');
  const bgColor = customBgColor || (showTrend ? (isPositive ? 'bg-green-50' : 'bg-red-50') : 'bg-forvis-gray-50');

  return (
    <div className={`p-4 rounded-lg border ${customBgColor ? 'border-transparent' : 'border-forvis-gray-200'} ${bgColor}`}>
      <p className={`text-xs font-medium ${customTextColor ? 'opacity-90' : 'text-forvis-gray-600'}`}>{label}</p>
      <div className="flex items-center gap-2 mt-1">
        <p className={`text-xl font-bold ${trendColor}`}>
          {formatValue(value)}
        </p>
        {showTrend && !customBgColor && (
          isPositive ? (
            <ArrowTrendingUpIcon className="w-5 h-5 text-green-600" />
          ) : (
            <ArrowTrendingDownIcon className="w-5 h-5 text-red-600" />
          )
        )}
      </div>
    </div>
  );
}

export function ProfitabilityTab({ clientId }: ProfitabilityTabProps) {
  const { data: wipData, isLoading, error } = useClientWip(clientId);
  const [activeTab, setActiveTab] = useState<string>('overall');

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatHours = (hours: number) => {
    return new Intl.NumberFormat('en-ZA', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(hours);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-forvis-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-16 rounded-xl border-3 border-dashed shadow-lg" style={{ borderColor: '#EF4444', borderWidth: '3px', background: 'linear-gradient(135deg, #FEF2F2 0%, #FEE2E2 100%)' }}>
        <ChartBarIcon className="mx-auto h-16 w-16 text-red-600" />
        <h3 className="mt-4 text-lg font-bold text-red-900">Error loading WIP data</h3>
        <p className="mt-2 text-sm font-medium text-red-600">
          {error instanceof Error ? error.message : 'An error occurred while loading WIP data'}
        </p>
      </div>
    );
  }

  if (!wipData || wipData.taskCount === 0) {
    return (
      <div className="text-center py-16 rounded-xl border-3 border-dashed shadow-lg" style={{ borderColor: '#2E5AAC', borderWidth: '3px', background: 'linear-gradient(135deg, #F8FBFE 0%, #EEF6FC 100%)' }}>
        <ChartBarIcon className="mx-auto h-16 w-16" style={{ color: '#2E5AAC' }} />
        <h3 className="mt-4 text-lg font-bold" style={{ color: '#1C3667' }}>No profitability data available</h3>
        <p className="mt-2 text-sm font-medium" style={{ color: '#2E5AAC' }}>
          No tasks with profitability data have been found for this client
        </p>
      </div>
    );
  }

  const { overall, byMasterServiceLine, masterServiceLines, taskCount, lastUpdated } = wipData;
  
  // Get current tab data
  const currentMetrics: ProfitabilityMetrics = activeTab === 'overall' 
    ? overall 
    : byMasterServiceLine[activeTab] || overall;

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="card overflow-hidden">
        <div className="px-6 py-4" style={{ background: 'linear-gradient(135deg, #5B93D7 0%, #2E5AAC 50%, #1C3667 100%)' }}>
          <nav className="flex flex-wrap gap-3">
            <button
              onClick={() => setActiveTab('overall')}
              className={`px-5 py-2.5 rounded-lg text-sm font-bold transition-all shadow-sm ${
                activeTab === 'overall'
                  ? 'bg-white text-forvis-blue-600'
                  : 'bg-white/20 text-white hover:bg-white/30'
              }`}
            >
              Overall
            </button>
            {masterServiceLines.map((msl) => (
              <button
                key={msl.code}
                onClick={() => setActiveTab(msl.code)}
                className={`px-5 py-2.5 rounded-lg text-sm font-bold transition-all shadow-sm ${
                  activeTab === msl.code
                    ? 'bg-white text-forvis-blue-600'
                    : 'bg-white/20 text-white hover:bg-white/30'
                }`}
              >
                {msl.name}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Key Performance Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(to bottom right, #2E5AAC, #25488A)' }}>
              <ChartBarIcon className="h-6 w-6 text-white" />
            </div>
            <h3 className="text-lg font-bold text-forvis-gray-900">Net Revenue</h3>
          </div>
          <p className="text-3xl font-bold text-forvis-blue-600">{formatCurrency(currentMetrics.netRevenue)}</p>
          <p className="text-xs text-forvis-gray-600 mt-2">Gross Production + Adjustments</p>
        </div>

        <div className="card p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
              currentMetrics.grossProfitPercentage >= 60
                ? 'bg-green-600'
                : currentMetrics.grossProfitPercentage >= 50
                ? 'bg-yellow-600'
                : 'bg-red-600'
            }`}>
              <CurrencyDollarIcon className="h-6 w-6 text-white" />
            </div>
            <h3 className="text-lg font-bold text-forvis-gray-900">Gross Profit</h3>
          </div>
          <p className={`text-3xl font-bold ${
            currentMetrics.grossProfitPercentage >= 60
              ? 'text-green-600'
              : currentMetrics.grossProfitPercentage >= 50
              ? 'text-yellow-600'
              : 'text-red-600'
          }`}>
            {formatCurrency(currentMetrics.grossProfit)}
          </p>
          <p className="text-xs text-forvis-gray-600 mt-2">Net Revenue - Costs</p>
        </div>

        <div className="card p-6 relative">
          <div className="flex items-center gap-3 mb-4">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
              currentMetrics.grossProfitPercentage >= 60
                ? 'bg-green-600'
                : currentMetrics.grossProfitPercentage >= 50
                ? 'bg-yellow-600'
                : 'bg-red-600'
            }`}>
              <ChartBarIcon className="h-6 w-6 text-white" />
            </div>
            <h3 className="text-lg font-bold text-forvis-gray-900">Gross Profit %</h3>
          </div>
          <p className={`text-3xl font-bold ${
            currentMetrics.grossProfitPercentage >= 60
              ? 'text-green-600'
              : currentMetrics.grossProfitPercentage >= 50
              ? 'text-yellow-600'
              : 'text-red-600'
          }`}>
            {currentMetrics.grossProfitPercentage.toFixed(2)}%
          </p>
          <div className="mt-3">
            <div className={`inline-flex items-center text-xs font-bold px-3 py-1.5 rounded-full ${
              currentMetrics.grossProfitPercentage >= 60
                ? 'bg-green-100 text-green-700 border border-green-200'
                : currentMetrics.grossProfitPercentage >= 50
                ? 'bg-yellow-100 text-yellow-700 border border-yellow-200'
                : 'bg-red-100 text-red-700 border border-red-200'
            }`}>
              {currentMetrics.grossProfitPercentage >= 60
                ? '✓ Above 60% Benchmark'
                : currentMetrics.grossProfitPercentage >= 50
                ? '⚠ Near 60% Benchmark'
                : '✗ Below 60% Benchmark'}
            </div>
          </div>
        </div>
      </div>

      {/* Detailed Metrics */}
      <div className="card">
        <div className="px-6 py-4 border-b border-forvis-gray-200">
          <h3 className="text-lg font-bold text-forvis-gray-900">Detailed Breakdown</h3>
        </div>
        
        <div className="p-6 space-y-8">
          {/* Production & Revenue Flow */}
          <div className="bg-forvis-gray-50 rounded-lg p-6 border border-forvis-gray-200">
            <h3 className="text-md font-bold text-forvis-gray-900 mb-6">Revenue Flow</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div>
                <ProfitabilityCard
                  label="Gross Production"
                  value={currentMetrics.grossProduction}
                />
                <p className="text-xs text-forvis-gray-500 mt-2 text-center">LTD Time</p>
              </div>
              <div>
                <ProfitabilityCard
                  label="LTD Adjustment"
                  value={currentMetrics.ltdAdjustment}
                  showTrend
                />
                <p className="text-xs text-forvis-gray-500 mt-2 text-center">Time + Disb Adjustments</p>
              </div>
              <div>
                <ProfitabilityCard
                  label="Adjustment %"
                  value={currentMetrics.adjustmentPercentage}
                  isPercentage
                  showTrend
                />
                <p className="text-xs text-forvis-gray-500 mt-2 text-center">% of Production</p>
              </div>
              <div>
                <ProfitabilityCard
                  label="LTD Cost"
                  value={-currentMetrics.ltdCost}
                />
                <p className="text-xs text-forvis-gray-500 mt-2 text-center">Cost Excluding CP</p>
              </div>
            </div>
          </div>

          {/* Rate Metrics */}
          <div>
            <h3 className="text-md font-bold text-forvis-gray-900 mb-4">Hourly Rates</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <ProfitabilityCard
                label="Total Hours"
                value={currentMetrics.ltdHours}
                isCurrency={false}
              />
              <ProfitabilityCard
                label="Average Chargeout Rate"
                value={currentMetrics.averageChargeoutRate}
              />
              <ProfitabilityCard
                label="Average Recovery Rate"
                value={currentMetrics.averageRecoveryRate}
              />
            </div>
          </div>

          {/* Additional Details */}
          <div>
            <h3 className="text-md font-bold text-forvis-gray-900 mb-4">Additional Metrics</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <ProfitabilityCard label="LTD Adj Time" value={currentMetrics.ltdAdjTime} />
              <ProfitabilityCard label="LTD Adj Disb" value={currentMetrics.ltdAdjDisb} />
              <ProfitabilityCard label="LTD Fee Time" value={currentMetrics.ltdFeeTime} />
              <ProfitabilityCard label="LTD Fee Disb" value={currentMetrics.ltdFeeDisb} />
            </div>
          </div>

          {/* Footer Info */}
          <div className="flex items-center justify-between pt-4 border-t border-forvis-gray-200 text-sm text-forvis-gray-600">
            <div className="flex items-center gap-2">
              <BriefcaseIcon className="h-4 w-4" />
              <span><span className="font-semibold">{taskCount}</span> Active Tasks</span>
            </div>
            {lastUpdated && (
              <div className="flex items-center gap-2">
                <CalendarIcon className="h-4 w-4" />
                <span>Last Updated: <span className="font-semibold">{new Date(lastUpdated).toLocaleDateString()}</span></span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}


