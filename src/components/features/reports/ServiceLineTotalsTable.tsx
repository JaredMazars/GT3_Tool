'use client';

/**
 * Service Line Totals Table Component
 * 
 * Displays aggregated totals by Service Line
 * Columns: Service Line Name | Total Tasks | Net WIP
 */

import { useState } from 'react';
import { Pagination } from '@/components/shared/Pagination';
import type { TaskWithWIPAndServiceLine } from '@/types/api';
import { GRADIENTS } from '@/lib/design-system/gradients';

interface ServiceLineTotal {
  code: string;
  name: string;
  taskCount: number;
  totalWIP: number;
  ltdHours: number;
  grossProduction: number;
  ltdAdj: number;
  netRevenue: number;
  ltdCost: number;
  grossProfit: number;
}

interface ServiceLineTotalsTableProps {
  tasks: TaskWithWIPAndServiceLine[];
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-ZA', {
    style: 'currency',
    currency: 'ZAR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

const formatNumber = (num: number) => {
  return new Intl.NumberFormat('en-ZA', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num);
};

const formatPercentage = (percent: number) => {
  return `${percent.toFixed(2)}%`;
};

export function ServiceLineTotalsTable({ tasks }: ServiceLineTotalsTableProps) {
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 20;

  // Aggregate tasks by service line
  const serviceLineTotals = new Map<string, ServiceLineTotal>();

  tasks.forEach((task) => {
    const code = task.servLineCode;
    const name = task.serviceLineName;
    
    if (!serviceLineTotals.has(code)) {
      serviceLineTotals.set(code, {
        code,
        name,
        taskCount: 0,
        totalWIP: 0,
        ltdHours: 0,
        grossProduction: 0,
        ltdAdj: 0,
        netRevenue: 0,
        ltdCost: 0,
        grossProfit: 0,
      });
    }

    const sl = serviceLineTotals.get(code)!;
    sl.taskCount += 1;
    sl.totalWIP += task.netWip;
    sl.ltdHours += task.ltdHours;
    sl.grossProduction += task.grossProduction;
    sl.ltdAdj += task.ltdAdj;
    sl.netRevenue += task.netRevenue;
    sl.ltdCost += task.ltdCost;
    sl.grossProfit += task.grossProfit;
  });

  // Convert to array and sort by name
  const sortedServiceLines = Array.from(serviceLineTotals.values()).sort((a, b) =>
    a.name.localeCompare(b.name)
  );

  // Pagination calculation
  const totalPages = Math.ceil(sortedServiceLines.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const paginatedServiceLines = sortedServiceLines.slice(startIndex, endIndex);

  // Calculate grand totals for current page
  const grandTotals = {
    taskCount: paginatedServiceLines.reduce((sum, sl) => sum + sl.taskCount, 0),
    ltdHours: paginatedServiceLines.reduce((sum, sl) => sum + sl.ltdHours, 0),
    grossProduction: paginatedServiceLines.reduce((sum, sl) => sum + sl.grossProduction, 0),
    ltdAdj: paginatedServiceLines.reduce((sum, sl) => sum + sl.ltdAdj, 0),
    netRevenue: paginatedServiceLines.reduce((sum, sl) => sum + sl.netRevenue, 0),
    ltdCost: paginatedServiceLines.reduce((sum, sl) => sum + sl.ltdCost, 0),
    grossProfit: paginatedServiceLines.reduce((sum, sl) => sum + sl.grossProfit, 0),
  };
  
  const totalAdjPercentage = grandTotals.grossProduction !== 0 
    ? (grandTotals.ltdAdj / grandTotals.grossProduction) * 100 
    : 0;
  const totalGPPercentage = grandTotals.netRevenue !== 0 
    ? (grandTotals.grossProfit / grandTotals.netRevenue) * 100 
    : 0;

  if (sortedServiceLines.length === 0) {
    return (
      <div className="text-center py-12">
        <svg
          className="mx-auto h-12 w-12 text-forvis-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
        <h3 className="mt-2 text-sm font-medium text-forvis-gray-900">No service lines found</h3>
        <p className="mt-1 text-sm text-forvis-gray-500">
          No tasks match the current filters.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <div className="inline-block min-w-full align-middle">
        {/* Table Header */}
        <div
          className="grid gap-3 py-3 px-4 text-xs font-semibold text-white shadow-corporate"
          style={{
            background: GRADIENTS.primary.horizontal,
            gridTemplateColumns: '2fr 80px 100px 120px 120px 120px 100px 120px 120px 120px',
          }}
        >
          <div>Service Line</div>
          <div className="text-right">Tasks</div>
          <div className="text-right">Hours</div>
          <div className="text-right">Production</div>
          <div className="text-right">Adjustments</div>
          <div className="text-right">Net Revenue</div>
          <div className="text-right">Adj %</div>
          <div className="text-right">Cost</div>
          <div className="text-right">Gross Profit</div>
          <div className="text-right">GP %</div>
        </div>

        {/* Table Body */}
        <div className="bg-white">
          {paginatedServiceLines.map((sl, index) => {
            const adjustmentPercentage = sl.grossProduction !== 0 ? (sl.ltdAdj / sl.grossProduction) * 100 : 0;
            const grossProfitPercentage = sl.netRevenue !== 0 ? (sl.grossProfit / sl.netRevenue) * 100 : 0;
            
            return (
              <div
                key={sl.code}
                className={`grid gap-3 py-3 px-4 text-xs transition-colors duration-200 hover:bg-forvis-blue-50 ${
                  index % 2 === 0 ? 'bg-white' : 'bg-forvis-gray-50'
                }`}
                style={{ gridTemplateColumns: '2fr 80px 100px 120px 120px 120px 100px 120px 120px 120px' }}
              >
                <div className="font-semibold text-forvis-gray-900">{sl.name}</div>
                <div className="text-right text-forvis-gray-700 tabular-nums">
                  {sl.taskCount}
                </div>
                <div className="text-right tabular-nums text-forvis-gray-700">
                  {formatNumber(sl.ltdHours)}
                </div>
                <div className="text-right tabular-nums text-forvis-gray-700">
                  {formatCurrency(sl.grossProduction)}
                </div>
                <div className={`text-right tabular-nums font-medium ${
                  sl.ltdAdj < 0 ? 'text-forvis-error-600' : 'text-forvis-gray-700'
                }`}>
                  {formatCurrency(sl.ltdAdj)}
                </div>
                <div className={`text-right tabular-nums font-semibold ${
                  sl.netRevenue < 0 ? 'text-forvis-error-600' : 'text-forvis-blue-600'
                }`}>
                  {formatCurrency(sl.netRevenue)}
                </div>
                <div className={`text-right tabular-nums ${
                  adjustmentPercentage < 0 ? 'text-forvis-error-600' : 'text-forvis-gray-700'
                }`}>
                  {formatPercentage(adjustmentPercentage)}
                </div>
                <div className="text-right tabular-nums text-forvis-gray-700">
                  {formatCurrency(sl.ltdCost)}
                </div>
                <div className={`text-right tabular-nums font-semibold ${
                  sl.grossProfit < 0 ? 'text-forvis-error-600' : 'text-forvis-success-600'
                }`}>
                  {formatCurrency(sl.grossProfit)}
                </div>
                <div className={`text-right tabular-nums font-bold ${
                  grossProfitPercentage >= 60 ? 'text-forvis-success-600' : 
                  grossProfitPercentage >= 50 ? 'text-forvis-warning-600' : 
                  'text-forvis-error-600'
                }`}>
                  {formatPercentage(grossProfitPercentage)}
                </div>
              </div>
            );
          })}

          {/* Totals Row */}
          <div
            className="bg-gradient-dashboard-card grid gap-3 py-3 px-4 text-xs font-bold border-t-2 border-forvis-blue-500"
            style={{
              gridTemplateColumns: '2fr 80px 100px 120px 120px 120px 100px 120px 120px 120px'
            }}
          >
            <div className="text-forvis-blue-800">TOTAL (Page {currentPage} of {totalPages})</div>
            <div className="text-right text-forvis-blue-800 tabular-nums">
              {grandTotals.taskCount}
            </div>
            <div className="text-right tabular-nums text-forvis-blue-800">
              {formatNumber(grandTotals.ltdHours)}
            </div>
            <div className="text-right tabular-nums text-forvis-blue-800">
              {formatCurrency(grandTotals.grossProduction)}
            </div>
            <div className={`text-right tabular-nums ${
              grandTotals.ltdAdj < 0 ? 'text-forvis-error-600' : 'text-forvis-blue-800'
            }`}>
              {formatCurrency(grandTotals.ltdAdj)}
            </div>
            <div className={`text-right tabular-nums ${
              grandTotals.netRevenue < 0 ? 'text-forvis-error-600' : 'text-forvis-blue-800'
            }`}>
              {formatCurrency(grandTotals.netRevenue)}
            </div>
            <div className={`text-right tabular-nums ${
              totalAdjPercentage < 0 ? 'text-forvis-error-600' : 'text-forvis-blue-800'
            }`}>
              {formatPercentage(totalAdjPercentage)}
            </div>
            <div className="text-right tabular-nums text-forvis-blue-800">
              {formatCurrency(grandTotals.ltdCost)}
            </div>
            <div className={`text-right tabular-nums ${
              grandTotals.grossProfit < 0 ? 'text-forvis-error-600' : 'text-forvis-success-600'
            }`}>
              {formatCurrency(grandTotals.grossProfit)}
            </div>
            <div className={`text-right tabular-nums ${
              totalGPPercentage >= 60 ? 'text-forvis-success-600' : 
              totalGPPercentage >= 50 ? 'text-forvis-warning-600' : 
              'text-forvis-error-600'
            }`}>
              {formatPercentage(totalGPPercentage)}
            </div>
          </div>
        </div>
      </div>

      {/* Pagination */}
      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
        totalItems={sortedServiceLines.length}
        itemsPerPage={ITEMS_PER_PAGE}
        showMetadata
        className="mt-4 px-4"
      />
    </div>
  );
}
