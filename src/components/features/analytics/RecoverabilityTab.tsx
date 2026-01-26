'use client';

import { useState } from 'react';
import { Banknote, Clock, TrendingUp, AlertTriangle, AlertCircle, CheckCircle } from 'lucide-react';
import { useClientDebtors, DebtorMetrics } from '@/hooks/clients/useClientDebtors';
import { useGroupDebtors } from '@/hooks/groups/useGroupDebtors';
import { InvoiceDetailsModal } from './InvoiceDetailsModal';

interface RecoverabilityTabProps {
  clientId?: string;  // Can be internal ID or GSClientID depending on context
  groupCode?: string;
}

interface AgingSegment {
  label: string;
  shortLabel: string;
  value: number;
  percentage: number;
  bgGradient: string;
  textColor: string;
  icon: React.ReactNode;
  bucketKey: 'current' | 'days31_60' | 'days61_90' | 'days91_120' | 'days120Plus';
}

interface AgingBarProps {
  segments: AgingSegment[];
  totalBalance: number;
  transactionCount: number;
  onSegmentClick: (bucketKey: AgingSegment['bucketKey']) => void;
}

function AgingBar({ segments, totalBalance, transactionCount, onSegmentClick }: AgingBarProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="w-full">
      {/* Desktop/Tablet: Horizontal Bar with Total */}
      <div className="hidden md:flex rounded-lg overflow-hidden shadow-corporate border border-forvis-blue-100" style={{ height: '100px' }}>
        {/* Total Balance Section */}
        <div 
          className="flex flex-col items-center justify-center p-3 border-r-2 border-white/50"
          style={{ 
            flex: '0 0 180px',
            background: 'linear-gradient(135deg, #5B93D7 0%, #2E5AAC 100%)'
          }}
        >
          <Banknote className="h-5 w-5 text-white mb-1" />
          <p className="text-xs font-medium text-white uppercase tracking-wider text-center mb-1">
            Total
          </p>
          <p className="text-base font-bold text-white text-center mb-0.5">
            {formatCurrency(totalBalance)}
          </p>
          <p className="text-xs text-white/80 text-center">
            {transactionCount} txns
          </p>
        </div>

        {/* Aging Segments - Equal Width */}
        {segments.map((segment, index) => {
          return (
            <div
              key={segment.bucketKey}
              className="relative flex flex-col items-center justify-center p-2 transition-all cursor-pointer hover:brightness-95 flex-1"
              style={{
                background: segment.bgGradient,
                borderLeft: '2px solid rgba(255, 255, 255, 0.5)',
              }}
              onClick={() => onSegmentClick(segment.bucketKey)}
            >
              {/* Icon */}
              <div className="mb-1">
                {segment.icon}
              </div>
              
              {/* Label */}
              <p className="text-xs font-medium text-forvis-gray-700 uppercase tracking-wider text-center mb-1">
                {segment.shortLabel}
              </p>
              
              {/* Amount */}
              <p className={`text-sm font-bold ${segment.textColor} text-center mb-0.5`}>
                {formatCurrency(segment.value)}
              </p>
              
              {/* Percentage */}
              <p className="text-xs text-forvis-gray-600 text-center">
                {segment.percentage.toFixed(1)}%
              </p>
              
              {/* Hover overlay */}
              <div className="absolute inset-0 bg-white opacity-0 hover:opacity-10 transition-opacity" />
            </div>
          );
        })}
      </div>

      {/* Mobile: Scrollable Horizontal with Total */}
      <div className="md:hidden overflow-x-auto">
        <div className="flex rounded-lg overflow-hidden shadow-corporate border border-forvis-blue-100 min-w-max" style={{ height: '100px' }}>
          {/* Total Balance Section */}
          <div 
            className="flex flex-col items-center justify-center p-3 border-r-2 border-white/50"
            style={{ 
              minWidth: '140px',
              background: 'linear-gradient(135deg, #5B93D7 0%, #2E5AAC 100%)'
            }}
          >
            <Banknote className="h-5 w-5 text-white mb-1" />
            <p className="text-xs font-medium text-white uppercase tracking-wider text-center mb-1">
              Total
            </p>
            <p className="text-base font-bold text-white text-center mb-0.5">
              {formatCurrency(totalBalance)}
            </p>
            <p className="text-xs text-white/80 text-center">
              {transactionCount} txns
            </p>
          </div>

          {/* Aging Segments */}
          {segments.map((segment) => {
            return (
              <div
                key={segment.bucketKey}
                className="relative flex flex-col items-center justify-center p-3 transition-all cursor-pointer hover:brightness-95"
                style={{
                  minWidth: '120px',
                  background: segment.bgGradient,
                  borderLeft: '2px solid rgba(255, 255, 255, 0.5)',
                }}
                onClick={() => onSegmentClick(segment.bucketKey)}
              >
                {/* Icon */}
                <div className="mb-1">
                  {segment.icon}
                </div>
                
                {/* Label */}
                <p className="text-xs font-medium text-forvis-gray-700 uppercase tracking-wider text-center mb-1">
                  {segment.shortLabel}
                </p>
                
                {/* Amount */}
                <p className={`text-sm font-bold ${segment.textColor} text-center mb-0.5`}>
                  {formatCurrency(segment.value)}
                </p>
                
                {/* Percentage */}
                <p className="text-xs text-forvis-gray-600 text-center">
                  {segment.percentage.toFixed(1)}%
                </p>
                
                {/* Hover overlay */}
                <div className="absolute inset-0 bg-white opacity-0 hover:opacity-10 transition-opacity" />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export function RecoverabilityTab({ clientId, groupCode }: RecoverabilityTabProps) {
  // Use the appropriate hook based on props
  const { data: clientDebtorData, isLoading: isLoadingClient, error: clientError } = useClientDebtors(clientId || '', { enabled: !!clientId });
  const { data: groupDebtorData, isLoading: isLoadingGroup, error: groupError } = useGroupDebtors(groupCode || '', { enabled: !!groupCode });
  
  // Select the appropriate data based on which is available
  const debtorData = clientId ? clientDebtorData : groupDebtorData;
  const isLoading = clientId ? isLoadingClient : isLoadingGroup;
  const error = clientId ? clientError : groupError;
  const entityType = clientId ? 'client' : 'group';
  
  const [activeTab, setActiveTab] = useState<string>('overall');
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedBucket, setSelectedBucket] = useState<'current' | 'days31_60' | 'days61_90' | 'days91_120' | 'days120Plus'>('current');

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
    days31_60: (currentMetrics.aging.days31_60 / totalBalance) * 100,
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

      {/* Aging Bar - Inline Display with Total */}
      <AgingBar
        totalBalance={currentMetrics.totalBalance}
        transactionCount={transactionCount}
        segments={[
          {
            label: 'Current (0-30 days)',
            shortLabel: 'Current',
            value: currentMetrics.aging.current,
            percentage: agingPercentages.current,
            bgGradient: 'linear-gradient(135deg, #F0FDF4 0%, #DCFCE7 100%)',
            textColor: 'text-green-700',
            icon: <CheckCircle className="h-5 w-5 text-green-600" />,
            bucketKey: 'current',
          },
          {
            label: '31-60 days',
            shortLabel: '31-60',
            value: currentMetrics.aging.days31_60,
            percentage: agingPercentages.days31_60,
            bgGradient: 'linear-gradient(135deg, #F0F7FD 0%, #E0EDFB 100%)',
            textColor: 'text-forvis-blue-600',
            icon: <Clock className="h-5 w-5 text-forvis-blue-600" />,
            bucketKey: 'days31_60',
          },
          {
            label: '61-90 days',
            shortLabel: '61-90',
            value: currentMetrics.aging.days61_90,
            percentage: agingPercentages.days61_90,
            bgGradient: 'linear-gradient(135deg, #FFFBEB 0%, #FEF3C7 100%)',
            textColor: 'text-yellow-700',
            icon: <Clock className="h-5 w-5 text-yellow-600" />,
            bucketKey: 'days61_90',
          },
          {
            label: '91-120 days',
            shortLabel: '91-120',
            value: currentMetrics.aging.days91_120,
            percentage: agingPercentages.days91_120,
            bgGradient: 'linear-gradient(135deg, #FFF7ED 0%, #FFEDD5 100%)',
            textColor: 'text-orange-700',
            icon: <AlertTriangle className="h-5 w-5 text-orange-600" />,
            bucketKey: 'days91_120',
          },
          {
            label: '120+ days',
            shortLabel: '120+',
            value: currentMetrics.aging.days120Plus,
            percentage: agingPercentages.days120Plus,
            bgGradient: 'linear-gradient(135deg, #FEF2F2 0%, #FEE2E2 100%)',
            textColor: 'text-red-700',
            icon: <AlertCircle className="h-5 w-5 text-red-600" />,
            bucketKey: 'days120Plus',
          },
        ]}
        onSegmentClick={(bucketKey) => {
          setSelectedBucket(bucketKey);
          setModalOpen(true);
        }}
      />

      {/* Key Metrics - Bottom Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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

      {/* Invoice Details Modal */}
      {clientId && clientDebtorData && (
        <InvoiceDetailsModal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          clientId={clientId}
          initialBucket={selectedBucket}
          clientName={clientDebtorData.clientName || undefined}
        />
      )}
    </div>
  );
}
