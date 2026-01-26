'use client';

/**
 * Recoverability Report Content
 * 
 * Displays debtor aging analysis and receipts tracking for employee's billed clients.
 * Supports fiscal year and custom date range filtering with multiple view modes.
 */

import { useState, useMemo, useEffect } from 'react';
import { Layers, Building2, LayoutList, FolderTree, Tag, Clock, Receipt } from 'lucide-react';
import { Input, LoadingSpinner } from '@/components/ui';
import { Banner } from '@/components/ui/Banner';
import { FiscalYearSelector } from '@/components/features/reports/FiscalYearSelector';
import { useRecoverabilityReport } from '@/hooks/reports/useRecoverabilityReport';
import { RecoverabilityFilters, type RecoverabilityFiltersState } from './RecoverabilityFilters';
import { ClientAgingTable } from './ClientAgingTable';
import { GroupAgingTable } from './GroupAgingTable';
import { ServiceLineAgingTable } from './ServiceLineAgingTable';
import { ClientReceiptsTable } from './ClientReceiptsTable';
import { GroupReceiptsTable } from './GroupReceiptsTable';
import { ServiceLineReceiptsTable } from './ServiceLineReceiptsTable';
import { parseISO, differenceInMonths } from 'date-fns';
import { getCurrentFiscalPeriod } from '@/lib/utils/fiscalPeriod';

type ViewMode = 'group' | 'client' | 'master-service-line' | 'sub-service-line-group' | 'service-line';
type ReportSubTab = 'aging' | 'receipts';

// Fiscal year months (Sep-Aug)
const FISCAL_MONTHS = ['Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug'];

