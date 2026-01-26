'use client';

/**
 * Master Service Line Totals Table Component
 * 
 * Displays aggregated totals by Master Service Line
 * Columns: Master Service Line Name | Total Tasks | Net WIP
 */

import { useState } from 'react';
import { Pagination } from '@/components/shared/Pagination';
import type { TaskWithWIPAndServiceLine } from '@/types/api';
import { GRADIENTS } from '@/lib/design-system/gradients';

interface MasterServiceLineTotal {
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

interface MasterServiceLineTotalsTableProps {
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

export function MasterServiceLineTotalsTable({ tasks }: MasterServiceLineTotalsTableProps) {
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 20;

  // Aggregate tasks by master service line
  const masterServiceLineTotals = new Map<string, MasterServiceLineTotal>();

  tasks.forEach((task) => {
    const code = task.masterServiceLineCode;
    const name = task.masterServiceLineName;
    
    if (!masterServiceLineTotals.has(code)) {
      masterServiceLineTotals.set(code, {
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

    const msl = masterServiceLineTotals.get(code)!;
    msl.taskCount += 1;
    msl.totalWIP += task.netWip;
    msl.ltdHours += task.ltdHours;
    msl.grossProduction += task.grossProduction;
    msl.ltdAdj += task.ltdAdj;
    msl.netRevenue += task.netRevenue;
    msl.ltdCost += task.ltdCost;
    msl.grossProfit += task.grossProfit;
  });

  // Convert to array and sort by name
  const sortedMasterServiceLines = Array.from(masterServiceLineTotals.values()).sort((a, b) =>
    a.name.localeCompare(b.name)
  );

  // Pagination calculation
  const totalPages = Math.ceil(sortedMasterServiceLines.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const paginatedMasterServiceLines = sortedMasterServiceLines.slice(startIndex, endIndex);

  // Calculate grand totals for current page
  const grandTotals = {
    taskCount: paginatedMasterServiceLines.reduce((sum, msl) => sum + msl.taskCount, 0),
    ltdHours: paginatedMasterServiceLines.reduce((sum, msl) => sum + msl.ltdHours, 0),
    grossProduction: paginatedMasterServiceLines.reduce((sum, msl) => sum + msl.grossProduction, 0),
    ltdAdj: paginatedMasterServiceLines.reduce((sum, msl) => sum + msl.ltdAdj, 0),
    netRevenue: paginatedMasterServiceLines.reduce((sum, msl) => sum + msl.netRevenue, 0),
    ltdCost: paginatedMasterServiceLines.reduce((sum, msl) => sum + msl.ltdCost, 0),
    grossProfit: paginatedMasterServiceLines.reduce((sum, msl) => sum + msl.grossProfit, 0),
  };
  
  const totalAdjPercentage = grandTotals.grossProduction !== 0 
    ? (grandTotals.ltdAdj / grandTotals.grossProduction) * 100 
    : 0;
  const totalGPPercentage = grandTotals.netRevenue !== 0 
    ? (grandTotals.grossProfit / grandTotals.netRevenue) * 100 
    : 0;

  if (sortedMasterServiceLines.length === 0) {
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
        <h3 className="mt-2 text-sm font-medium text-forvis-gray-900">No master service lines found</h3>
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
          <div>Master Service Line</div>
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
          {paginatedMasterServiceLines.map((msl, index) => {
            const adjustmentPercentage = msl.grossProduction !== 0 ? (msl.ltdAdj / msl.grossProduction) * 100 : 0;
            const grossProfitPercentage = msl.netRevenue !== 0 ? (msl.grossProfit / msl.netRevenue) * 100 : 0;
            
            return (
              <div
                key={msl.code}
                className={`grid gap-3 py-3 px-4 text-xs transition-colors duration-200 hover:bg-forvis-blue-50 ${
                  index % 2 === 0 ? 'bg-white' : 'bg-forvis-gray-50'
                }`}
                style={{ gridTemplateColumns: '2fr 80px 100px 120px 120px 120px 100px 120px 120px 120px' }}
              >
                <div className="font-semibold text-forvis-gray-900">{msl.name}</div>
                <div className="text-right text-forvis-gray-700 tabular-nums">
                  {msl.taskCount}
                </div>
                <div className="text-right tabular-nums text-forvis-gray-700">
                  {formatNumber(msl.ltdHours)}
                </div>
                <div className="text-right tabular-nums text-forvis-gray-700">
                  {formatCurrency(msl.grossProduction)}
                </div>
                <div className={`text-right tabular-nums font-medium ${
                  msl.ltdAdj < 0 ? 'text-forvis-error-600' : 'text-forvis-gray-700'
                }`}>
                  {formatCurrency(msl.ltdAdj)}
                </div>
                <div className={`text-right tabular-nums font-semibold ${
                  msl.netRevenue < 0 ? 'text-forvis-error-600' : 'text-forvis-blue-600'
                }`}>
                  {formatCurrency(msl.netRevenue)}
                </div>
                <div className={`text-right tabular-nums ${
                  adjustmentPercentage < 0 ? 'text-forvis-error-600' : 'text-forvis-gray-700'
                }`}>
                  {formatPercentage(adjustmentPercentage)}
                </div>
                <div className="text-right tabular-nums text-forvis-gray-700">
                  {formatCurrency(msl.ltdCost)}
                </div>
                <div className={`text-right tabular-nums font-semibold ${
                  msl.grossProfit < 0 ? 'text-forvis-error-600' : 'text-forvis-success-600'
                }`}>
                  {formatCurrency(msl.grossProfit)}
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
        totalItems={sortedMasterServiceLines.length}
        itemsPerPage={ITEMS_PER_PAGE}
        showMetadata
        className="mt-4 px-4"
      />
    </div>
  );
}

