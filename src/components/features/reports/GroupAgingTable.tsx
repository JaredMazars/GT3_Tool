'use client';

/**
 * Group Aging Table Component
 * 
 * Displays debtor aging buckets aggregated by Client Group
 * Columns: Group Name | Clients | Total Balance | Current | 31-60 | 61-90 | 91-120 | 120+ | Avg Days
 */

import { useState } from 'react';
import { Pagination } from '@/components/shared/Pagination';
import type { ClientDebtorData, AgingBuckets } from '@/types/api';

interface GroupTotal {
  groupCode: string;
  groupDesc: string;
  clientCount: number;
  totalBalance: number;
  aging: AgingBuckets;
  invoiceCount: number;
  avgPaymentDaysOutstanding: number;
}

interface GroupAgingTableProps {
  clients: ClientDebtorData[];
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

export function GroupAgingTable({ clients }: GroupAgingTableProps) {
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 20;

  // Aggregate clients by group
  const groupTotals = new Map<string, GroupTotal>();

  clients.forEach((client) => {
    if (!groupTotals.has(client.groupCode)) {
      groupTotals.set(client.groupCode, {
        groupCode: client.groupCode,
        groupDesc: client.groupDesc,
        clientCount: 0,
        totalBalance: 0,
        aging: {
          current: 0,
          days31_60: 0,
          days61_90: 0,
          days91_120: 0,
          days120Plus: 0,
        },
        invoiceCount: 0,
        avgPaymentDaysOutstanding: 0,
      });
    }

    const group = groupTotals.get(client.groupCode)!;
    group.clientCount += 1;
    group.totalBalance += client.totalBalance;
    group.aging.current += client.aging.current;
    group.aging.days31_60 += client.aging.days31_60;
    group.aging.days61_90 += client.aging.days61_90;
    group.aging.days91_120 += client.aging.days91_120;
    group.aging.days120Plus += client.aging.days120Plus;
    group.invoiceCount += client.invoiceCount;
  });

  // Calculate weighted average days outstanding for each group
  groupTotals.forEach((group, groupCode) => {
    const groupClients = clients.filter(c => c.groupCode === groupCode);
    const totalWeightedDays = groupClients.reduce(
      (sum, c) => sum + c.avgPaymentDaysOutstanding * c.totalBalance, 0
    );
    group.avgPaymentDaysOutstanding = group.totalBalance > 0 
      ? totalWeightedDays / group.totalBalance 
      : 0;
  });

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
  const grandTotals = {
    clientCount: paginatedGroups.reduce((sum, g) => sum + g.clientCount, 0),
    totalBalance: paginatedGroups.reduce((sum, g) => sum + g.totalBalance, 0),
    current: paginatedGroups.reduce((sum, g) => sum + g.aging.current, 0),
    days31_60: paginatedGroups.reduce((sum, g) => sum + g.aging.days31_60, 0),
    days61_90: paginatedGroups.reduce((sum, g) => sum + g.aging.days61_90, 0),
    days91_120: paginatedGroups.reduce((sum, g) => sum + g.aging.days91_120, 0),
    days120Plus: paginatedGroups.reduce((sum, g) => sum + g.aging.days120Plus, 0),
  };

  // Calculate weighted average days outstanding
  const totalWeightedDays = paginatedGroups.reduce(
    (sum, g) => sum + g.avgPaymentDaysOutstanding * g.totalBalance, 0
  );
  const avgDaysOutstanding = grandTotals.totalBalance > 0 
    ? totalWeightedDays / grandTotals.totalBalance 
    : 0;

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
          className="grid gap-3 py-3 px-4 text-xs font-semibold text-white shadow-corporate"
          style={{
            background: 'linear-gradient(to right, #2E5AAC, #25488A)',
            gridTemplateColumns: '2fr 80px 110px 100px 100px 100px 100px 100px 80px',
          }}
        >
          <div>Group Name</div>
          <div className="text-right">Clients</div>
          <div className="text-right">Total Balance</div>
          <div className="text-right">Current</div>
          <div className="text-right">31-60</div>
          <div className="text-right">61-90</div>
          <div className="text-right">91-120</div>
          <div className="text-right">120+</div>
          <div className="text-right">Avg Days</div>
        </div>

        {/* Table Body */}
        <div className="bg-white">
          {paginatedGroups.map((group, index) => (
            <div
              key={group.groupCode}
              className={`grid gap-3 py-3 px-4 text-xs transition-colors duration-200 hover:bg-forvis-blue-50 ${
                index % 2 === 0 ? 'bg-white' : 'bg-forvis-gray-50'
              }`}
              style={{ gridTemplateColumns: '2fr 80px 110px 100px 100px 100px 100px 100px 80px' }}
            >
              <div className="font-semibold text-forvis-gray-900">{group.groupDesc}</div>
              <div className="text-right text-forvis-gray-700 tabular-nums">
                {group.clientCount}
              </div>
              <div className={`text-right tabular-nums font-semibold ${
                group.totalBalance > 0 ? 'text-forvis-blue-600' : 'text-forvis-gray-700'
              }`}>
                {formatCurrency(group.totalBalance)}
              </div>
              <div className="text-right tabular-nums text-forvis-gray-700">
                {formatCurrency(group.aging.current)}
              </div>
              <div className={`text-right tabular-nums ${
                group.aging.days31_60 > 0 ? 'text-forvis-warning-600' : 'text-forvis-gray-400'
              }`}>
                {formatCurrency(group.aging.days31_60)}
              </div>
              <div className={`text-right tabular-nums ${
                group.aging.days61_90 > 0 ? 'text-forvis-warning-700' : 'text-forvis-gray-400'
              }`}>
                {formatCurrency(group.aging.days61_90)}
              </div>
              <div className={`text-right tabular-nums ${
                group.aging.days91_120 > 0 ? 'text-forvis-error-500' : 'text-forvis-gray-400'
              }`}>
                {formatCurrency(group.aging.days91_120)}
              </div>
              <div className={`text-right tabular-nums font-medium ${
                group.aging.days120Plus > 0 ? 'text-forvis-error-600' : 'text-forvis-gray-400'
              }`}>
                {formatCurrency(group.aging.days120Plus)}
              </div>
              <div className={`text-right tabular-nums ${
                group.avgPaymentDaysOutstanding > 90 ? 'text-forvis-error-600' :
                group.avgPaymentDaysOutstanding > 60 ? 'text-forvis-warning-600' :
                'text-forvis-gray-700'
              }`}>
                {formatNumber(Math.round(group.avgPaymentDaysOutstanding))}
              </div>
            </div>
          ))}

          {/* Totals Row */}
          <div
            className="grid gap-3 py-3 px-4 text-xs font-bold border-t-2 border-forvis-blue-500"
            style={{
              background: 'linear-gradient(135deg, #F0F7FD 0%, #E0EDFB 100%)',
              gridTemplateColumns: '2fr 80px 110px 100px 100px 100px 100px 100px 80px'
            }}
          >
            <div className="text-forvis-blue-800">TOTAL (Page {currentPage} of {totalPages})</div>
            <div className="text-right text-forvis-blue-800 tabular-nums">
              {grandTotals.clientCount}
            </div>
            <div className="text-right text-forvis-blue-800 tabular-nums">
              {formatCurrency(grandTotals.totalBalance)}
            </div>
            <div className="text-right tabular-nums text-forvis-blue-800">
              {formatCurrency(grandTotals.current)}
            </div>
            <div className={`text-right tabular-nums ${
              grandTotals.days31_60 > 0 ? 'text-forvis-warning-600' : 'text-forvis-blue-800'
            }`}>
              {formatCurrency(grandTotals.days31_60)}
            </div>
            <div className={`text-right tabular-nums ${
              grandTotals.days61_90 > 0 ? 'text-forvis-warning-700' : 'text-forvis-blue-800'
            }`}>
              {formatCurrency(grandTotals.days61_90)}
            </div>
            <div className={`text-right tabular-nums ${
              grandTotals.days91_120 > 0 ? 'text-forvis-error-500' : 'text-forvis-blue-800'
            }`}>
              {formatCurrency(grandTotals.days91_120)}
            </div>
            <div className={`text-right tabular-nums ${
              grandTotals.days120Plus > 0 ? 'text-forvis-error-600' : 'text-forvis-blue-800'
            }`}>
              {formatCurrency(grandTotals.days120Plus)}
            </div>
            <div className={`text-right tabular-nums ${
              avgDaysOutstanding > 90 ? 'text-forvis-error-600' :
              avgDaysOutstanding > 60 ? 'text-forvis-warning-600' :
              'text-forvis-blue-800'
            }`}>
              {formatNumber(Math.round(avgDaysOutstanding))}
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
