'use client';

/**
 * My Reports Overview Component
 * 
 * Displays 9 financial performance graphs over a rolling 24-month period:
 * - Net Revenue
 * - Gross Profit
 * - Collections
 * - WIP Lockup Days (with 45-day target)
 * - Debtors Lockup Days (with 45-day target)
 * - Writeoff % (with 25% target)
 * - Total Lockup Days (WIP + Debtors, with 90-day target)
 * - WIP Balance
 * - Debtors Balance
 */

import { useMemo } from 'react';
import { 
  TrendingUp, 
  DollarSign, 
  Calendar, 
  Clock,
  AlertTriangle,
  Wallet,
  Timer,
  Banknote,
  CreditCard,
} from 'lucide-react';
import { useMyReportsOverview } from '@/hooks/reports/useMyReportsOverview';
import { LoadingSpinner } from '@/components/ui';
import type { MonthlyMetrics } from '@/types/api';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { format, parse } from 'date-fns';

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    value: number;
    name: string;
    dataKey: string;
    payload?: MonthlyMetrics;
  }>;
  label?: string;
  valueFormatter: (value: number) => string;
  showCalculation?: 'wip' | 'debtors' | 'writeoff';
}

function CustomTooltip({ active, payload, label, valueFormatter, showCalculation }: CustomTooltipProps) {
  if (!active || !payload || !payload.length) {
    return null;
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const data = payload[0]?.payload;

  return (
    <div className="bg-white p-3 border border-forvis-gray-200 rounded-lg shadow-lg max-w-xs">
      <p className="text-sm font-medium text-forvis-gray-900 mb-2">
        {label}
      </p>
      {payload.map((entry, index) => (
        <div key={index}>
          <div className="flex items-center gap-2 mb-2">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: '#2E5AAC' }}
            />
            <span className="text-sm text-forvis-gray-700">
              {entry.name}: <span className="font-semibold">{valueFormatter(entry.value)}</span>
            </span>
          </div>
          
          {/* Show calculation breakdown */}
          {showCalculation === 'wip' && data && data.wipBalance !== undefined && data.trailing12Revenue !== undefined && (
            <div className="text-xs text-forvis-gray-600 mt-2 pl-5 border-l-2 border-forvis-blue-200">
              <div className="font-medium mb-1">Calculation:</div>
              <div>WIP Balance: {formatCurrency(data.wipBalance)}</div>
              <div>Trailing 12M Revenue: {formatCurrency(data.trailing12Revenue)}</div>
              <div className="mt-1 font-medium">({formatCurrency(data.wipBalance)} × 365) ÷ {formatCurrency(data.trailing12Revenue)}</div>
            </div>
          )}
          
          {showCalculation === 'debtors' && data && data.debtorsBalance !== undefined && data.trailing12Billings !== undefined && (
            <div className="text-xs text-forvis-gray-600 mt-2 pl-5 border-l-2 border-forvis-blue-200">
              <div className="font-medium mb-1">Calculation:</div>
              <div>Debtors Balance: {formatCurrency(data.debtorsBalance)}</div>
              <div>Trailing 12M Billings: {formatCurrency(data.trailing12Billings)}</div>
              <div className="mt-1 font-medium">({formatCurrency(data.debtorsBalance)} × 365) ÷ {formatCurrency(data.trailing12Billings)}</div>
            </div>
          )}
          
          {showCalculation === 'writeoff' && data && data.negativeAdj !== undefined && data.provisions !== undefined && data.grossTime !== undefined && (
            <div className="text-xs text-forvis-gray-600 mt-2 pl-5 border-l-2 border-forvis-blue-200">
              <div className="font-medium mb-1">Calculation:</div>
              <div>Negative Adjustments: {formatCurrency(data.negativeAdj)}</div>
              <div>Provisions: {formatCurrency(data.provisions)}</div>
              <div>Gross Time: {formatCurrency(data.grossTime)}</div>
              <div className="mt-1 font-medium">({formatCurrency(data.negativeAdj + data.provisions)} ÷ {formatCurrency(data.grossTime)}) × 100</div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

interface ChartCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  data: Array<MonthlyMetrics & { value: number }>;
  valueFormatter: (value: number) => string;
  yAxisFormatter: (value: number) => string;
  dataKey: string;
  color: string;
  showCalculation?: 'wip' | 'debtors' | 'writeoff';
  targetLine?: {
    value: number;
    label: string;
    color?: string;
  };
}

function ChartCard({
  title,
  description,
  icon,
  data,
  valueFormatter,
  yAxisFormatter,
  dataKey,
  color,
  showCalculation,
  targetLine,
}: ChartCardProps) {
  const formatXAxis = (monthStr: string) => {
    try {
      const date = parse(monthStr, 'yyyy-MM', new Date());
      return format(date, 'MMM yy');
    } catch {
      return monthStr;
    }
  };

  return (
    <div className="rounded-lg bg-white shadow-corporate border border-forvis-gray-200 p-6">
      <div className="flex items-start gap-3 mb-4">
        <div
          className="rounded-lg p-2.5 flex-shrink-0"
          style={{ background: 'linear-gradient(135deg, #5B93D7 0%, #2E5AAC 100%)' }}
        >
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-semibold text-forvis-gray-900">{title}</h3>
          <p className="text-sm text-forvis-gray-600 mt-1">{description}</p>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={300}>
        <LineChart
          data={data}
          margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
          <XAxis
            dataKey="month"
            tickFormatter={formatXAxis}
            stroke="#6B7280"
            style={{ fontSize: '12px' }}
            interval="preserveStartEnd"
            minTickGap={50}
          />
          <YAxis
            tickFormatter={yAxisFormatter}
            stroke="#6B7280"
            style={{ fontSize: '12px' }}
            width={80}
          />
          <Tooltip
            content={<CustomTooltip valueFormatter={valueFormatter} showCalculation={showCalculation} />}
          />
          <Legend wrapperStyle={{ paddingTop: '20px' }} iconType="line" />
          <Line
            type="monotone"
            dataKey={dataKey}
            name={title}
            stroke={color}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 6 }}
            isAnimationActive={false}
            connectNulls={true}
          />
          {targetLine && (
            <ReferenceLine
              y={targetLine.value}
              stroke={targetLine.color || '#DC2626'}
              strokeDasharray="5 5"
              strokeWidth={2}
              label={{
                value: targetLine.label,
                position: 'right',
                fill: targetLine.color || '#DC2626',
                fontSize: 12,
                fontWeight: 500,
              }}
            />
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function MyReportsOverview() {
  const { data, isLoading, error } = useMyReportsOverview();

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Format currency short (for Y-axis)
  const formatCurrencyShort = (amount: number) => {
    if (Math.abs(amount) >= 1000000) {
      return `R${(amount / 1000000).toFixed(1)}M`;
    } else if (Math.abs(amount) >= 1000) {
      return `R${(amount / 1000).toFixed(0)}K`;
    }
    return `R${amount.toFixed(0)}`;
  };

  // Format percentage
  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  // Format days
  const formatDays = (value: number) => {
    return `${value.toFixed(0)} days`;
  };

  // Format days short (for Y-axis)
  const formatDaysShort = (value: number) => {
    return `${value.toFixed(0)}d`;
  };

  // Prepare chart data
  const chartData = useMemo(() => {
    if (!data?.monthlyMetrics) return null;

    return {
      netRevenue: data.monthlyMetrics.map(m => ({
        ...m,
        value: m.netRevenue,
      })),
      grossProfit: data.monthlyMetrics.map(m => ({
        ...m,
        value: m.grossProfit,
      })),
      collections: data.monthlyMetrics.map(m => ({
        ...m,
        value: m.collections,
      })),
      wipLockup: data.monthlyMetrics.map(m => ({
        ...m,
        value: m.wipLockupDays,
      })),
      debtorsLockup: data.monthlyMetrics.map(m => ({
        ...m,
        value: m.debtorsLockupDays,
      })),
      writeoff: data.monthlyMetrics.map(m => ({
        ...m,
        value: m.writeoffPercentage,
      })),
      // Total Lockup Days = WIP Lockup + Debtors Lockup
      totalLockup: data.monthlyMetrics.map(m => ({
        ...m,
        value: m.wipLockupDays + m.debtorsLockupDays,
      })),
      // WIP Balance
      wipBalance: data.monthlyMetrics.map(m => ({
        ...m,
        value: m.wipBalance ?? 0,
      })),
      // Debtors Balance
      debtorsBalance: data.monthlyMetrics.map(m => ({
        ...m,
        value: m.debtorsBalance ?? 0,
      })),
    };
  }, [data]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg bg-red-50 border border-red-200 p-6">
        <div className="flex items-center gap-3">
          <AlertTriangle className="h-6 w-6 text-red-600" />
          <div>
            <h3 className="text-lg font-semibold text-red-900">Error Loading Overview</h3>
            <p className="text-sm text-red-700 mt-1">
              {error instanceof Error ? error.message : 'Failed to load overview data'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!data || !chartData) {
    return (
      <div className="rounded-lg bg-forvis-gray-50 border border-forvis-gray-200 p-6">
        <div className="text-center py-8">
          <p className="text-sm text-forvis-gray-600">No data available</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-lg p-4 border border-forvis-blue-100" style={{ background: 'linear-gradient(135deg, #F0F7FD 0%, #E0EDFB 100%)' }}>
        <h2 className="text-xl font-semibold text-forvis-gray-900 mb-1">
          Financial Performance Overview
        </h2>
        <p className="text-sm text-forvis-gray-700">
          Monthly metrics over the last 24 months • Viewing as {data.filterMode === 'PARTNER' ? 'Partner' : 'Manager'}
        </p>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Net Revenue */}
        <ChartCard
          title="Net Revenue"
          description="Gross production plus adjustments"
          icon={<DollarSign className="h-5 w-5 text-white" />}
          data={chartData.netRevenue}
          valueFormatter={formatCurrency}
          yAxisFormatter={formatCurrencyShort}
          dataKey="value"
          color="#2E5AAC"
        />

        {/* Gross Profit */}
        <ChartCard
          title="Gross Profit"
          description="Net revenue minus costs"
          icon={<TrendingUp className="h-5 w-5 text-white" />}
          data={chartData.grossProfit}
          valueFormatter={formatCurrency}
          yAxisFormatter={formatCurrencyShort}
          dataKey="value"
          color="#2E5AAC"
        />

        {/* Collections */}
        <ChartCard
          title="Collections"
          description="Total receipts received"
          icon={<Wallet className="h-5 w-5 text-white" />}
          data={chartData.collections}
          valueFormatter={formatCurrency}
          yAxisFormatter={formatCurrencyShort}
          dataKey="value"
          color="#2E5AAC"
        />

        {/* WIP Lockup Days */}
        <ChartCard
          title="WIP Lockup Days"
          description="(WIP balance * 365) / trailing 12-month revenue"
          icon={<Clock className="h-5 w-5 text-white" />}
          data={chartData.wipLockup}
          valueFormatter={formatDays}
          yAxisFormatter={formatDaysShort}
          dataKey="value"
          color="#2E5AAC"
          showCalculation="wip"
          targetLine={{ value: 45, label: 'Target: 45 days' }}
        />

        {/* Debtors Lockup Days */}
        <ChartCard
          title="Debtors Lockup Days"
          description="(Debtors balance * 365) / trailing 12-month billings"
          icon={<Calendar className="h-5 w-5 text-white" />}
          data={chartData.debtorsLockup}
          valueFormatter={formatDays}
          yAxisFormatter={formatDaysShort}
          dataKey="value"
          color="#2E5AAC"
          showCalculation="debtors"
          targetLine={{ value: 45, label: 'Target: 45 days' }}
        />

        {/* Writeoff % */}
        <ChartCard
          title="Writeoff %"
          description="(Negative adjustments + provisions) / gross time"
          icon={<AlertTriangle className="h-5 w-5 text-white" />}
          data={chartData.writeoff}
          valueFormatter={formatPercentage}
          yAxisFormatter={formatPercentage}
          dataKey="value"
          color="#2E5AAC"
          showCalculation="writeoff"
          targetLine={{ value: 25, label: 'Target: 25%' }}
        />

        {/* Total Lockup Days */}
        <ChartCard
          title="Total Lockup Days"
          description="WIP lockup + Debtors lockup combined"
          icon={<Timer className="h-5 w-5 text-white" />}
          data={chartData.totalLockup}
          valueFormatter={formatDays}
          yAxisFormatter={formatDaysShort}
          dataKey="value"
          color="#2E5AAC"
          targetLine={{ value: 90, label: 'Target: 90 days' }}
        />

        {/* WIP Balance */}
        <ChartCard
          title="WIP Balance"
          description="Outstanding work in progress value"
          icon={<Banknote className="h-5 w-5 text-white" />}
          data={chartData.wipBalance}
          valueFormatter={formatCurrency}
          yAxisFormatter={formatCurrencyShort}
          dataKey="value"
          color="#2E5AAC"
        />

        {/* Debtors Balance */}
        <ChartCard
          title="Debtors Balance"
          description="Outstanding receivables value"
          icon={<CreditCard className="h-5 w-5 text-white" />}
          data={chartData.debtorsBalance}
          valueFormatter={formatCurrency}
          yAxisFormatter={formatCurrencyShort}
          dataKey="value"
          color="#2E5AAC"
        />
      </div>
    </div>
  );
}

