'use client';

import { Calendar, DollarSign, TrendingUp, TrendingDown } from 'lucide-react';
import { useTaskGraphData } from '@/hooks/tasks/useTaskGraphData';
import { LoadingSpinner } from '@/components/ui';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { format, parseISO } from 'date-fns';

interface TaskGraphsTabProps {
  taskId: number;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    name: string;
    value: number;
    color: string;
  }>;
  label?: string;
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload || !payload.length) return null;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateStr: string) => {
    try {
      return format(parseISO(dateStr), 'dd MMM yyyy');
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="bg-white p-4 rounded-lg shadow-lg border border-forvis-gray-200">
      <p className="text-sm font-semibold text-forvis-gray-900 mb-2">
        {label && formatDate(label)}
      </p>
      {payload.map((entry, index) => (
        <div key={`tooltip-${index}`} className="flex items-center justify-between gap-4 mb-1">
          <div className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-xs text-forvis-gray-700">{entry.name}:</span>
          </div>
          <span className="text-xs font-semibold text-forvis-gray-900">
            {formatCurrency(entry.value)}
          </span>
        </div>
      ))}
    </div>
  );
}

interface SummaryCardProps {
  label: string;
  value: number;
  icon: React.ReactNode;
  color: string;
}

function SummaryCard({ label, value, icon, color }: SummaryCardProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div
      className="rounded-lg p-4 shadow-corporate border border-forvis-blue-100"
      style={{ background: 'linear-gradient(135deg, #F0F7FD 0%, #E0EDFB 100%)' }}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-medium text-forvis-gray-600 uppercase tracking-wider">
            {label}
          </p>
          <p className="text-2xl font-bold mt-2" style={{ color }}>
            {formatCurrency(value)}
          </p>
        </div>
        <div
          className="rounded-full p-2.5"
          style={{ background: 'linear-gradient(to bottom right, #5B93D7, #2E5AAC)' }}
        >
          {icon}
        </div>
      </div>
    </div>
  );
}

