'use client';

/**
 * Profitability Report Content
 * 
 * Multi-view report with Group/Client/Task modes and enhanced multi-select filtering.
 * Supports fiscal year and custom date range filtering with cumulative WIP metrics.
 */

import { useState, useMemo } from 'react';
import { Layers, Building2, ListTodo, LayoutList, FolderTree, Tag } from 'lucide-react';
import { Input, Button, LoadingSpinner } from '@/components/ui';
import { Banner } from '@/components/ui/Banner';
import { FiscalYearSelector } from '@/components/features/reports/FiscalYearSelector';
import { useProfitabilityReport } from '@/hooks/reports/useProfitabilityReport';
import { ReportFilters, type ReportFiltersState } from './ReportFilters';
import { GroupTotalsTable } from './GroupTotalsTable';
import { ClientTotalsTable } from './ClientTotalsTable';
import { TaskDetailsTable } from './TaskDetailsTable';
import { MasterServiceLineTotalsTable } from './MasterServiceLineTotalsTable';
import { SubServiceLineGroupTotalsTable } from './SubServiceLineGroupTotalsTable';
import { ServiceLineTotalsTable } from './ServiceLineTotalsTable';
import { parseISO, differenceInMonths } from 'date-fns';
import { getCurrentFiscalPeriod } from '@/lib/utils/fiscalPeriod';

type ViewMode = 'group' | 'client' | 'task' | 'master-service-line' | 'sub-service-line-group' | 'service-line';

