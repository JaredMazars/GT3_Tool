'use client';

/**
 * Client Receipts Table Component
 * 
 * Displays monthly receipts data by Client for the selected month
 * Columns: Group | Client | Opening Balance | Receipts | Variance | % Recovered | Billings | Closing Balance
 */

import { useState, useMemo } from 'react';
import { Pagination } from '@/components/shared/Pagination';
import type { ClientDebtorData } from '@/types/api';

interface ClientReceiptsTableProps {
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

export function ClientReceiptsTable({ clients, selectedMonth }: ClientReceiptsTableProps) {
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

  // Get monthly data for each client for the selected month
  const getMonthlyData = (client: ClientDebtorData) => {
    const monthData = client.monthlyReceipts?.find(m => m.month === selectedMonth);
    return monthData || { 
      openingBalance: 0, 
      receipts: 0, 
      variance: 0,
      recoveryPercent: 0,
      billings: 0,
      closingBalance: 0,
    };
  };

  // Calculate grand totals for current page
  const grandTotals = useMemo(() => {
    let openingBalance = 0;
    let receipts = 0;
    let billings = 0;
    let closingBalance = 0;
    
    paginatedClients.forEach(client => {
      const monthData = getMonthlyData(client);
      openingBalance += monthData.openingBalance;
      receipts += monthData.receipts;
      billings += monthData.billings;
      closingBalance += monthData.closingBalance;
    });
    
    const variance = receipts - openingBalance;
    const recoveryPercent = openingBalance > 0 
      ? (receipts / openingBalance) * 100 
      : 0;
    
    return { openingBalance, receipts, variance, recoveryPercent, billings, closingBalance };
  }, [paginatedClients, selectedMonth]);

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
          className="grid gap-2 py-3 px-4 text-xs font-semibold text-white shadow-corporate"
          style={{
            background: 'linear-gradient(to right, #2E5AAC, #25488A)',
            gridTemplateColumns: '0.8fr 1.2fr 110px 100px 100px 80px 100px 110px',
          }}
        >
          <div>Group</div>
          <div>Client</div>
          <div className="text-right">Opening Bal</div>
          <div className="text-right">Receipts</div>
          <div className="text-right">Variance</div>
          <div className="text-right">% Recov</div>
          <div className="text-right">Billings</div>
          <div className="text-right">Closing Bal</div>
        </div>

        {/* Table Body */}
        <div className="bg-white">
          {paginatedClients.map((client, index) => {
            const monthData = getMonthlyData(client);

            return (
              <div
                key={client.GSClientID}
                className={`grid gap-2 py-3 px-4 text-xs transition-colors duration-200 hover:bg-forvis-blue-50 ${
                  index % 2 === 0 ? 'bg-white' : 'bg-forvis-gray-50'
                }`}
                style={{ gridTemplateColumns: '0.8fr 1.2fr 110px 100px 100px 80px 100px 110px' }}
              >
                <div className="text-forvis-gray-700 truncate">{client.groupDesc}</div>
                <div className="text-forvis-gray-900 truncate">
                  <span className="font-medium">{client.clientCode}</span>
                  {' - '}
                  {client.clientNameFull || 'Unnamed Client'}
                </div>
                <div className="text-right tabular-nums text-forvis-gray-700">
                  {formatCurrency(monthData.openingBalance)}
                </div>
                <div className={`text-right tabular-nums font-medium ${
                  monthData.receipts > 0 ? 'text-forvis-success-600' : 'text-forvis-gray-400'
                }`}>
                  {formatCurrency(monthData.receipts)}
                </div>
                <div className={`text-right tabular-nums ${
                  monthData.variance > 0 ? 'text-forvis-success-600' : 
                  monthData.variance < 0 ? 'text-forvis-error-600' : 
                  'text-forvis-gray-500'
                }`}>
                  {formatCurrency(monthData.variance)}
                </div>
                <div className={`text-right tabular-nums font-medium ${
                  monthData.recoveryPercent >= 80 ? 'text-forvis-success-600' :
                  monthData.recoveryPercent >= 50 ? 'text-forvis-warning-600' :
                  monthData.recoveryPercent > 0 ? 'text-forvis-error-600' :
                  'text-forvis-gray-400'
                }`}>
                  {formatPercentage(monthData.recoveryPercent)}
                </div>
                <div className={`text-right tabular-nums ${
                  monthData.billings > 0 ? 'text-forvis-blue-600' : 'text-forvis-gray-400'
                }`}>
                  {formatCurrency(monthData.billings)}
                </div>
                <div className={`text-right tabular-nums font-semibold ${
                  monthData.closingBalance > 0 ? 'text-forvis-gray-900' : 'text-forvis-gray-500'
                }`}>
                  {formatCurrency(monthData.closingBalance)}
                </div>
              </div>
            );
          })}

          {/* Totals Row */}
          <div
            className="grid gap-2 py-3 px-4 text-xs font-bold border-t-2 border-forvis-blue-500"
            style={{
              background: 'linear-gradient(135deg, #F0F7FD 0%, #E0EDFB 100%)',
              gridTemplateColumns: '0.8fr 1.2fr 110px 100px 100px 80px 100px 110px'
            }}
          >
            <div className="text-forvis-blue-800" style={{ gridColumn: 'span 2' }}>
              TOTAL (Page {currentPage} of {totalPages})
            </div>
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
        totalItems={sortedClients.length}
        itemsPerPage={ITEMS_PER_PAGE}
        showMetadata
        className="mt-4 px-4"
      />
    </div>
  );
}
