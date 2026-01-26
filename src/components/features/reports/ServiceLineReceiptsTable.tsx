'use client';

/**
 * Service Line Receipts Table Component
 * 
 * Displays monthly receipts data aggregated by Service Line hierarchy for the selected month
 * Supports: Master Service Line, Sub Service Line Group, and Service Line views
 * Columns: Service Line | Opening Balance | Receipts | Variance | % Recovered | Billings | Closing Balance
 */

import { useState, useMemo } from 'react';
import { Pagination } from '@/components/shared/Pagination';
import type { ClientDebtorData } from '@/types/api';

type ViewMode = 'master-service-line' | 'sub-service-line-group' | 'service-line';

interface ServiceLineTotal {
  code: string;
  name: string;
  openingBalance: number;
  receipts: number;
  variance: number;
  recoveryPercent: number;
  billings: number;
  closingBalance: number;
}

interface ServiceLineReceiptsTableProps {
  clients: ClientDebtorData[];
  viewMode: ViewMode;
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

export function ServiceLineReceiptsTable({ clients, viewMode, selectedMonth }: ServiceLineReceiptsTableProps) {
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 20;

  // Get the key and name based on view mode
  const getKey = (client: ClientDebtorData): string => {
    switch (viewMode) {
      case 'master-service-line':
        return client.masterServiceLineCode;
      case 'sub-service-line-group':
        return client.subServlineGroupCode || client.servLineCode;
      case 'service-line':
        return client.servLineCode;
    }
  };

  const getName = (client: ClientDebtorData): string => {
    switch (viewMode) {
      case 'master-service-line':
        return client.masterServiceLineName;
      case 'sub-service-line-group':
        return client.subServlineGroupDesc || client.serviceLineName;
      case 'service-line':
        return client.serviceLineName;
    }
  };

  // Aggregate clients by service line level using monthly data
  const serviceLineTotals = useMemo(() => {
    const totals = new Map<string, ServiceLineTotal>();

    clients.forEach((client) => {
      const key = getKey(client);
      const name = getName(client);

      // Get monthly data for selected month
      const monthData = client.monthlyReceipts?.find(m => m.month === selectedMonth);
      const openingBalance = monthData?.openingBalance || 0;
      const receipts = monthData?.receipts || 0;
      const billings = monthData?.billings || 0;
      const closingBalance = monthData?.closingBalance || 0;

      if (!totals.has(key)) {
        totals.set(key, {
          code: key,
          name: name,
          openingBalance: 0,
          receipts: 0,
          variance: 0,
          recoveryPercent: 0,
          billings: 0,
          closingBalance: 0,
        });
      }

      const sl = totals.get(key)!;
      sl.openingBalance += openingBalance;
      sl.receipts += receipts;
      sl.billings += billings;
      sl.closingBalance += closingBalance;
    });

    // Calculate variance and recovery percent for each service line
    totals.forEach(sl => {
      sl.variance = sl.receipts - sl.openingBalance;
      sl.recoveryPercent = sl.openingBalance > 0 
        ? (sl.receipts / sl.openingBalance) * 100 
        : 0;
    });

    return totals;
  }, [clients, viewMode, selectedMonth]);

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
  const grandTotals = useMemo(() => {
    const openingBalance = paginatedServiceLines.reduce((sum, sl) => sum + sl.openingBalance, 0);
    const receipts = paginatedServiceLines.reduce((sum, sl) => sum + sl.receipts, 0);
    const billings = paginatedServiceLines.reduce((sum, sl) => sum + sl.billings, 0);
    const closingBalance = paginatedServiceLines.reduce((sum, sl) => sum + sl.closingBalance, 0);
    const variance = receipts - openingBalance;
    const recoveryPercent = openingBalance > 0 
      ? (receipts / openingBalance) * 100 
      : 0;
    
    return { openingBalance, receipts, variance, recoveryPercent, billings, closingBalance };
  }, [paginatedServiceLines]);

  // Get header label based on view mode
  const getHeaderLabel = () => {
    switch (viewMode) {
      case 'master-service-line':
        return 'Master Service Line';
      case 'sub-service-line-group':
        return 'Sub SL Group';
      case 'service-line':
        return 'Service Line';
    }
  };

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
          <div>{getHeaderLabel()}</div>
          <div className="text-right">Opening Bal</div>
          <div className="text-right">Receipts</div>
          <div className="text-right">Variance</div>
          <div className="text-right">% Recov</div>
          <div className="text-right">Billings</div>
          <div className="text-right">Closing Bal</div>
        </div>

        {/* Table Body */}
        <div className="bg-white">
          {paginatedServiceLines.map((sl, index) => (
            <div
              key={sl.code}
              className={`grid gap-2 py-3 px-4 text-xs transition-colors duration-200 hover:bg-forvis-blue-50 ${
                index % 2 === 0 ? 'bg-white' : 'bg-forvis-gray-50'
              }`}
              style={{ gridTemplateColumns: '1.5fr 110px 100px 100px 80px 100px 110px' }}
            >
              <div className="font-semibold text-forvis-gray-900">{sl.name}</div>
              <div className="text-right tabular-nums text-forvis-gray-700">
                {formatCurrency(sl.openingBalance)}
              </div>
              <div className={`text-right tabular-nums font-medium ${
                sl.receipts > 0 ? 'text-forvis-success-600' : 'text-forvis-gray-400'
              }`}>
                {formatCurrency(sl.receipts)}
              </div>
              <div className={`text-right tabular-nums ${
                sl.variance > 0 ? 'text-forvis-success-600' : 
                sl.variance < 0 ? 'text-forvis-error-600' : 
                'text-forvis-gray-500'
              }`}>
                {formatCurrency(sl.variance)}
              </div>
              <div className={`text-right tabular-nums font-medium ${
                sl.recoveryPercent >= 80 ? 'text-forvis-success-600' :
                sl.recoveryPercent >= 50 ? 'text-forvis-warning-600' :
                sl.recoveryPercent > 0 ? 'text-forvis-error-600' :
                'text-forvis-gray-400'
              }`}>
                {formatPercentage(sl.recoveryPercent)}
              </div>
              <div className={`text-right tabular-nums ${
                sl.billings > 0 ? 'text-forvis-blue-600' : 'text-forvis-gray-400'
              }`}>
                {formatCurrency(sl.billings)}
              </div>
              <div className={`text-right tabular-nums font-semibold ${
                sl.closingBalance > 0 ? 'text-forvis-gray-900' : 'text-forvis-gray-500'
              }`}>
                {formatCurrency(sl.closingBalance)}
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
        totalItems={sortedServiceLines.length}
        itemsPerPage={ITEMS_PER_PAGE}
        showMetadata
        className="mt-4 px-4"
      />
    </div>
  );
}
