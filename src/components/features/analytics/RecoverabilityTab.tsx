'use client';

import { useState } from 'react';
import { Banknote, Clock, TrendingUp, AlertTriangle, AlertCircle, CheckCircle } from 'lucide-react';
import { useClientDebtors, DebtorMetrics } from '@/hooks/clients/useClientDebtors';

interface RecoverabilityTabProps {
  clientId?: string;  // Can be internal ID or GSClientID depending on context
  groupCode?: string;
}

interface AgingCardProps {
  label: string;
  value: number;
  percentage: number;
  bgGradient: string;
  textColor: string;
  icon: React.ReactNode;
}

function AgingCard({ 
  label, 
  value, 
  percentage,
  bgGradient,
  textColor,
  icon
}: AgingCardProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="rounded-lg p-4 shadow-corporate border border-forvis-blue-100" style={{ background: bgGradient }}>
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-medium text-forvis-gray-700 uppercase tracking-wider">{label}</p>
        {icon}
      </div>
      <p className={`text-2xl font-bold ${textColor}`}>{formatCurrency(value)}</p>
      <p className="text-xs text-forvis-gray-600 mt-1">{percentage.toFixed(1)}% of total</p>
    </div>
  );
}

export function RecoverabilityTab({ clientId, groupCode }: RecoverabilityTabProps) {
  // Use the appropriate hook based on props
  const { data: debtorData, isLoading, error } = useClientDebtors(clientId || '', { enabled: !!clientId });
  
  const entityType = clientId ? 'client' : 'group';
  
  const [activeTab, setActiveTab] = useState<string>('overall');

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDays = (days: number) => {
    return days.toFixed(1);
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
        <Banknote className="mx-auto h-16 w-16 text-red-600" />
        <h3 className="mt-4 text-lg font-bold text-red-900">Error loading debtor data</h3>
        <p className="mt-2 text-sm font-medium text-red-600">
          {error instanceof Error ? error.message : 'An error occurred while loading debtor data'}
        </p>
      </div>
    );
  }

  if (!debtorData || debtorData.transactionCount === 0) {
    return (
      <div className="text-center py-16 rounded-xl border-3 border-dashed shadow-lg" style={{ borderColor: '#2E5AAC', borderWidth: '3px', background: 'linear-gradient(135deg, #F8FBFE 0%, #EEF6FC 100%)' }}>
        <Banknote className="mx-auto h-16 w-16" style={{ color: '#2E5AAC' }} />
        <h3 className="mt-4 text-lg font-bold" style={{ color: '#1C3667' }}>No debtor data available</h3>
        <p className="mt-2 text-sm font-medium" style={{ color: '#2E5AAC' }}>
          No debtor transactions have been found for this {entityType}
        </p>
      </div>
    );
  }

  const { overall, byMasterServiceLine, masterServiceLines, transactionCount } = debtorData;
  
  // Get current tab data
  const currentMetrics: DebtorMetrics = activeTab === 'overall' 
    ? overall 
    : byMasterServiceLine[activeTab] || overall;

  // Calculate percentages for aging buckets
  const totalBalance = currentMetrics.totalBalance || 1; // Avoid division by zero
  const agingPercentages = {
    current: (currentMetrics.aging.current / totalBalance) * 100,
    days61_90: (currentMetrics.aging.days61_90 / totalBalance) * 100,
    days91_120: (currentMetrics.aging.days91_120 / totalBalance) * 100,
    days120Plus: (currentMetrics.aging.days120Plus / totalBalance) * 100,
  };

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

      {/* Aging Buckets - Top Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <AgingCard
          label="Current (0-60 days)"
          value={currentMetrics.aging.current}
          percentage={agingPercentages.current}
          bgGradient="linear-gradient(135deg, #F0F7FD 0%, #E0EDFB 100%)"
          textColor="text-forvis-blue-600"
          icon={<CheckCircle className="h-5 w-5 text-green-600" />}
        />
        
        <AgingCard
          label="61-90 days"
          value={currentMetrics.aging.days61_90}
          percentage={agingPercentages.days61_90}
          bgGradient="linear-gradient(135deg, #FFFBEB 0%, #FEF3C7 100%)"
          textColor="text-yellow-700"
          icon={<Clock className="h-5 w-5 text-yellow-600" />}
        />
        
        <AgingCard
          label="91-120 days"
          value={currentMetrics.aging.days91_120}
          percentage={agingPercentages.days91_120}
          bgGradient="linear-gradient(135deg, #FFF7ED 0%, #FFEDD5 100%)"
          textColor="text-orange-700"
          icon={<AlertTriangle className="h-5 w-5 text-orange-600" />}
        />
        
        <AgingCard
          label="120+ days"
          value={currentMetrics.aging.days120Plus}
          percentage={agingPercentages.days120Plus}
          bgGradient="linear-gradient(135deg, #FEF2F2 0%, #FEE2E2 100%)"
          textColor="text-red-700"
          icon={<AlertCircle className="h-5 w-5 text-red-600" />}
        />
      </div>

      {/* Key Metrics - Bottom Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #5B93D7 0%, #2E5AAC 100%)' }}>
              <Banknote className="h-6 w-6 text-white" />
            </div>
            <h3 className="text-lg font-bold text-forvis-gray-900">Total Balance</h3>
          </div>
          <p className="text-3xl font-bold text-forvis-blue-600">{formatCurrency(currentMetrics.totalBalance)}</p>
          <p className="text-xs text-forvis-gray-600 mt-2">{transactionCount} transactions</p>
        </div>

        <div className="card p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-green-600">
              <CheckCircle className="h-6 w-6 text-white" />
            </div>
            <h3 className="text-lg font-bold text-forvis-gray-900">Avg Payment Days</h3>
          </div>
          <p className="text-3xl font-bold text-green-600">
            {currentMetrics.avgPaymentDaysPaid !== null ? formatDays(currentMetrics.avgPaymentDaysPaid) : 'N/A'}
          </p>
          <p className="text-xs text-forvis-gray-600 mt-2">For paid invoices</p>
        </div>

        <div className="card p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
              currentMetrics.avgPaymentDaysOutstanding <= 60
                ? 'bg-green-600'
                : currentMetrics.avgPaymentDaysOutstanding <= 90
                ? 'bg-yellow-600'
                : 'bg-red-600'
            }`}>
              <TrendingUp className="h-6 w-6 text-white" />
            </div>
            <h3 className="text-lg font-bold text-forvis-gray-900">Avg Days Outstanding</h3>
          </div>
          <p className={`text-3xl font-bold ${
            currentMetrics.avgPaymentDaysOutstanding <= 60
              ? 'text-green-600'
              : currentMetrics.avgPaymentDaysOutstanding <= 90
              ? 'text-yellow-600'
              : 'text-red-600'
          }`}>
            {formatDays(currentMetrics.avgPaymentDaysOutstanding)}
          </p>
          <p className="text-xs text-forvis-gray-600 mt-2">For unpaid invoices</p>
        </div>
      </div>

      {/* Additional Info */}
      <div className="card p-4">
        <div className="flex items-center justify-between text-sm text-forvis-gray-600">
          <span>Showing data for: <span className="font-medium text-forvis-gray-900">{activeTab === 'overall' ? 'All Service Lines' : masterServiceLines.find(msl => msl.code === activeTab)?.name}</span></span>
          <span>Invoices: <span className="font-medium text-forvis-gray-900">{currentMetrics.invoiceCount}</span></span>
        </div>
      </div>
    </div>
  );
}
