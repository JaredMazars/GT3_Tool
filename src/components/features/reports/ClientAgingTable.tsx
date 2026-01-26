'use client';

/**
 * Client Aging Table Component
 * 
 * Displays debtor aging buckets by Client
 * Columns: Group | Client | Total Balance | Current | 31-60 | 61-90 | 91-120 | 120+ | Avg Days
 */

import { useState } from 'react';
import { Pagination } from '@/components/shared/Pagination';
import type { ClientDebtorData } from '@/types/api';

interface ClientAgingTableProps {
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

export function ClientAgingTable({ clients }: ClientAgingTableProps) {
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 25;

  // Sort clients by group then client code
  const sortedClients = [...clients].sort((a, b) => {
    const groupCompare = a.groupDesc.localeCompare(b.groupDesc);
    if (groupCompare !== 0) return groupCompare;
    return a.clientCode.localeCompare(b.clientCode);
  });

  // Pagination calculation
  const totalPages = Math.ceil(sortedClients.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const paginatedClients = sortedClients.slice(startIndex, endIndex);

  // Calculate grand totals for current page
  const grandTotals = {
    totalBalance: paginatedClients.reduce((sum, c) => sum + c.totalBalance, 0),
    current: paginatedClients.reduce((sum, c) => sum + c.aging.current, 0),
    days31_60: paginatedClients.reduce((sum, c) => sum + c.aging.days31_60, 0),
    days61_90: paginatedClients.reduce((sum, c) => sum + c.aging.days61_90, 0),
    days91_120: paginatedClients.reduce((sum, c) => sum + c.aging.days91_120, 0),
    days120Plus: paginatedClients.reduce((sum, c) => sum + c.aging.days120Plus, 0),
    invoiceCount: paginatedClients.reduce((sum, c) => sum + c.invoiceCount, 0),
  };

  // Calculate weighted average days outstanding
  const totalWeightedDays = paginatedClients.reduce(
    (sum, c) => sum + c.avgPaymentDaysOutstanding * c.totalBalance, 0
  );
  const avgDaysOutstanding = grandTotals.totalBalance > 0 
    ? totalWeightedDays / grandTotals.totalBalance 
    : 0;

  if (sortedClients.length === 0) {
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
        <h3 className="mt-2 text-sm font-medium text-forvis-gray-900">No debtors found</h3>
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
            gridTemplateColumns: '1fr 1.5fr 100px 100px 100px 100px 100px 100px 80px',
          }}
        >
          <div>Group</div>
          <div>Client</div>
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
          {paginatedClients.map((client, index) => (
            <div
              key={client.GSClientID}
              className={`grid gap-3 py-3 px-4 text-xs transition-colors duration-200 hover:bg-forvis-blue-50 ${
                index % 2 === 0 ? 'bg-white' : 'bg-forvis-gray-50'
              }`}
              style={{ gridTemplateColumns: '1fr 1.5fr 100px 100px 100px 100px 100px 100px 80px' }}
            >
              <div className="text-forvis-gray-700">{client.groupDesc}</div>
              <div className="text-forvis-gray-900">
                <span className="font-medium">{client.clientCode}</span>
                {' - '}
                {client.clientNameFull || 'Unnamed Client'}
              </div>
              <div className={`text-right tabular-nums font-semibold ${
                client.totalBalance > 0 ? 'text-forvis-blue-600' : 'text-forvis-gray-700'
              }`}>
                {formatCurrency(client.totalBalance)}
              </div>
              <div className="text-right tabular-nums text-forvis-gray-700">
                {formatCurrency(client.aging.current)}
              </div>
              <div className={`text-right tabular-nums ${
                client.aging.days31_60 > 0 ? 'text-forvis-warning-600' : 'text-forvis-gray-400'
              }`}>
                {formatCurrency(client.aging.days31_60)}
              </div>
              <div className={`text-right tabular-nums ${
                client.aging.days61_90 > 0 ? 'text-forvis-warning-700' : 'text-forvis-gray-400'
              }`}>
                {formatCurrency(client.aging.days61_90)}
              </div>
              <div className={`text-right tabular-nums ${
                client.aging.days91_120 > 0 ? 'text-forvis-error-500' : 'text-forvis-gray-400'
              }`}>
                {formatCurrency(client.aging.days91_120)}
              </div>
              <div className={`text-right tabular-nums font-medium ${
                client.aging.days120Plus > 0 ? 'text-forvis-error-600' : 'text-forvis-gray-400'
              }`}>
                {formatCurrency(client.aging.days120Plus)}
              </div>
              <div className={`text-right tabular-nums ${
                client.avgPaymentDaysOutstanding > 90 ? 'text-forvis-error-600' :
                client.avgPaymentDaysOutstanding > 60 ? 'text-forvis-warning-600' :
                'text-forvis-gray-700'
              }`}>
                {formatNumber(Math.round(client.avgPaymentDaysOutstanding))}
              </div>
            </div>
          ))}

          {/* Totals Row */}
          <div
            className="grid gap-3 py-3 px-4 text-xs font-bold border-t-2 border-forvis-blue-500"
            style={{
              background: 'linear-gradient(135deg, #F0F7FD 0%, #E0EDFB 100%)',
              gridTemplateColumns: '1fr 1.5fr 100px 100px 100px 100px 100px 100px 80px'
            }}
          >
            <div className="text-forvis-blue-800" style={{ gridColumn: 'span 2' }}>
              TOTAL (Page {currentPage} of {totalPages})
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
        totalItems={sortedClients.length}
        itemsPerPage={ITEMS_PER_PAGE}
        showMetadata
        className="mt-4 px-4"
      />
    </div>
  );
}
