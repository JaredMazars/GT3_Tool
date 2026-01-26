'use client';

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import dynamic from 'next/dynamic';
import { Briefcase, DollarSign, Calendar, BarChart3, TrendingUp, TrendingDown, Clock, Calculator, Wallet } from 'lucide-react';
import { useTaskWip, ProfitabilityMetrics } from '@/hooks/tasks/useTaskWip';
import { taskTransactionsKeys } from '@/hooks/tasks/useTaskTransactions';
import { TransactionDetailsModal } from './TransactionDetailsModal';
import { TaskBudgetTab } from './TaskBudgetTab';
import { MetricType } from '@/types';
import { LoadingSpinner, Banner } from '@/components/ui';

// Lazy load TaskGraphsTab for better performance
const TaskGraphsTab = dynamic(
  () => import('@/components/features/analytics/TaskGraphsTab').then(m => ({ default: m.TaskGraphsTab })),
  { 
    loading: () => (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    ), 
    ssr: false 
  }
);

interface TaskFinanceTabProps {
  taskId: number;
}

interface ProfitabilityCardProps {
  label: string;
  value: number;
  isCurrency?: boolean;
  isPercentage?: boolean;
  showTrend?: boolean;
  customBgColor?: string;
  customTextColor?: string;
  onClick?: () => void;
  metricType?: MetricType;
}