export function TaskGraphsTab({ taskId }: TaskGraphsTabProps) {
  const { data, isLoading, error } = useTaskGraphData(taskId);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatXAxis = (dateStr: string) => {
    try {
      return format(parseISO(dateStr), 'MMM yy');
    } catch {
      return dateStr;
    }
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
      <div className="rounded-lg bg-red-50 border border-red-200 p-6 text-center">
        <p className="text-red-800 font-semibold">Failed to load graph data</p>
        <p className="text-red-600 text-sm mt-2">
          {error instanceof Error ? error.message : 'An unknown error occurred'}
        </p>
      </div>
    );
  }

  if (!data || !data.data || data.data.dailyMetrics.length === 0) {
    return (
      <div className="rounded-lg bg-forvis-gray-50 border border-forvis-gray-200 p-8 text-center">
        <Calendar className="h-12 w-12 text-forvis-gray-400 mx-auto mb-3" />
        <p className="text-forvis-gray-700 font-semibold">No transaction data available</p>
        <p className="text-forvis-gray-600 text-sm mt-2">
          There are no transactions in the last 24 months for this task.
        </p>
      </div>
    );
  }

  const graphData = data.data;

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
        <SummaryCard
          label="Total Production"
          value={graphData.summary.totalProduction}
          icon={<TrendingUp className="w-5 h-5 text-white" />}
          color="#2E5AAC"
        />
        <SummaryCard
          label="Total Adjustments"
          value={graphData.summary.totalAdjustments}
          icon={<TrendingDown className="w-5 h-5 text-white" />}
          color="#F97316"
        />
        <SummaryCard
          label="Total Disbursements"
          value={graphData.summary.totalDisbursements}
          icon={<DollarSign className="w-5 h-5 text-white" />}
          color="#10B981"
        />
        <SummaryCard
          label="Total Billing"
          value={graphData.summary.totalBilling}
          icon={<DollarSign className="w-5 h-5 text-white" />}
          color="#8B5CF6"
        />
        <SummaryCard
          label="Total Provisions"
          value={graphData.summary.totalProvisions || 0}
          icon={<DollarSign className="w-5 h-5 text-white" />}
          color="#6366F1"
        />
        <SummaryCard
          label="Current WIP Balance"
          value={graphData.summary.currentWipBalance}
          icon={<DollarSign className="w-5 h-5 text-white" />}
          color="#EC4899"
        />
      </div>

      {/* Line Chart */}
      <div className="rounded-lg bg-white shadow-corporate border border-forvis-gray-200 p-6">
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-forvis-gray-900">
            24-Month Transaction Trends
          </h3>
          <p className="text-sm text-forvis-gray-600 mt-1">
            Daily transaction metrics from {format(parseISO(data.startDate), 'dd MMM yyyy')} to{' '}
            {format(parseISO(data.endDate), 'dd MMM yyyy')}
          </p>
        </div>

        <ResponsiveContainer width="100%" height={500}>
          <LineChart
            data={graphData.dailyMetrics}
            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
            <XAxis
              dataKey="date"
              tickFormatter={formatXAxis}
              stroke="#6B7280"
              style={{ fontSize: '12px' }}
              interval="preserveStartEnd"
              minTickGap={50}
            />
            <YAxis
              tickFormatter={(value) => formatCurrency(value)}
              stroke="#6B7280"
              style={{ fontSize: '12px' }}
              width={100}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              wrapperStyle={{ paddingTop: '20px' }}
              iconType="line"
            />
            <Line
              type="monotone"
              dataKey="production"
              name="Production"
              stroke="#2E5AAC"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 6 }}
              isAnimationActive={false}
              connectNulls={true}
            />
            <Line
              type="monotone"
              dataKey="adjustments"
              name="Adjustments"
              stroke="#F97316"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 6 }}
              isAnimationActive={false}
              connectNulls={true}
            />
            <Line
              type="monotone"
              dataKey="disbursements"
              name="Disbursements"
              stroke="#10B981"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 6 }}
              isAnimationActive={false}
              connectNulls={true}
            />
            <Line
              type="monotone"
              dataKey="billing"
              name="Billing"
              stroke="#8B5CF6"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 6 }}
              isAnimationActive={false}
              connectNulls={true}
            />
            <Line
              type="monotone"
              dataKey="provisions"
              name="Provisions"
              stroke="#6366F1"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 6 }}
              isAnimationActive={false}
              connectNulls={true}
            />
            <Line
              type="monotone"
              dataKey="wipBalance"
              name="WIP Balance"
              stroke="#EC4899"
              strokeWidth={3}
              dot={false}
              activeDot={{ r: 6 }}
              isAnimationActive={false}
              connectNulls={true}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Data Info */}
      <div className="rounded-lg bg-forvis-blue-50 border border-forvis-blue-100 p-4">
        <div className="flex items-start gap-3">
          <Calendar className="h-5 w-5 text-forvis-blue-600 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-forvis-blue-900">
              Data Period Information
            </p>
            <p className="text-xs text-forvis-blue-700 mt-1">
              This chart displays {graphData.dailyMetrics.length} days of transaction data for this task.
              The metrics are calculated from the WIPTransactions table with daily aggregation:
            </p>
            <ul className="text-xs text-forvis-blue-700 mt-2 ml-4 space-y-1">
              <li><strong>Production:</strong> Time transactions (TType = &apos;T&apos;)</li>
              <li><strong>Adjustments:</strong> Adjustment transactions (TType = &apos;ADJ&apos;)</li>
              <li><strong>Disbursements:</strong> Disbursement transactions (TType = &apos;D&apos;)</li>
              <li><strong>Billing:</strong> Fee transactions (TType = &apos;F&apos;)</li>
              <li><strong>Provisions:</strong> Provision transactions (TType = &apos;P&apos;)</li>
              <li><strong>WIP Balance:</strong> Actual WIP balance at each point (starting balance + cumulative changes from Production, Adjustments, Disbursements, Provisions, and Billing)</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}


