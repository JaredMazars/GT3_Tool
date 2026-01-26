'use client';

/**
 * My Reports Overview Component
 * 
 * Displays 9 financial performance graphs with CUMULATIVE values:
 * - Net Revenue (cumulative within period)
 * - Gross Profit (cumulative within period)
 * - Collections (cumulative within period)
 * - WIP Lockup Days (with 45-day target, trailing 12-month calculation)
 * - Debtors Lockup Days (with 45-day target, trailing 12-month calculation)
 * - Writeoff % (with 25% target, cumulative)
 * - Total Lockup Days (WIP + Debtors, with 90-day target)
 * - WIP Balance (running total from inception)
 * - Debtors Balance (running total from inception)
 * 
 * Supports:
 * - Fiscal Year view (current + 2 past years)
 * - Custom Date Range view (up to 24 months)
 */

import { useMemo, useState, useEffect } from 'react';
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
import { Input, Button, Banner, LoadingSpinner } from '@/components/ui';
import { FiscalYearSelector } from '@/components/features/reports/FiscalYearSelector';
import { ServiceLineFilterSelector } from '@/components/features/reports/ServiceLineFilterSelector';
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
import { parseISO, differenceInMonths } from 'date-fns';
import { getCurrentFiscalPeriod } from '@/lib/utils/fiscalPeriod';

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    value: number;
    name: string;
    dataKey: string;
    stroke?: string;
    color?: string;
    payload?: {
      fiscalMonth: string;
      fiscalMonthIndex: number;
      yearData?: { [year: string]: MonthlyMetrics };
      [key: string]: any;
    };
  }>;
  label?: string;
  valueFormatter: (value: number) => string;
  showCalculation?: 'wip' | 'debtors' | 'writeoff';
  onValueChange?: (value: number | null) => void;
}

function CustomTooltip({ active, payload, label, valueFormatter, showCalculation, onValueChange }: CustomTooltipProps) {
  // Update gauge value when tooltip is active
  const currentValue = active && payload?.[0]?.value;
  
  // Use useEffect-like behavior with ref to avoid infinite loops
  if (onValueChange) {
    if (active && typeof currentValue === 'number') {
      // Schedule state update to avoid render-during-render
      setTimeout(() => onValueChange(currentValue), 0);
    }
  }
  
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
  const dataKey = payload[0]?.dataKey; // e.g., "FY2024" or "CustomRange"
  const isCustomRange = dataKey === 'CustomRange';
  const fiscalYear = !isCustomRange && dataKey ? dataKey.replace('FY', '') : null;
  
  // For custom range, extract year from the month string if available
  const customRangeYear = isCustomRange && data?.month ? data.month.split('-')[0] : null;
  const yearForCalculations = isCustomRange ? customRangeYear : fiscalYear;

  return (
    <div className="bg-white p-3 border border-forvis-gray-200 rounded-lg shadow-lg max-w-xs">
      <p className="text-sm font-medium text-forvis-gray-900 mb-2">
        {label}
        {fiscalYear && ` (FY${fiscalYear})`}
      </p>
      {payload.map((entry, index) => (
        <div key={index}>
          <div className="flex items-center gap-2 mb-2">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: entry.stroke || entry.color || '#2E5AAC' }}
            />
            <span className="text-sm text-forvis-gray-700">
              {entry.name}: <span className="font-semibold">{valueFormatter(entry.value)}</span>
            </span>
          </div>
          
          {/* Show calculation breakdown */}
          {showCalculation === 'wip' && data?.yearData && yearForCalculations && (
            (() => {
              const yearMetrics = data.yearData[yearForCalculations];
              return yearMetrics && yearMetrics.wipBalance !== undefined && yearMetrics.trailing12Revenue !== undefined ? (
                <div className="text-xs text-forvis-gray-600 mt-2 pl-5 border-l-2 border-forvis-blue-200">
                  <div className="font-medium mb-1">Calculation:</div>
                  <div>WIP Balance: {formatCurrency(yearMetrics.wipBalance)}</div>
                  <div>Trailing 12M Revenue: {formatCurrency(yearMetrics.trailing12Revenue)}</div>
                  <div className="mt-1 font-medium">
                    ({formatCurrency(yearMetrics.wipBalance)} × 365) ÷ {formatCurrency(yearMetrics.trailing12Revenue)}
                  </div>
                </div>
              ) : null;
            })()
          )}
          
          {showCalculation === 'debtors' && data?.yearData && yearForCalculations && (
            (() => {
              const yearMetrics = data.yearData[yearForCalculations];
              return yearMetrics && yearMetrics.debtorsBalance !== undefined && yearMetrics.trailing12Billings !== undefined ? (
                <div className="text-xs text-forvis-gray-600 mt-2 pl-5 border-l-2 border-forvis-blue-200">
                  <div className="font-medium mb-1">Calculation:</div>
                  <div>Debtors Balance: {formatCurrency(yearMetrics.debtorsBalance)}</div>
                  <div>Trailing 12M Billings: {formatCurrency(yearMetrics.trailing12Billings)}</div>
                  <div className="mt-1 font-medium">
                    ({formatCurrency(yearMetrics.debtorsBalance)} × 365) ÷ {formatCurrency(yearMetrics.trailing12Billings)}
                  </div>
                </div>
              ) : null;
            })()
          )}
          
          {showCalculation === 'writeoff' && data?.yearData && yearForCalculations && (
            (() => {
              const yearMetrics = data.yearData[yearForCalculations];
              return yearMetrics && yearMetrics.negativeAdj !== undefined && yearMetrics.provisions !== undefined && yearMetrics.grossTime !== undefined ? (
                <div className="text-xs text-forvis-gray-600 mt-2 pl-5 border-l-2 border-forvis-blue-200">
                  <div className="font-medium mb-1">Calculation:</div>
                  <div>Negative Adjustments: {formatCurrency(yearMetrics.negativeAdj)}</div>
                  <div>Provisions: {formatCurrency(yearMetrics.provisions)}</div>
                  <div>Gross Time: {formatCurrency(yearMetrics.grossTime)}</div>
                  <div className="mt-1 font-medium">
                    ({formatCurrency(yearMetrics.negativeAdj + yearMetrics.provisions)} ÷ {formatCurrency(yearMetrics.grossTime)}) × 100
                  </div>
                </div>
              ) : null;
            })()
          )}
        </div>
      ))}
    </div>
  );
}

