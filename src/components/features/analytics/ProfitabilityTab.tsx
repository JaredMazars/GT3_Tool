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
      {/* Header Section */}
      <div className="card overflow-hidden">
        <div className="px-4 py-3" style={{ background: 'linear-gradient(135deg, #5B93D7 0%, #2E5AAC 50%, #1C3667 100%)' }}>
          <h2 className="text-lg font-bold text-white">Client Profitability Analysis</h2>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center gap-4">
              <div className="flex-shrink-0 w-12 h-12 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(to bottom right, #2E5AAC, #25488A)' }}>
                <BriefcaseIcon className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="text-xs font-medium text-forvis-gray-600">Active Tasks</p>
                <p className="text-2xl font-bold text-forvis-gray-900">{taskCount}</p>
              </div>
            </div>

            {lastUpdated && (
              <div className="flex items-center gap-4">
                <div className="flex-shrink-0 w-12 h-12 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(to bottom right, #5B93D7, #2E5AAC)' }}>
                  <CalendarIcon className="h-6 w-6 text-white" />
                </div>
                <div>
                  <p className="text-xs font-medium text-forvis-gray-600">Last Updated</p>
                  <p className="text-sm font-bold text-forvis-gray-900">
                    {new Date(lastUpdated).toLocaleDateString()}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="card overflow-hidden">
        <div className="border-b border-forvis-gray-200">
          <nav className="flex flex-wrap -mb-px">
            <button
              onClick={() => setActiveTab('overall')}
              className={`px-6 py-3 text-sm font-semibold border-b-2 transition-colors ${
                activeTab === 'overall'
                  ? 'border-forvis-blue-600 text-forvis-blue-600'
                  : 'border-transparent text-forvis-gray-600 hover:text-forvis-blue-600 hover:border-forvis-gray-300'
              }`}
            >
              Overall
            </button>
            {masterServiceLines.map((msl) => (
              <button
                key={msl.code}
                onClick={() => setActiveTab(msl.code)}
                className={`px-6 py-3 text-sm font-semibold border-b-2 transition-colors ${
                  activeTab === msl.code
                    ? 'border-forvis-blue-600 text-forvis-blue-600'
                    : 'border-transparent text-forvis-gray-600 hover:text-forvis-blue-600 hover:border-forvis-gray-300'
                }`}
              >
                {msl.name}
              </button>
            ))}
          </nav>
        </div>

        {/* Profitability Metrics Section */}
        <div className="p-6 space-y-6">
          {/* Production Metrics */}
          <div>
            <h3 className="text-md font-semibold text-forvis-gray-900 mb-4 flex items-center gap-2">
              <ChartBarIcon className="h-5 w-5 text-forvis-blue-600" />
              Production Metrics
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <ProfitabilityCard
                label="Gross Production"
                value={currentMetrics.grossProduction}
              />
              <ProfitabilityCard
                label="LTD Adjustment"
                value={currentMetrics.ltdAdjustment}
                showTrend
              />
              <ProfitabilityCard
                label="Net Revenue"
                value={currentMetrics.netRevenue}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
              <ProfitabilityCard
                label="Adjustment %"
                value={currentMetrics.adjustmentPercentage}
                isPercentage
                showTrend
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

          {/* Profit Metrics */}
          <div>
            <h3 className="text-md font-semibold text-forvis-gray-900 mb-4 flex items-center gap-2">
              <CurrencyDollarIcon className="h-5 w-5 text-forvis-blue-600" />
              Profitability Metrics
              <span className="text-xs font-normal text-forvis-gray-600 ml-2">
                (Benchmark: 60% Gross Profit)
              </span>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <ProfitabilityCard
                label="LTD Cost"
                value={currentMetrics.ltdCost}
              />
              <ProfitabilityCard
                label="Gross Profit"
                value={currentMetrics.grossProfit}
                showTrend
              />
              <div className="relative">
                <ProfitabilityCard
                  label="Gross Profit %"
                  value={currentMetrics.grossProfitPercentage}
                  isPercentage
                  customBgColor={
                    currentMetrics.grossProfitPercentage >= 60
                      ? 'bg-green-50'
                      : currentMetrics.grossProfitPercentage >= 50
                      ? 'bg-yellow-50'
                      : 'bg-red-50'
                  }
                  customTextColor={
                    currentMetrics.grossProfitPercentage >= 60
                      ? 'text-green-700'
                      : currentMetrics.grossProfitPercentage >= 50
                      ? 'text-yellow-700'
                      : 'text-red-700'
                  }
                />
                {/* Benchmark Indicator */}
                <div className="absolute -bottom-2 left-0 right-0 flex items-center justify-center gap-2">
                  <div className={`text-xs font-semibold px-3 py-1 rounded-full ${
                    currentMetrics.grossProfitPercentage >= 60
                      ? 'bg-green-100 text-green-700 border border-green-200'
                      : currentMetrics.grossProfitPercentage >= 50
                      ? 'bg-yellow-100 text-yellow-700 border border-yellow-200'
                      : 'bg-red-100 text-red-700 border border-red-200'
                  }`}>
                    {currentMetrics.grossProfitPercentage >= 60
                      ? '✓ Above Benchmark'
                      : currentMetrics.grossProfitPercentage >= 50
                      ? '⚠ Near Benchmark'
                      : '✗ Below Benchmark'}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Life to Date Details */}
          <div>
            <h3 className="text-md font-semibold text-forvis-gray-900 mb-4 flex items-center gap-2">
              <ClockIcon className="h-5 w-5 text-forvis-blue-600" />
              Life to Date Details
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <ProfitabilityCard label="LTD Time" value={currentMetrics.ltdTime} />
              <ProfitabilityCard label="LTD Adj Time" value={currentMetrics.ltdAdjTime} />
              <ProfitabilityCard label="LTD Adj Disb" value={currentMetrics.ltdAdjDisb} />
              <ProfitabilityCard label="LTD Disbursements" value={currentMetrics.ltdDisb} />
            </div>
          </div>

          {/* Additional LTD Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <ProfitabilityCard label="LTD Fee Time" value={currentMetrics.ltdFeeTime} />
            <ProfitabilityCard label="LTD Fee Disb" value={currentMetrics.ltdFeeDisb} />
            <ProfitabilityCard label="LTD Hours" value={currentMetrics.ltdHours} isCurrency={false} />
          </div>
        </div>
      </div>
    </div>
  );
}