export function RecoverabilityReport() {
  // State for fiscal year and mode selection
  const currentFY = getCurrentFiscalPeriod().fiscalYear;
  const [activeTab, setActiveTab] = useState<'fiscal' | 'custom'>('fiscal');
  const [fiscalYear, setFiscalYear] = useState(currentFY);
  const [activeReportTab, setActiveReportTab] = useState<ReportSubTab>('aging');
  const [selectedMonth, setSelectedMonth] = useState<string>('Aug'); // Default to Aug (full fiscal year)
  
  // Separate state for date inputs vs applied query params
  const [customInputs, setCustomInputs] = useState({ start: '', end: '' });
  const [appliedDates, setAppliedDates] = useState({ start: '', end: '' });
  const [dateError, setDateError] = useState<string | null>(null);

  // Fetch data based on current mode - use appliedDates for query
  const { data, isLoading, error } = useRecoverabilityReport({
    fiscalYear: activeTab === 'fiscal' ? fiscalYear : undefined,
    fiscalMonth: activeTab === 'fiscal' ? selectedMonth : undefined,
    startDate: activeTab === 'custom' && appliedDates.start ? appliedDates.start : undefined,
    endDate: activeTab === 'custom' && appliedDates.end ? appliedDates.end : undefined,
    mode: activeTab,
  });

  const [viewMode, setViewMode] = useState<ViewMode>('master-service-line');
  const [filters, setFilters] = useState<RecoverabilityFiltersState>({
    clients: [],
    serviceLines: [],
    groups: [],
    masterServiceLines: [],
    subServiceLineGroups: [],
  });

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
    } catch {
      setDateError('Invalid date format');
    }
  };

  // Apply multi-select filters to clients
  const filteredClients = useMemo(() => {
    if (!data?.clients) return [];

    let filtered = data.clients;

    // Multi-select client filter (empty = show all)
    if (filters.clients.length > 0) {
      filtered = filtered.filter((client) => filters.clients.includes(client.GSClientID));
    }

    // Multi-select service line filter (empty = show all)
    if (filters.serviceLines.length > 0) {
      filtered = filtered.filter((client) => filters.serviceLines.includes(client.servLineCode));
    }

    // Multi-select group filter (empty = show all)
    if (filters.groups.length > 0) {
      filtered = filtered.filter((client) => filters.groups.includes(client.groupCode));
    }

    // Multi-select master service line filter (empty = show all)
    if (filters.masterServiceLines.length > 0) {
      filtered = filtered.filter((client) => 
        filters.masterServiceLines.includes(client.masterServiceLineCode)
      );
    }

    // Multi-select sub service line group filter (empty = show all)
    if (filters.subServiceLineGroups.length > 0) {
      filtered = filtered.filter((client) => 
        filters.subServiceLineGroups.includes(client.subServlineGroupCode || client.servLineCode)
      );
    }

    return filtered;
  }, [data, filters]);

  // Calculate filtered totals
  const filteredTotals = useMemo(() => {
    const totalBalance = filteredClients.reduce((sum, c) => sum + c.totalBalance, 0);
    const aging = {
      current: filteredClients.reduce((sum, c) => sum + c.aging.current, 0),
      days31_60: filteredClients.reduce((sum, c) => sum + c.aging.days31_60, 0),
      days61_90: filteredClients.reduce((sum, c) => sum + c.aging.days61_90, 0),
      days91_120: filteredClients.reduce((sum, c) => sum + c.aging.days91_120, 0),
      days120Plus: filteredClients.reduce((sum, c) => sum + c.aging.days120Plus, 0),
    };
    const currentPeriodReceipts = filteredClients.reduce((sum, c) => sum + c.currentPeriodReceipts, 0);
    const priorMonthBalance = filteredClients.reduce((sum, c) => sum + c.priorMonthBalance, 0);
    
    return {
      totalBalance,
      aging,
      currentPeriodReceipts,
      priorMonthBalance,
      variance: priorMonthBalance - currentPeriodReceipts,
    };
  }, [filteredClients]);

  // Compute available months based on current fiscal period
  const availableMonths = useMemo(() => {
    const currentPeriod = getCurrentFiscalPeriod();
    
    if (fiscalYear < currentPeriod.fiscalYear) {
      // Past fiscal year - show all 12 months
      return FISCAL_MONTHS;
    } else if (fiscalYear === currentPeriod.fiscalYear) {
      // Current fiscal year - show up to current month
      const currentMonthIndex = currentPeriod.fiscalMonth - 1;
      return FISCAL_MONTHS.slice(0, currentMonthIndex + 1);
    } else {
      // Future fiscal year - show first month only
      return ['Sep'];
    }
  }, [fiscalYear]);

  // Auto-select last available month when fiscal year changes
  useEffect(() => {
    const lastMonth = availableMonths[availableMonths.length - 1];
    if (lastMonth && !availableMonths.includes(selectedMonth)) {
      setSelectedMonth(lastMonth);
    }
  }, [availableMonths, selectedMonth]);

  return (
    <div>
      {/* Tabs + Info Banner */}
      <div className="border-b border-forvis-gray-200 mb-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 pb-2">
          {/* Tabs */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
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

          {/* Period Info */}
          {data && (
            <div
              className="rounded-lg px-3 py-1.5 border border-forvis-blue-100"
              style={{ background: 'linear-gradient(135deg, #F0F7FD 0%, #E0EDFB 100%)' }}
            >
              <p className="text-xs text-forvis-gray-700 whitespace-nowrap">
                <span className="font-semibold">Period:</span>{' '}
                {activeTab === 'fiscal' ? `FY${fiscalYear}` : 'Custom Date Range'} •{' '}
                <span className="font-semibold">{filteredClients.length}</span> client
                {filteredClients.length !== 1 ? 's' : ''}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Inline Selectors - Fiscal Year/Date Range + View Mode */}
      <div className="bg-white rounded-lg border border-forvis-gray-200 p-4 mb-4">
        <div className="space-y-4">
          {/* Date Controls */}
          <div>
            {activeTab === 'fiscal' ? (
              <div className="w-56">
                <FiscalYearSelector
                  value={fiscalYear}
                  onChange={(val) => setFiscalYear(val as number)}
                  allowAllYears={false}
                  currentFY={currentFY}
                />
              </div>
            ) : (
              <div className="w-full">
                {dateError && (
                  <div className="mb-3">
                    <Banner
                      variant="error"
                      message={dateError}
                      dismissible
                      onDismiss={() => setDateError(null)}
                    />
                  </div>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-3 items-end max-w-2xl">
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
                  <button 
                    onClick={handleDateRangeApply}
                    className="inline-flex items-center justify-center px-6 py-2 text-sm font-medium rounded-md text-white shadow-sm transition-all duration-200 hover:opacity-90 h-[42px]"
                    style={{ background: 'linear-gradient(to right, #2E5AAC, #25488A)' }}
                  >
                    Apply
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* View Mode Buttons - Grid Layout */}
          <div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
              <button
                onClick={() => setViewMode('master-service-line')}
                className={`inline-flex items-center justify-center gap-2 py-2 px-3 text-sm font-medium rounded-md transition-all duration-200 ${
                  viewMode === 'master-service-line'
                    ? 'text-white shadow-sm'
                    : 'text-forvis-gray-700 bg-white border border-forvis-gray-300 hover:bg-forvis-gray-50'
                }`}
                style={
                  viewMode === 'master-service-line'
                    ? { background: 'linear-gradient(to right, #2E5AAC, #25488A)' }
                    : {}
                }
              >
                <LayoutList className="h-4 w-4" />
                <span className="hidden xl:inline">Master SL</span>
                <span className="xl:hidden">MSL</span>
              </button>

              <button
                onClick={() => setViewMode('sub-service-line-group')}
                className={`inline-flex items-center justify-center gap-2 py-2 px-3 text-sm font-medium rounded-md transition-all duration-200 ${
                  viewMode === 'sub-service-line-group'
                    ? 'text-white shadow-sm'
                    : 'text-forvis-gray-700 bg-white border border-forvis-gray-300 hover:bg-forvis-gray-50'
                }`}
                style={
                  viewMode === 'sub-service-line-group'
                    ? { background: 'linear-gradient(to right, #2E5AAC, #25488A)' }
                    : {}
                }
              >
                <FolderTree className="h-4 w-4" />
                <span className="hidden xl:inline">Sub SL Group</span>
                <span className="xl:hidden">SSL</span>
              </button>

              <button
                onClick={() => setViewMode('service-line')}
                className={`inline-flex items-center justify-center gap-2 py-2 px-3 text-sm font-medium rounded-md transition-all duration-200 ${
                  viewMode === 'service-line'
                    ? 'text-white shadow-sm'
                    : 'text-forvis-gray-700 bg-white border border-forvis-gray-300 hover:bg-forvis-gray-50'
                }`}
                style={
                  viewMode === 'service-line'
                    ? { background: 'linear-gradient(to right, #2E5AAC, #25488A)' }
                    : {}
                }
              >
                <Tag className="h-4 w-4" />
                <span className="hidden xl:inline">Service Line</span>
                <span className="xl:hidden">SL</span>
              </button>

              <button
                onClick={() => setViewMode('group')}
                className={`inline-flex items-center justify-center gap-2 py-2 px-3 text-sm font-medium rounded-md transition-all duration-200 ${
                  viewMode === 'group'
                    ? 'text-white shadow-sm'
                    : 'text-forvis-gray-700 bg-white border border-forvis-gray-300 hover:bg-forvis-gray-50'
                }`}
                style={
                  viewMode === 'group'
                    ? { background: 'linear-gradient(to right, #2E5AAC, #25488A)' }
                    : {}
                }
              >
                <Layers className="h-4 w-4" />
                <span>Group</span>
              </button>

              <button
                onClick={() => setViewMode('client')}
                className={`inline-flex items-center justify-center gap-2 py-2 px-3 text-sm font-medium rounded-md transition-all duration-200 ${
                  viewMode === 'client'
                    ? 'text-white shadow-sm'
                    : 'text-forvis-gray-700 bg-white border border-forvis-gray-300 hover:bg-forvis-gray-50'
                }`}
                style={
                  viewMode === 'client'
                    ? { background: 'linear-gradient(to right, #2E5AAC, #25488A)' }
                    : {}
                }
              >
                <Building2 className="h-4 w-4" />
                <span>Client</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex flex-col items-center justify-center py-12">
          <LoadingSpinner size="lg" />
          <p className="mt-4 text-sm text-forvis-gray-600">Loading debtor data...</p>
        </div>
      )}

      {/* Error State */}
      {error && (
        <Banner
          variant="error"
          title="Error Loading Report"
          message={error instanceof Error ? error.message : 'Failed to load recoverability report'}
        />
      )}

      {/* Data Display */}
      {!isLoading && !error && data && (
        <>
          {/* Filters */}
          <RecoverabilityFilters
            filters={filters}
            onFiltersChange={setFilters}
            availableClients={data.clients}
          />

          {/* Filtered Count */}
          {filteredClients.length !== data.clients.length && (
            <div className="mb-3 text-sm text-forvis-gray-600">
              Showing <span className="font-semibold">{filteredClients.length}</span> of{' '}
              <span className="font-semibold">{data.clients.length}</span> clients
            </div>
          )}

          {/* Report Sub-tabs */}
          <div className="mb-4 border-b border-forvis-gray-200">
            <nav className="flex space-x-2 -mb-px">
              <button
                onClick={() => setActiveReportTab('aging')}
                className={`px-4 py-2 text-sm font-medium transition-all duration-200 border-b-2 ${
                  activeReportTab === 'aging'
                    ? 'border-forvis-blue-500 text-forvis-blue-600'
                    : 'border-transparent text-forvis-gray-600 hover:text-forvis-gray-900 hover:border-forvis-gray-300'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  <span>Aging Analysis</span>
                </div>
              </button>

              <button
                onClick={() => setActiveReportTab('receipts')}
                className={`px-4 py-2 text-sm font-medium transition-all duration-200 border-b-2 ${
                  activeReportTab === 'receipts'
                    ? 'border-forvis-blue-500 text-forvis-blue-600'
                    : 'border-transparent text-forvis-gray-600 hover:text-forvis-gray-900 hover:border-forvis-gray-300'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Receipt className="h-4 w-4" />
                  <span>Monthly Receipts</span>
                </div>
              </button>
            </nav>
          </div>

          {/* Month Selector - Show for both aging and receipts tabs in fiscal year mode */}
          {activeTab === 'fiscal' && availableMonths.length > 0 && (
            <div className="mb-4 flex items-center gap-3">
              <label className="text-sm font-medium text-forvis-gray-700">
                {activeReportTab === 'aging' ? 'Show aging as of:' : 'Select Month:'}
              </label>
              <div className="flex flex-wrap gap-1">
                {availableMonths.map((month) => (
                  <button
                    key={month}
                    onClick={() => setSelectedMonth(month)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-200 ${
                      selectedMonth === month
                        ? 'text-white shadow-sm'
                        : 'text-forvis-gray-600 bg-forvis-gray-100 hover:bg-forvis-gray-200'
                    }`}
                    style={
                      selectedMonth === month
                        ? { background: 'linear-gradient(to right, #2E5AAC, #25488A)' }
                        : {}
                    }
                  >
                    {month}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Conditional Table Rendering */}
          <div className="bg-white rounded-lg shadow-corporate overflow-hidden">
            {activeReportTab === 'aging' ? (
              <>
                {viewMode === 'client' && <ClientAgingTable clients={filteredClients} />}
                {viewMode === 'group' && <GroupAgingTable clients={filteredClients} />}
                {(viewMode === 'master-service-line' || viewMode === 'sub-service-line-group' || viewMode === 'service-line') && 
                  <ServiceLineAgingTable clients={filteredClients} viewMode={viewMode} />
                }
              </>
            ) : (
              <>
                {viewMode === 'client' && <ClientReceiptsTable clients={filteredClients} selectedMonth={selectedMonth} />}
                {viewMode === 'group' && <GroupReceiptsTable clients={filteredClients} selectedMonth={selectedMonth} />}
                {(viewMode === 'master-service-line' || viewMode === 'sub-service-line-group' || viewMode === 'service-line') && 
                  <ServiceLineReceiptsTable clients={filteredClients} viewMode={viewMode} selectedMonth={selectedMonth} />
                }
              </>
            )}
          </div>

          {/* Help Section */}
          {filteredClients.length > 0 && (
            <div className="mt-4">
              <div className="rounded-lg p-3 bg-forvis-gray-50 border border-forvis-gray-200">
                <p className="text-xs text-forvis-gray-600">
                  <strong className="text-forvis-gray-700">
                    {activeReportTab === 'aging' ? 'Aging Buckets:' : 'Monthly Receipts:'}
                  </strong>{' '}
                  {activeReportTab === 'aging' 
                    ? `Current (0-30 days), 31-60, 61-90, 91-120, 120+ days outstanding${
                        activeTab === 'fiscal' 
                          ? ` | Lifetime-to-date cumulative: All transactions from inception through ${selectedMonth} (not just fiscal year)`
                          : ''
                      }`
                    : 'Opening Balance is debtor balance at month start. Recovery % = Receipts / Opening Balance × 100'
                  }
                </p>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