function ProfitabilityCard({ 
  label, 
  value, 
  isCurrency = true, 
  isPercentage = false, 
  showTrend = false,
  customBgColor,
  customTextColor,
  onClick,
  metricType
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
  const trendColor = customTextColor || (isPositive ? 'text-forvis-success-600' : 'text-forvis-error-600');
  const bgColor = customBgColor || (showTrend ? (isPositive ? 'bg-forvis-success-50' : 'bg-forvis-error-50') : 'bg-forvis-gray-50');

  return (
    <div 
      className={`p-4 rounded-lg border ${customBgColor ? 'border-transparent' : 'border-forvis-gray-200'} ${bgColor} ${onClick ? 'cursor-pointer hover:shadow-lg transition-shadow' : ''}`}
      onClick={onClick}
    >
      <p className={`text-xs font-medium ${customTextColor ? 'opacity-90' : 'text-forvis-gray-600'}`}>{label}</p>
      <div className="flex items-center gap-2 mt-1">
        <p className={`text-xl font-bold ${trendColor}`}>
          {formatValue(value)}
        </p>
        {showTrend && !customBgColor && (
          isPositive ? (
            <TrendingUp className="w-5 h-5 text-forvis-success-600" />
          ) : (
            <TrendingDown className="w-5 h-5 text-forvis-error-600" />
          )
        )}
      </div>
    </div>
  );
}

export function TaskFinanceTab({ taskId }: TaskFinanceTabProps) {
  const [activeTab, setActiveTab] = useState<'profitability' | 'graphs' | 'budget'>('profitability');
  const { data: wipData, isLoading, error } = useTaskWip(taskId);
  const queryClient = useQueryClient();
  
  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    metricType: MetricType | null;
    metricLabel: string;
    metricValue: number;
  }>({
    isOpen: false,
    metricType: null,
    metricLabel: '',
    metricValue: 0,
  });

  // Prefetch transaction data on hover for better perceived performance
  const handleCardHover = () => {
    queryClient.prefetchQuery({
      queryKey: taskTransactionsKeys.detail(taskId),
      queryFn: async () => {
        const response = await fetch(`/api/tasks/${taskId}/transactions`);
        if (!response.ok) throw new Error('Failed to prefetch transactions');
        const result = await response.json();
        return result.success ? result.data : result;
      },
    });
  };

  const handleCardClick = (
    metricType: MetricType,
    label: string,
    value: number
  ) => {
    setModalState({
      isOpen: true,
      metricType,
      metricLabel: label,
      metricValue: value,
    });
  };

  const handleCloseModal = () => {
    setModalState({
      isOpen: false,
      metricType: null,
      metricLabel: '',
      metricValue: 0,
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <Banner
          variant="error"
          title="Error loading WIP data"
          message={error instanceof Error ? error.message : 'An error occurred while loading WIP data'}
        />
      </div>
    );
  }

  if (!wipData) {
    return (
      <Banner
        variant="info"
        title="No profitability data available"
        message="No WIP transactions have been found for this task"
      />
    );
  }

  const { metrics, taskCode, taskDesc, lastUpdated } = wipData;

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="border-b border-forvis-gray-200">
        <nav className="flex -mb-px space-x-8 px-6">
          <button
            onClick={() => setActiveTab('profitability')}
            className={`pb-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'profitability'
                ? 'border-forvis-blue-600 text-forvis-blue-600'
                : 'border-transparent text-forvis-gray-600 hover:text-forvis-gray-900 hover:border-forvis-gray-300'
            }`}
          >
            <div className="flex items-center space-x-2">
              <Briefcase className="h-5 w-5" />
              <span>Profitability</span>
            </div>
          </button>
          
          <button
            onClick={() => setActiveTab('budget')}
            className={`pb-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'budget'
                ? 'border-forvis-blue-600 text-forvis-blue-600'
                : 'border-transparent text-forvis-gray-600 hover:text-forvis-gray-900 hover:border-forvis-gray-300'
            }`}
          >
            <div className="flex items-center space-x-2">
              <Calculator className="h-5 w-5" />
              <span>Budget</span>
            </div>
          </button>
          
          <button
            onClick={() => setActiveTab('graphs')}
            className={`pb-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'graphs'
                ? 'border-forvis-blue-600 text-forvis-blue-600'
                : 'border-transparent text-forvis-gray-600 hover:text-forvis-gray-900 hover:border-forvis-gray-300'
            }`}
          >
            <div className="flex items-center space-x-2">
              <BarChart3 className="h-5 w-5" />
              <span>Graphs</span>
            </div>
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'profitability' && (
        <div className="space-y-6 p-6">
      {/* Key Performance Summary - Section Header */}
      <div className="bg-gradient-dashboard-card rounded-lg p-4 border border-forvis-blue-200 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="bg-gradient-icon-standard rounded-full p-2">
            <BarChart3 className="h-5 w-5 text-white" />
          </div>
          <h2 className="text-xl font-bold text-forvis-gray-900">Key Performance Metrics</h2>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div 
          className="bg-gradient-dashboard-card rounded-lg p-4 shadow-corporate border border-forvis-blue-100 cursor-pointer hover:shadow-lg transition-shadow"
          onMouseEnter={handleCardHover}
          onClick={() => handleCardClick('netRevenue', 'Net Revenue', metrics.netRevenue)}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-forvis-gray-600 uppercase tracking-wider">Net Revenue</p>
              <p className="text-2xl font-bold mt-2 text-forvis-blue-600">{formatCurrency(metrics.netRevenue)}</p>
              <p className="text-xs text-forvis-gray-500 mt-1">Gross Production + Adjustments</p>
            </div>
            <div className="bg-gradient-icon-standard rounded-full p-2.5">
              <BarChart3 className="w-5 h-5 text-white" />
            </div>
          </div>
        </div>

        <div 
          className="bg-gradient-dashboard-card rounded-lg p-4 shadow-corporate border border-forvis-blue-100 cursor-pointer hover:shadow-lg transition-shadow"
          onMouseEnter={handleCardHover}
          onClick={() => handleCardClick('grossProfit', 'Gross Profit', metrics.grossProfit)}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-forvis-gray-600 uppercase tracking-wider">Gross Profit</p>
              <p className={`text-2xl font-bold mt-2 ${
                metrics.grossProfitPercentage >= 60
                  ? 'text-forvis-success-600'
                  : metrics.grossProfitPercentage >= 50
                  ? 'text-forvis-warning-600'
                  : 'text-forvis-error-600'
              }`}>
                {formatCurrency(metrics.grossProfit)}
              </p>
              <p className="text-xs text-forvis-gray-500 mt-1">Net Revenue - Costs</p>
            </div>
            <div
              className={`rounded-full p-2.5 ${
                metrics.grossProfitPercentage >= 60
                  ? 'bg-forvis-success-600'
                  : metrics.grossProfitPercentage >= 50
                  ? 'bg-forvis-warning-600'
                  : 'bg-forvis-error-600'
              }`}
            >
              <DollarSign className="w-5 h-5 text-white" />
            </div>
          </div>
        </div>

        <div 
          className="bg-gradient-dashboard-card rounded-lg p-4 shadow-corporate border border-forvis-blue-100 cursor-pointer hover:shadow-lg transition-shadow"
          onMouseEnter={handleCardHover}
          onClick={() => handleCardClick('balWIP', 'WIP Balance', metrics.balWIP)}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-forvis-gray-600 uppercase tracking-wider">WIP Balance</p>
              <p className="text-2xl font-bold mt-2 text-forvis-blue-600">{formatCurrency(metrics.balWIP)}</p>
              <p className="text-xs text-forvis-gray-500 mt-1">Net WIP (incl. provisions)</p>
            </div>
            <div className="bg-gradient-icon-standard rounded-full p-2.5">
              <Briefcase className="w-5 h-5 text-white" />
            </div>
          </div>
        </div>

        <div 
          className="bg-gradient-dashboard-card rounded-lg p-4 shadow-corporate border border-forvis-blue-100 cursor-pointer hover:shadow-lg transition-shadow"
          onMouseEnter={handleCardHover}
          onClick={() => handleCardClick('grossProfitPercentage', 'Gross Profit %', metrics.grossProfitPercentage)}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-forvis-gray-600 uppercase tracking-wider">Gross Profit %</p>
              <p className={`text-2xl font-bold mt-2 ${
                metrics.grossProfitPercentage >= 60
                  ? 'text-forvis-success-600'
                  : metrics.grossProfitPercentage >= 50
                  ? 'text-forvis-warning-600'
                  : 'text-forvis-error-600'
              }`}>
                {metrics.grossProfitPercentage.toFixed(2)}%
              </p>
              <div className="mt-2">
                <div className={`inline-flex items-center text-xs font-bold px-3 py-1 rounded-full ${
                  metrics.grossProfitPercentage >= 60
                    ? 'bg-forvis-success-100 text-forvis-success-700 border border-forvis-success-200'
                    : metrics.grossProfitPercentage >= 50
                    ? 'bg-forvis-warning-100 text-forvis-warning-700 border border-forvis-warning-200'
                    : 'bg-forvis-error-100 text-forvis-error-700 border border-forvis-error-200'
                }`}>
                  {metrics.grossProfitPercentage >= 60
                    ? '✓ Above 60%'
                    : metrics.grossProfitPercentage >= 50
                    ? '⚠ Near 60%'
                    : '✗ Below 60%'}
                </div>
              </div>
            </div>
            <div
              className={`rounded-full p-2.5 ${
                metrics.grossProfitPercentage >= 60
                  ? 'bg-forvis-success-600'
                  : metrics.grossProfitPercentage >= 50
                  ? 'bg-forvis-warning-600'
                  : 'bg-forvis-error-600'
              }`}
            >
              <BarChart3 className="w-5 h-5 text-white" />
            </div>
          </div>
        </div>
      </div>

      {/* Detailed Metrics */}
      <div className="card">
        <div className="px-6 py-4 border-b border-forvis-gray-200">
          <h3 className="text-lg font-bold text-forvis-gray-900">Detailed Breakdown</h3>
        </div>
        
        <div className="p-6 space-y-6">
          {/* Production & Revenue Flow Section Header */}
          <div className="bg-gradient-dashboard-card rounded-lg p-4 border border-forvis-blue-200 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="bg-gradient-icon-standard rounded-full p-2">
                <TrendingUp className="h-5 w-5 text-white" />
              </div>
              <h2 className="text-xl font-bold text-forvis-gray-900">Revenue Flow</h2>
            </div>
          </div>

          <div className="bg-white rounded-lg p-6 border border-forvis-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div>
                <ProfitabilityCard
                  label="Gross Production"
                  value={metrics.grossProduction}
                  onClick={() => handleCardClick('grossProduction', 'Gross Production', metrics.grossProduction)}
                  metricType="grossProduction"
                />
                <p className="text-xs text-forvis-gray-500 mt-2 text-center">LTD Time + LTD Disb</p>
              </div>
              <div>
                <ProfitabilityCard
                  label="LTD Adjustment"
                  value={metrics.ltdAdjustment}
                  showTrend
                  onClick={() => handleCardClick('ltdAdjustment', 'LTD Adjustment', metrics.ltdAdjustment)}
                  metricType="ltdAdjustment"
                />
                <p className="text-xs text-forvis-gray-500 mt-2 text-center">Time + Disb Adjustments</p>
              </div>
              <div>
                <ProfitabilityCard
                  label="Adjustment %"
                  value={metrics.adjustmentPercentage}
                  isPercentage
                  showTrend
                />
                <p className="text-xs text-forvis-gray-500 mt-2 text-center">% of Production</p>
              </div>
              <div>
                <ProfitabilityCard
                  label="LTD Cost"
                  value={-metrics.ltdCost}
                  onClick={() => handleCardClick('ltdCost', 'LTD Cost', metrics.ltdCost)}
                  metricType="ltdCost"
                />
                <p className="text-xs text-forvis-gray-500 mt-2 text-center">Cost Excluding CP</p>
              </div>
            </div>
          </div>

          {/* Rate Metrics Section Header */}
          <div className="bg-gradient-dashboard-card rounded-lg p-4 border border-forvis-blue-200 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="bg-gradient-icon-standard rounded-full p-2">
                <Clock className="h-5 w-5 text-white" />
              </div>
              <h2 className="text-xl font-bold text-forvis-gray-900">Hourly Rates</h2>
            </div>
          </div>

          <div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <ProfitabilityCard
                label="Total Hours"
                value={metrics.ltdHours}
                isCurrency={false}
                onClick={() => handleCardClick('ltdHours', 'Total Hours', metrics.ltdHours)}
                metricType="ltdHours"
              />
              <ProfitabilityCard
                label="Average Chargeout Rate"
                value={metrics.averageChargeoutRate}
                onClick={() => handleCardClick('averageChargeoutRate', 'Average Chargeout Rate', metrics.averageChargeoutRate)}
                metricType="averageChargeoutRate"
              />
              <ProfitabilityCard
                label="Average Recovery Rate"
                value={metrics.averageRecoveryRate}
                onClick={() => handleCardClick('averageRecoveryRate', 'Average Recovery Rate', metrics.averageRecoveryRate)}
                metricType="averageRecoveryRate"
              />
            </div>
          </div>

          {/* WIP Balances Section Header */}
          <div className="bg-gradient-dashboard-card rounded-lg p-4 border border-forvis-blue-200 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="bg-gradient-icon-standard rounded-full p-2">
                <Briefcase className="h-5 w-5 text-white" />
              </div>
              <h2 className="text-xl font-bold text-forvis-gray-900">WIP Balances</h2>
            </div>
          </div>

          <div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <ProfitabilityCard 
                label="Balance WIP" 
                value={metrics.balWIP}
                onClick={() => handleCardClick('balWIP', 'Balance WIP', metrics.balWIP)}
                metricType="balWIP"
              />
              <ProfitabilityCard 
                label="Balance Time" 
                value={metrics.balTime}
                onClick={() => handleCardClick('balTime', 'Balance Time', metrics.balTime)}
                metricType="balTime"
              />
              <ProfitabilityCard 
                label="Balance Disb" 
                value={metrics.balDisb}
                onClick={() => handleCardClick('balDisb', 'Balance Disb', metrics.balDisb)}
                metricType="balDisb"
              />
              <ProfitabilityCard 
                label="WIP Provision" 
                value={metrics.wipProvision}
                onClick={() => handleCardClick('wipProvision', 'WIP Provision', metrics.wipProvision)}
                metricType="wipProvision"
              />
            </div>
          </div>

          {/* Additional Details Section Header */}
          <div className="bg-gradient-dashboard-card rounded-lg p-4 border border-forvis-blue-200 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="bg-gradient-icon-standard rounded-full p-2">
                <Wallet className="h-5 w-5 text-white" />
              </div>
              <h2 className="text-xl font-bold text-forvis-gray-900">Additional Metrics</h2>
            </div>
          </div>

          <div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <ProfitabilityCard 
                label="LTD Adjustments" 
                value={metrics.ltdAdj}
                onClick={() => handleCardClick('ltdAdj', 'LTD Adjustments', metrics.ltdAdj)}
                metricType="ltdAdj"
              />
              <ProfitabilityCard 
                label="LTD Fees" 
                value={metrics.ltdFee}
                onClick={() => handleCardClick('ltdFee', 'LTD Fees', metrics.ltdFee)}
                metricType="ltdFee"
              />
            </div>
          </div>

          {/* Footer Info */}
          <div className="flex items-center justify-end pt-4 border-t border-forvis-gray-200 text-sm text-forvis-gray-600">
            {lastUpdated && (
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                <span>Last Updated: <span className="font-semibold">{new Date(lastUpdated).toLocaleDateString()}</span></span>
              </div>
            )}
          </div>
        </div>
      </div>

        {/* Transaction Details Modal - Only render when open */}
        {modalState.isOpen && (
          <TransactionDetailsModal
            isOpen={true}
            onClose={handleCloseModal}
            taskId={taskId}
            metricType={modalState.metricType}
            metricLabel={modalState.metricLabel}
            metricValue={modalState.metricValue}
          />
        )}
        </div>
      )}

      {/* Budget Tab */}
      {activeTab === 'budget' && (
        <TaskBudgetTab taskId={taskId} />
      )}

      {/* Graphs Tab */}
      {activeTab === 'graphs' && (
        <div className="p-6">
          <TaskGraphsTab taskId={taskId} />
        </div>
      )}
    </div>
  );
}





