// Gauge Chart Component - Semi-circular speedometer style
interface GaugeChartProps {
  value: number;
  maxValue: number;
  targetValue: number;
  label?: string;
  size?: number;
}

function GaugeChart({ value, maxValue, targetValue, label, size = 100 }: GaugeChartProps) {
  // Dynamic max - use at least maxValue, but extend if value exceeds it
  const effectiveMax = Math.max(maxValue, value * 1.1);
  
  // Clamp value for display
  const clampedValue = Math.max(0, value);
  const displayValue = Math.min(clampedValue, effectiveMax);
  
  // Calculate angle (180 = left, 0 = right for horizontal gauge)
  // Map 0 -> 180° (left), max -> 0° (right)
  const valueAngle = 180 - (displayValue / effectiveMax) * 180;
  
  // Color zone boundaries as angles (180° to 0°)
  const targetAngle = 180 - (targetValue / effectiveMax) * 180;
  const warningAngle = 180 - ((targetValue * 1.5) / effectiveMax) * 180;
  
  // SVG dimensions - horizontal semi-circle
  const width = size;
  const height = size * 0.55;
  const cx = width / 2;
  const cy = height - 4; // Position center near bottom
  const radius = size * 0.38;
  const strokeWidth = size * 0.1;
  
  // Arc path helper - angles in degrees, 180=left, 0=right
  const describeArc = (startAngle: number, endAngle: number) => {
    const startRad = (startAngle * Math.PI) / 180;
    const endRad = (endAngle * Math.PI) / 180;
    const start = {
      x: cx + radius * Math.cos(startRad),
      y: cy - radius * Math.sin(startRad)
    };
    const end = {
      x: cx + radius * Math.cos(endRad),
      y: cy - radius * Math.sin(endRad)
    };
    const largeArc = Math.abs(endAngle - startAngle) > 180 ? 1 : 0;
    const sweep = startAngle > endAngle ? 1 : 0;
    return `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArc} ${sweep} ${end.x} ${end.y}`;
  };
  
  // Needle position
  const needleLength = radius * 0.85;
  const needleRad = (valueAngle * Math.PI) / 180;
  const needleX = cx + needleLength * Math.cos(needleRad);
  const needleY = cy - needleLength * Math.sin(needleRad);
  
  // Determine value color
  const getValueColor = () => {
    if (clampedValue <= targetValue) return '#22C55E'; // Green
    if (clampedValue <= targetValue * 1.5) return '#EAB308'; // Yellow
    return '#DC2626'; // Red
  };

  return (
    <div className="flex flex-col items-center">
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        {/* Green arc (0 to target) - left portion */}
        <path
          d={describeArc(180, Math.max(targetAngle, 0))}
          fill="none"
          stroke="#22C55E"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />
        {/* Yellow arc (target to 1.5x target) */}
        {targetAngle > 0 && (
          <path
            d={describeArc(targetAngle, Math.max(warningAngle, 0))}
            fill="none"
            stroke="#EAB308"
            strokeWidth={strokeWidth}
            strokeLinecap="butt"
          />
        )}
        {/* Red arc (1.5x target to max) - right portion */}
        {warningAngle > 0 && (
          <path
            d={describeArc(warningAngle, 0)}
            fill="none"
            stroke="#DC2626"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />
        )}
        {/* Target line marker */}
        <line
          x1={cx + (radius - strokeWidth/2 - 2) * Math.cos((targetAngle * Math.PI) / 180)}
          y1={cy - (radius - strokeWidth/2 - 2) * Math.sin((targetAngle * Math.PI) / 180)}
          x2={cx + (radius + strokeWidth/2 + 2) * Math.cos((targetAngle * Math.PI) / 180)}
          y2={cy - (radius + strokeWidth/2 + 2) * Math.sin((targetAngle * Math.PI) / 180)}
          stroke="#1C3667"
          strokeWidth={2}
        />
        {/* Needle */}
        <line
          x1={cx}
          y1={cy}
          x2={needleX}
          y2={needleY}
          stroke="#374151"
          strokeWidth={2.5}
          strokeLinecap="round"
        />
        {/* Center dot */}
        <circle cx={cx} cy={cy} r={4} fill="#374151" />
      </svg>
      <div className="text-center -mt-2">
        <span className="text-base font-bold" style={{ color: getValueColor() }}>
          {Math.round(clampedValue)}
        </span>
        {label && <span className="text-xs text-forvis-gray-500 ml-0.5">{label}</span>}
      </div>
    </div>
  );
}

