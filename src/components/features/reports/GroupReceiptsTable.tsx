'use client';

/**
 * Group Receipts Table Component
 * 
 * Displays monthly receipts data aggregated by Client Group for the selected month
 * Columns: Group Name | Opening Balance | Receipts | Variance | % Recovered | Billings | Closing Balance
 */

import { useState, useMemo } from 'react';
import { Pagination } from '@/components/shared/Pagination';
import type { ClientDebtorData } from '@/types/api';

interface GroupTotal {
  groupCode: string;
  groupDesc: string;
  openingBalance: number;
  receipts: number;
  variance: number;
  recoveryPercent: number;
  billings: number;
  closingBalance: number;
}

interface GroupReceiptsTableProps {
  clients: ClientDebtorData[];
  selectedMonth: string;
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-ZA', {
    style: 'currency',
    currency: 'ZAR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

const formatPercentage = (percent: number) => {
  if (!isFinite(percent)) return '-';
  return `${percent.toFixed(1)}%`;
};

export function GroupReceiptsTable({ clients, selectedMonth }: GroupReceiptsTableProps) {
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 20;

  // Aggregate clients by group using monthly data
  const groupTotals = useMemo(() => {
    const totals = new Map<string, GroupTotal>();

    clients.forEach((client) => {
      // Get monthly data for selected month
      const monthData = client.monthlyReceipts?.find(m => m.month === selectedMonth);
      const openingBalance = monthData?.openingBalance || 0;
      const receipts = monthData?.receipts || 0;
      const billings = monthData?.billings || 0;
      const closingBalance = monthData?.closingBalance || 0;

      if (!totals.has(client.groupCode)) {
        totals.set(client.groupCode, {
          groupCode: client.groupCode,
          groupDesc: client.groupDesc,
          openingBalance: 0,
          receipts: 0,
          variance: 0,
          recoveryPercent: 0,
          billings: 0,
          closingBalance: 0,
        });
      }

      const group = totals.get(client.groupCode)!;
      group.openingBalance += openingBalance;
      group.receipts += receipts;
      group.billings += billings;
      group.closingBalance += closingBalance;
    });

    // Calculate variance and recovery percent for each group
    totals.forEach(group => {
      group.variance = group.receipts - group.openingBalance;
      group.recoveryPercent = group.openingBalance > 0 
        ? (group.receipts / group.openingBalance) * 100 
        : 0;
    });

    return totals;
  }, [clients, selectedMonth]);

  // Convert to array and sort by group description
  const sortedGroups = Array.from(groupTotals.values()).sort((a, b) =>
    a.groupDesc.localeCompare(b.groupDesc)
  );

  // Pagination calculation
  const totalPages = Math.ceil(sortedGroups.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const paginatedGroups = sortedGroups.slice(startIndex, endIndex);

  // Calculate grand totals for current page
  const grandTotals = useMemo(() => {
    const openingBalance = paginatedGroups.reduce((sum, g) => sum + g.openingBalance, 0);
    const receipts = paginatedGroups.reduce((sum, g) => sum + g.receipts, 0);
    const billings = paginatedGroups.reduce((sum, g) => sum + g.billings, 0);
    const closingBalance = paginatedGroups.reduce((sum, g) => sum + g.closingBalance, 0);
    const variance = receipts - openingBalance;
    const recoveryPercent = openingBalance > 0 
      ? (receipts / openingBalance) * 100 
      : 0;
    
    return { openingBalance, receipts, variance, recoveryPercent, billings, closingBalance };
  }, [paginatedGroups]);

  if (sortedGroups.length === 0) {
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
        <h3 className="mt-2 text-sm font-medium text-forvis-gray-900">No groups found</h3>
        <p className="mt-1 text-sm text-forvis-gray-500">
          No debtor data matches the current filters.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <div className="inline-block min-w-full align-middle">
        {/* Table Header */}
        <div
          className="grid gap-2 py-3 px-4 text-xs font-semibold text-white shadow-corporate"
          style={{
            background: 'linear-gradient(to right, #2E5AAC, #25488A)',
            gridTemplateColumns: '1.5fr 110px 100px 100px 80px 100px 110px',
          }}
        >
          <div>Group Name</div>
          <div className="text-right">Opening Bal</div>
          <div className="text-right">Receipts</div>
          <div className="text-right">Variance</div>
          <div className="text-right">% Recov</div>
          <div className="text-right">Billings</div>
          <div className="text-right">Closing Bal</div>
        </div>

        {/* Table Body */}
        <div className="bg-white">
          {paginatedGroups.map((group, index) => (
            <div
              key={group.groupCode}
              className={`grid gap-2 py-3 px-4 text-xs transition-colors duration-200 hover:bg-forvis-blue-50 ${
                index % 2 === 0 ? 'bg-white' : 'bg-forvis-gray-50'
              }`}
              style={{ gridTemplateColumns: '1.5fr 110px 100px 100px 80px 100px 110px' }}
            >
              <div className="font-semibold text-forvis-gray-900">{group.groupDesc}</div>
              <div className="text-right tabular-nums text-forvis-gray-700">
                {formatCurrency(group.openingBalance)}
              </div>
              <div className={`text-right tabular-nums font-medium ${
                group.receipts > 0 ? 'text-forvis-success-600' : 'text-forvis-gray-400'
              }`}>
                {formatCurrency(group.receipts)}
              </div>
              <div className={`text-right tabular-nums ${
                group.variance > 0 ? 'text-forvis-success-600' : 
                group.variance < 0 ? 'text-forvis-error-600' : 
                'text-forvis-gray-500'
              }`}>
                {formatCurrency(group.variance)}
              </div>
              <div className={`text-right tabular-nums font-medium ${
                group.recoveryPercent >= 80 ? 'text-forvis-success-600' :
                group.recoveryPercent >= 50 ? 'text-forvis-warning-600' :
                group.recoveryPercent > 0 ? 'text-forvis-error-600' :
                'text-forvis-gray-400'
              }`}>
                {formatPercentage(group.recoveryPercent)}
              </div>
              <div className={`text-right tabular-nums ${
                group.billings > 0 ? 'text-forvis-blue-600' : 'text-forvis-gray-400'
              }`}>
                {formatCurrency(group.billings)}
              </div>
              <div className={`text-right tabular-nums font-semibold ${
                group.closingBalance > 0 ? 'text-forvis-gray-900' : 'text-forvis-gray-500'
              }`}>
                {formatCurrency(group.closingBalance)}
              </div>
            </div>
          ))}

          {/* Totals Row */}
          <div
            className="grid gap-2 py-3 px-4 text-xs font-bold border-t-2 border-forvis-blue-500"
            style={{
              background: 'linear-gradient(135deg, #F0F7FD 0%, #E0EDFB 100%)',
              gridTemplateColumns: '1.5fr 110px 100px 100px 80px 100px 110px'
            }}
          >
            <div className="text-forvis-blue-800">TOTAL (Page {currentPage} of {totalPages})</div>
            <div className="text-right text-forvis-blue-800 tabular-nums">
              {formatCurrency(grandTotals.openingBalance)}
            </div>
            <div className="text-right tabular-nums text-forvis-success-600">
              {formatCurrency(grandTotals.receipts)}
            </div>
            <div className={`text-right tabular-nums ${
              grandTotals.variance > 0 ? 'text-forvis-success-600' : 
              grandTotals.variance < 0 ? 'text-forvis-error-600' : 
              'text-forvis-blue-800'
            }`}>
              {formatCurrency(grandTotals.variance)}
            </div>
            <div className={`text-right tabular-nums ${
              grandTotals.recoveryPercent >= 80 ? 'text-forvis-success-600' :
              grandTotals.recoveryPercent >= 50 ? 'text-forvis-warning-600' :
              'text-forvis-error-600'
            }`}>
              {formatPercentage(grandTotals.recoveryPercent)}
            </div>
            <div className="text-right tabular-nums text-forvis-blue-600">
              {formatCurrency(grandTotals.billings)}
            </div>
            <div className="text-right tabular-nums text-forvis-blue-800">
              {formatCurrency(grandTotals.closingBalance)}
            </div>
          </div>
        </div>
      </div>

      {/* Pagination */}
      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
        totalItems={sortedGroups.length}
        itemsPerPage={ITEMS_PER_PAGE}
        showMetadata
        className="mt-4 px-4"
      />
    </div>
  );
}