export function ProfitabilityReport() {
  // State for fiscal year and mode selection
  const currentFY = getCurrentFiscalPeriod().fiscalYear;
  const [activeTab, setActiveTab] = useState<'fiscal' | 'custom'>('fiscal');
  const [fiscalYear, setFiscalYear] = useState(currentFY);
  
  // Separate state for date inputs vs applied query params
  const [customInputs, setCustomInputs] = useState({ start: '', end: '' });
  const [appliedDates, setAppliedDates] = useState({ start: '', end: '' });
  const [dateError, setDateError] = useState<string | null>(null);

  // Fetch data based on current mode - use appliedDates for query
  const { data, isLoading, error } = useProfitabilityReport({
    fiscalYear: activeTab === 'fiscal' ? fiscalYear : undefined,
    startDate: activeTab === 'custom' && appliedDates.start ? appliedDates.start : undefined,
    endDate: activeTab === 'custom' && appliedDates.end ? appliedDates.end : undefined,
    mode: activeTab,
  });

  const [viewMode, setViewMode] = useState<ViewMode>('master-service-line');
  const [filters, setFilters] = useState<ReportFiltersState>({
    clients: [],
    serviceLines: [],
    groups: [],
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
    } catch (err) {
      setDateError('Invalid date format');
    }
  };


  // Apply multi-select filters to tasks
  const filteredTasks = useMemo(() => {
    if (!data?.tasks) return [];

    let filtered = data.tasks;

    // Multi-select client filter (empty = show all)
    if (filters.clients.length > 0) {
      filtered = filtered.filter((task) => filters.clients.includes(task.GSClientID));
    }

    // Multi-select service line filter (empty = show all)
    if (filters.serviceLines.length > 0) {
      filtered = filtered.filter((task) => filters.serviceLines.includes(task.servLineCode));
    }

    // Multi-select group filter (empty = show all)
    if (filters.groups.length > 0) {
      filtered = filtered.filter((task) => filters.groups.includes(task.groupCode));
    }

    return filtered;
  }, [data, filters]);

  return (
    <div>
      {/* Tabs */}
      <div className="border-b border-forvis-gray-200 mb-4">
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

      {/* Inline Selectors */}
      <div className="bg-white rounded-lg border border-forvis-gray-200 p-4 mb-4">
        {activeTab === 'fiscal' ? (
          <div className="max-w-xs">
            <FiscalYearSelector
              value={fiscalYear}
              onChange={(val) => setFiscalYear(val as number)}
              allowAllYears={false}
              currentFY={currentFY}
            />
          </div>
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
      </div>

      {/* Info Banner */}
      {data && (
        <div className="mb-4">
          <div
            className="rounded-lg p-3 border border-forvis-blue-100"
            style={{ background: 'linear-gradient(135deg, #F0F7FD 0%, #E0EDFB 100%)' }}
          >
            <div className="flex items-start gap-2">
              <div className="flex-1">
                <p className="text-xs text-forvis-gray-700">
                  <span className="font-semibold">Period:</span>{' '}
                  {activeTab === 'fiscal' ? `FY${fiscalYear} (Cumulative)` : 'Custom Date Range (Cumulative)'} •{' '}
                  <span className="font-semibold">Viewing as:</span>{' '}
                  {data.filterMode === 'PARTNER' ? 'Task Partner' : 'Task Manager'} •{' '}
                  <span className="ml-1">
                    Shows tasks where you are assigned as{' '}
                    {data.filterMode === 'PARTNER' ? 'Partner' : 'Manager'}
                  </span>
                  {' • '}
                  <span className="font-semibold">{filteredTasks.length}</span> task
                  {filteredTasks.length !== 1 ? 's' : ''}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="flex flex-col items-center justify-center py-12">
          <LoadingSpinner size="lg" />
          <p className="mt-4 text-sm text-forvis-gray-600">Loading your tasks...</p>
        </div>
      )}

      {/* Error State */}
      {error && (
        <Banner
          variant="error"
          title="Error Loading Report"
          message={error instanceof Error ? error.message : 'Failed to load profitability report'}
        />
      )}

      {/* Data Display */}
      {!isLoading && !error && data && (
        <>
          {/* View Mode Selector */}
          <div className="mb-4 flex flex-wrap gap-2">
            <button
              onClick={() => setViewMode('master-service-line')}
              className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-all duration-200 ${
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
              Master SL
            </button>

            <button
              onClick={() => setViewMode('sub-service-line-group')}
              className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-all duration-200 ${
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
              Sub SL Group
            </button>

            <button
              onClick={() => setViewMode('service-line')}
              className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-all duration-200 ${
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
              Service Line
            </button>

            <button
              onClick={() => setViewMode('group')}
              className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-all duration-200 ${
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
              Group
            </button>

            <button
              onClick={() => setViewMode('client')}
              className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-all duration-200 ${
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
              Client
            </button>

            <button
              onClick={() => setViewMode('task')}
              className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-all duration-200 ${
                viewMode === 'task'
                  ? 'text-white shadow-sm'
                  : 'text-forvis-gray-700 bg-white border border-forvis-gray-300 hover:bg-forvis-gray-50'
              }`}
              style={
                viewMode === 'task'
                  ? { background: 'linear-gradient(to right, #2E5AAC, #25488A)' }
                  : {}
              }
            >
              <ListTodo className="h-4 w-4" />
              Task
            </button>
          </div>

          {/* Filters */}
          <ReportFilters
            filters={filters}
            onFiltersChange={setFilters}
            availableTasks={data.tasks}
          />

          {/* Filtered Count */}
          {filteredTasks.length !== data.tasks.length && (
            <div className="mb-3 text-sm text-forvis-gray-600">
              Showing <span className="font-semibold">{filteredTasks.length}</span> of{' '}
              <span className="font-semibold">{data.tasks.length}</span> tasks
            </div>
          )}

          {/* Conditional Table Rendering */}
          <div className="bg-white rounded-lg shadow-corporate overflow-hidden">
            {viewMode === 'group' && <GroupTotalsTable tasks={filteredTasks} />}
            {viewMode === 'client' && <ClientTotalsTable tasks={filteredTasks} />}
            {viewMode === 'task' && <TaskDetailsTable tasks={filteredTasks} />}
            {viewMode === 'master-service-line' && <MasterServiceLineTotalsTable tasks={filteredTasks} />}
            {viewMode === 'sub-service-line-group' && <SubServiceLineGroupTotalsTable tasks={filteredTasks} />}
            {viewMode === 'service-line' && <ServiceLineTotalsTable tasks={filteredTasks} />}
          </div>

          {/* Help Section */}
          {filteredTasks.length > 0 && (
            <div className="mt-4">
              <div className="rounded-lg p-3 bg-forvis-gray-50 border border-forvis-gray-200">
                <p className="text-xs text-forvis-gray-600">
                  <strong className="text-forvis-gray-700">Net WIP:</strong> Time + Adjustments +
                  Disbursements - Fees + Provision
                </p>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