interface ChartCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  data?: Array<MonthlyMetrics & { value: number }>;
  yearlyData?: { [year: string]: MonthlyMetrics[] };
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
  gauge?: {
    maxValue: number;
    targetValue: number;
    label?: string;
  };
  metricKey: 'netRevenue' | 'grossProfit' | 'collections' | 'wipLockupDays' | 'debtorsLockupDays' | 'writeoffPercentage' | 'totalLockup' | 'wipBalance' | 'debtorsBalance';
}

function ChartCard({
  title,
  description,
  icon,
  data,
  yearlyData,
  valueFormatter,
  yAxisFormatter,
  dataKey,
  color,
  showCalculation,
  targetLine,
  gauge,
  metricKey,
}: ChartCardProps) {
  // Track hovered value for gauge - null means show latest
  const [hoveredValue, setHoveredValue] = useState<number | null>(null);

  // Color scheme for year lines - distinctive colors for easy comparison
  const getYearColor = (year: string, index: number) => {
    const colors = [
      '#2E5AAC', // FY Current: Primary blue (Forvis brand)
      '#10B981', // FY-1: Emerald green (distinctive, professional)
      '#F59E0B'  // FY-2: Amber/gold (warm, highly distinctive)
    ];
    return colors[index] || color;
  };

  // Helper function to format month labels based on mode
  const formatMonthForDisplay = (monthStr: string): string => {
    // Parse YYYY-MM format
    const [year, month] = monthStr.split('-');
    if (!month || !year) return monthStr; // Fallback to original if parsing fails
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthIndex = parseInt(month, 10) - 1;
    return `${monthNames[monthIndex] || month} ${year}`;
  };

  // Unified data transformation - single array with all years per month
  const fiscalMonths = ['Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug'];
  
  // Determine if we're in custom date range mode by checking if data has actual month strings
  const isCustomDateRange = data && data.length > 0 && data[0]?.month?.includes('-');
  const isFiscalYearMode = yearlyData || (data && !isCustomDateRange);
  
  const transformDataToFiscalMonths = () => {
    // Multi-year mode: merge all years into single array by month
    if (yearlyData) {
      const years = Object.keys(yearlyData).sort().reverse(); // [2024, 2023, 2022]
      
      return fiscalMonths.map((fiscalMonth, monthIndex) => {
        const monthPoint: any = { fiscalMonth, fiscalMonthIndex: monthIndex };
        
        // Add each year's value as a separate property
        years.forEach(year => {
          const yearData = yearlyData[year];
          if (yearData) {
            const monthData = yearData[monthIndex];
            if (monthData) {
              let value: number;
              if (metricKey === 'totalLockup') {
                value = (monthData.wipLockupDays ?? 0) + (monthData.debtorsLockupDays ?? 0);
              } else {
                value = (monthData as any)[metricKey] ?? 0;
              }
              monthPoint[`FY${year}`] = value;
              
              // Store original data for tooltip (keyed by year)
              if (!monthPoint.yearData) monthPoint.yearData = {};
              monthPoint.yearData[year] = monthData;
            }
          }
        });
        
        // Only include month if at least one year has data (prevents line dropping to zero)
        const hasAnyData = years.some(year => monthPoint[`FY${year}`] !== undefined);
        if (!hasAnyData) return null;
        
        return monthPoint;
      }).filter(Boolean);
    }
    
    // Custom date range mode: use actual calendar months with years
    if (data && data.length > 0 && isCustomDateRange) {
      // For custom date range, use a single "CustomRange" key for the line
      // since we want one continuous line across potentially multiple years
      return data.map((monthData) => {
        const displayMonth = formatMonthForDisplay(monthData.month);
        const year = monthData.month.split('-')[0] || '';
        
        return {
          displayMonth,
          month: monthData.month,
          CustomRange: monthData.value, // Single line for custom date range
          yearData: { [year]: monthData }
        };
      });
    }
    
    // Fiscal year mode (single year): use fiscal month abbreviations
    // Only map months that have data (prevents line dropping to zero for future months)
    if (data && data.length > 0) {
      const firstMonth = data[0]?.month || '';
      const year = firstMonth.split('-')[0] || '';
      
      return data.map((monthData, index) => {
        const fiscalMonth = fiscalMonths[index];
        if (!fiscalMonth) return null;
        
        return {
          fiscalMonth,
          fiscalMonthIndex: index,
          [`FY${year}`]: monthData.value,
          yearData: { [year]: monthData }
        };
      }).filter(Boolean);
    }
    
    return [];
  };

  const chartData = transformDataToFiscalMonths();
  
  // Extract available data series (years or custom range)
  const availableYears = chartData.length > 0 
    ? Object.keys(chartData[0]).filter(key => key.startsWith('FY')).map(key => key.replace('FY', ''))
    : [];
  
  const hasCustomRange = chartData.length > 0 && 'CustomRange' in chartData[0];

  // Get latest value for gauge (used when not hovering)
  const latestValue = (() => {
    if (chartData.length > 0) {
      const lastMonth = chartData[chartData.length - 1];
      
      // For custom range, use CustomRange dataKey
      if (hasCustomRange) {
        return lastMonth.CustomRange ?? 0;
      }
      
      // For fiscal year, use most recent year's value
      if (availableYears.length > 0) {
        const mostRecentYear = availableYears[0]; // Years are sorted descending
        return lastMonth[`FY${mostRecentYear}`] ?? 0;
      }
    }
    return 0;
  })();
  
  // Use hovered value if available, otherwise latest
  const gaugeValue = hoveredValue !== null ? hoveredValue : latestValue;

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
        {gauge && (
          <div className="flex-shrink-0">
            <GaugeChart
              value={gaugeValue}
              maxValue={gauge.maxValue}
              targetValue={gauge.targetValue}
              label={gauge.label}
              size={80}
            />
          </div>
        )}
      </div>

      <ResponsiveContainer width="100%" height={300}>
        <LineChart
          data={chartData}
          margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
          onMouseLeave={() => setHoveredValue(null)}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
          <XAxis
            dataKey={isCustomDateRange ? "displayMonth" : "fiscalMonth"}
            stroke="#6B7280"
            style={{ fontSize: '12px' }}
            interval={0}
            angle={isCustomDateRange ? -45 : 0}
            textAnchor={isCustomDateRange ? "end" : "middle"}
          />
          <YAxis
            tickFormatter={yAxisFormatter}
            stroke="#6B7280"
            style={{ fontSize: '12px' }}
            width={80}
          />
          <Tooltip
            content={
              <CustomTooltip 
                valueFormatter={valueFormatter} 
                showCalculation={showCalculation} 
                onValueChange={gauge ? setHoveredValue : undefined}
              />
            }
          />
          <Legend wrapperStyle={{ paddingTop: '20px' }} iconType="line" />
          {availableYears.map((year, index) => (
            <Line
              key={year}
              type="monotone"
              dataKey={`FY${year}`}
              name={`FY${year}`}
              stroke={getYearColor(year, index)}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 6 }}
              isAnimationActive={false}
              connectNulls={true}
            />
          ))}
          {hasCustomRange && (
            <Line
              key="CustomRange"
              type="monotone"
              dataKey="CustomRange"
              name="Custom Range"
              stroke={color}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 6 }}
              isAnimationActive={false}
              connectNulls={true}
            />
          )}
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
  // State for fiscal year and mode selection
  const currentFY = getCurrentFiscalPeriod().fiscalYear;
  const [activeTab, setActiveTab] = useState<'fiscal' | 'custom'>('fiscal');
  const [fiscalYear, setFiscalYear] = useState<number | 'all'>(currentFY);
  
  // Service line filter state
  const [selectedServiceLines, setSelectedServiceLines] = useState<string[]>([]);
  
  // Separate state for date inputs vs applied query params
  const [customInputs, setCustomInputs] = useState({ start: '', end: '' });
  const [appliedDates, setAppliedDates] = useState({ start: '', end: '' });
  const [dateError, setDateError] = useState<string | null>(null);

  // Fetch data based on current mode - use appliedDates for query
  const { data, isLoading, error } = useMyReportsOverview({
    fiscalYear: activeTab === 'fiscal' ? fiscalYear : undefined,
    startDate: activeTab === 'custom' && appliedDates.start ? appliedDates.start : undefined,
    endDate: activeTab === 'custom' && appliedDates.end ? appliedDates.end : undefined,
    mode: activeTab,
    serviceLines: selectedServiceLines.length > 0 ? selectedServiceLines : undefined,
    enabled: activeTab === 'fiscal' || (activeTab === 'custom' && !!appliedDates.start && !!appliedDates.end),
  });

  // Determine if we're in multi-year mode
  const isMultiYear = fiscalYear === 'all' && data?.yearlyData;

  // Handle custom date range validation and application
  const handleDateRangeApply = () => {
    setDateError(null);
    
    if (!customInputs.start || !customInputs.end) {
      setDateError('Both start and end dates are required');
      return;
    }
    
    try {
      const start = parseISO(customInputs.start);
      const end = parseISO(customInputs.end);
      
      if (end < start) {
        setDateError('End date must be after start date');
        return;
      }
      
      const months = differenceInMonths(end, start);
      if (months > 24) {
        setDateError('Date range cannot exceed 24 months');
        return;
      }
      
      // Apply dates to trigger refetch
      setAppliedDates({ start: customInputs.start, end: customInputs.end });
    } catch (err) {
      setDateError('Invalid date format');
    }
  };


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

  // Prepare single-year data with value property for ChartCard
  const singleYearData = useMemo(() => {
    if (!data?.monthlyMetrics) return undefined;
    return data.monthlyMetrics.map(m => ({
      ...m,
      value: m.netRevenue, // Default value, ChartCard will use metricKey to extract correct value
    }));
  }, [data?.monthlyMetrics]);

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

  // Only show "no data" if we actually expected data (not waiting for custom dates)
  const isWaitingForCustomDates = activeTab === 'custom' && (!appliedDates.start || !appliedDates.end);
  const hasData = data?.monthlyMetrics || data?.yearlyData;
  if (!hasData && !isWaitingForCustomDates) {
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
          {activeTab === 'fiscal' 
            ? fiscalYear === 'all' 
              ? `All Years Comparison (FY${currentFY}, FY${currentFY - 1}, FY${currentFY - 2})` 
              : `FY${fiscalYear} (Cumulative)`
            : 'Custom Date Range (Cumulative)'
          }
          {data?.filterMode && (
            <> • Viewing as {data.filterMode === 'PARTNER' ? 'Partner' : 'Manager'}</>
          )}
          {selectedServiceLines.length > 0 ? (
            <> • Filtered: {selectedServiceLines.join(', ')}</>
          ) : (
            <> • All Service Lines</>
          )}
        </p>
      </div>

      {/* Tabs */}
      <div className="border-b border-forvis-gray-200">
        <nav className="flex gap-4" role="tablist">
          <button
            role="tab"
            aria-selected={activeTab === 'fiscal'}
            onClick={() => setActiveTab('fiscal')}
            className={`pb-2 px-1 text-sm font-medium transition-colors ${
              activeTab === 'fiscal'
                ? 'border-b-2 border-forvis-blue-600 text-forvis-blue-600'
                : 'text-forvis-gray-600 hover:text-forvis-gray-900'
            }`}
          >
            Fiscal Year View
          </button>
          <button
            role="tab"
            aria-selected={activeTab === 'custom'}
            onClick={() => setActiveTab('custom')}
            className={`pb-2 px-1 text-sm font-medium transition-colors ${
              activeTab === 'custom'
                ? 'border-b-2 border-forvis-blue-600 text-forvis-blue-600'
                : 'text-forvis-gray-600 hover:text-forvis-gray-900'
            }`}
          >
            Custom Date Range
          </button>
        </nav>
      </div>

      {/* Selectors */}
      <div className="bg-white rounded-lg border border-forvis-gray-200 p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {activeTab === 'fiscal' ? (
            <FiscalYearSelector
              value={fiscalYear}
              onChange={(val) => setFiscalYear(val)}
              allowAllYears={true}
              currentFY={currentFY}
            />
          ) : (
            <div className="space-y-4">
              {dateError && (
                <Banner
                  variant="error"
                  message={dateError}
                  dismissible
                  onDismiss={() => setDateError(null)}
                />
              )}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                <Input
                  type="date"
                  label="Start Date"
                  value={customInputs.start}
                  onChange={(e) => setCustomInputs(prev => ({ ...prev, start: e.target.value }))}
                />
                <Input
                  type="date"
                  label="End Date"
                  value={customInputs.end}
                  onChange={(e) => setCustomInputs(prev => ({ ...prev, end: e.target.value }))}
                />
                <Button onClick={handleDateRangeApply} variant="primary">
                  Apply Date Range
                </Button>
              </div>
              <p className="text-xs text-forvis-gray-600">
                Select a date range up to 24 months. Values will be cumulative within the selected period.
              </p>
            </div>
          )}
          
          {/* Service Line Filter */}
          <ServiceLineFilterSelector
            value={selectedServiceLines}
            onChange={setSelectedServiceLines}
          />
        </div>
      </div>

      {/* Charts Grid - only show when we have data */}
      {hasData && (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Net Revenue */}
        <ChartCard
          title="Net Revenue"
          description="Time + Adjustments"
          icon={<DollarSign className="h-5 w-5 text-white" />}
          data={isMultiYear ? undefined : singleYearData}
          yearlyData={isMultiYear ? data?.yearlyData : undefined}
          valueFormatter={formatCurrency}
          yAxisFormatter={formatCurrencyShort}
          dataKey="value"
          color="#2E5AAC"
          metricKey="netRevenue"
        />

        {/* Gross Profit */}
        <ChartCard
          title="Gross Profit"
          description="Net revenue minus costs"
          icon={<TrendingUp className="h-5 w-5 text-white" />}
          data={isMultiYear ? undefined : singleYearData}
          yearlyData={isMultiYear ? data?.yearlyData : undefined}
          valueFormatter={formatCurrency}
          yAxisFormatter={formatCurrencyShort}
          dataKey="value"
          color="#2E5AAC"
          metricKey="grossProfit"
        />

        {/* Collections */}
        <ChartCard
          title="Collections"
          description="Total receipts received"
          icon={<Wallet className="h-5 w-5 text-white" />}
          data={isMultiYear ? undefined : singleYearData}
          yearlyData={isMultiYear ? data?.yearlyData : undefined}
          valueFormatter={formatCurrency}
          yAxisFormatter={formatCurrencyShort}
          dataKey="value"
          color="#2E5AAC"
          metricKey="collections"
        />

        {/* WIP Lockup Days */}
        <ChartCard
          title="WIP Lockup Days"
          description="(WIP balance * 365) / trailing 12-month revenue"
          icon={<Clock className="h-5 w-5 text-white" />}
          data={isMultiYear ? undefined : singleYearData}
          yearlyData={isMultiYear ? data?.yearlyData : undefined}
          valueFormatter={formatDays}
          yAxisFormatter={formatDaysShort}
          dataKey="value"
          color="#2E5AAC"
          showCalculation="wip"
          targetLine={{ value: 45, label: 'Target: 45 days' }}
          gauge={{ maxValue: 90, targetValue: 45, label: 'days' }}
          metricKey="wipLockupDays"
        />

        {/* Debtors Lockup Days */}
        <ChartCard
          title="Debtors Lockup Days"
          description="(Debtors balance * 365) / trailing 12-month billings"
          icon={<Calendar className="h-5 w-5 text-white" />}
          data={isMultiYear ? undefined : singleYearData}
          yearlyData={isMultiYear ? data?.yearlyData : undefined}
          valueFormatter={formatDays}
          yAxisFormatter={formatDaysShort}
          dataKey="value"
          color="#2E5AAC"
          showCalculation="debtors"
          targetLine={{ value: 45, label: 'Target: 45 days' }}
          gauge={{ maxValue: 90, targetValue: 45, label: 'days' }}
          metricKey="debtorsLockupDays"
        />

        {/* Writeoff % */}
        <ChartCard
          title="Writeoff %"
          description="(Negative adjustments + provisions) / gross time"
          icon={<AlertTriangle className="h-5 w-5 text-white" />}
          data={isMultiYear ? undefined : singleYearData}
          yearlyData={isMultiYear ? data?.yearlyData : undefined}
          valueFormatter={formatPercentage}
          yAxisFormatter={formatPercentage}
          dataKey="value"
          color="#2E5AAC"
          showCalculation="writeoff"
          targetLine={{ value: 25, label: 'Target: 25%' }}
          gauge={{ maxValue: 50, targetValue: 25, label: '%' }}
          metricKey="writeoffPercentage"
        />

        {/* Total Lockup Days */}
        <ChartCard
          title="Total Lockup Days"
          description="WIP lockup + Debtors lockup combined"
          icon={<Timer className="h-5 w-5 text-white" />}
          data={isMultiYear ? undefined : singleYearData}
          yearlyData={isMultiYear ? data?.yearlyData : undefined}
          valueFormatter={formatDays}
          yAxisFormatter={formatDaysShort}
          dataKey="value"
          color="#2E5AAC"
          targetLine={{ value: 90, label: 'Target: 90 days' }}
          gauge={{ maxValue: 180, targetValue: 90, label: 'days' }}
          metricKey="totalLockup"
        />

        {/* WIP Balance */}
        <ChartCard
          title="WIP Balance"
          description="Outstanding work in progress value"
          icon={<Banknote className="h-5 w-5 text-white" />}
          data={isMultiYear ? undefined : singleYearData}
          yearlyData={isMultiYear ? data?.yearlyData : undefined}
          valueFormatter={formatCurrency}
          yAxisFormatter={formatCurrencyShort}
          dataKey="value"
          color="#2E5AAC"
          metricKey="wipBalance"
        />

        {/* Debtors Balance */}
        <ChartCard
          title="Debtors Balance"
          description="Outstanding receivables value"
          icon={<CreditCard className="h-5 w-5 text-white" />}
          data={isMultiYear ? undefined : singleYearData}
          yearlyData={isMultiYear ? data?.yearlyData : undefined}
          valueFormatter={formatCurrency}
          yAxisFormatter={formatCurrencyShort}
          dataKey="value"
          color="#2E5AAC"
          metricKey="debtorsBalance"
        />
      </div>
      )}
    </div>
  );
}

