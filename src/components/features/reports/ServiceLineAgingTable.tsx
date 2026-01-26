'use client';

/**
 * Service Line Aging Table Component
 * 
 * Displays debtor aging buckets aggregated by Service Line hierarchy
 * Supports: Master Service Line, Sub Service Line Group, and Service Line views
 */

import { useState } from 'react';
import { Pagination } from '@/components/shared/Pagination';
import type { ClientDebtorData, AgingBuckets } from '@/types/api';

type ViewMode = 'master-service-line' | 'sub-service-line-group' | 'service-line';

interface ServiceLineTotal {
  code: string;
  name: string;
  clientCount: number;
  totalBalance: number;
  aging: AgingBuckets;
  invoiceCount: number;
  avgPaymentDaysOutstanding: number;
}

interface ServiceLineAgingTableProps {
  clients: ClientDebtorData[];
  viewMode: ViewMode;
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

export function ServiceLineAgingTable({ clients, viewMode }: ServiceLineAgingTableProps) {
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

  // Aggregate clients by service line level
  const serviceLineTotals = new Map<string, ServiceLineTotal>();

  clients.forEach((client) => {
    const key = getKey(client);
    const name = getName(client);

    if (!serviceLineTotals.has(key)) {
      serviceLineTotals.set(key, {
        code: key,
        name: name,
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

    const sl = serviceLineTotals.get(key)!;
    sl.clientCount += 1;
    sl.totalBalance += client.totalBalance;
    sl.aging.current += client.aging.current;
    sl.aging.days31_60 += client.aging.days31_60;
    sl.aging.days61_90 += client.aging.days61_90;
    sl.aging.days91_120 += client.aging.days91_120;
    sl.aging.days120Plus += client.aging.days120Plus;
    sl.invoiceCount += client.invoiceCount;
  });

  // Calculate weighted average days outstanding for each service line
  serviceLineTotals.forEach((sl, key) => {
    const slClients = clients.filter(c => getKey(c) === key);
    const totalWeightedDays = slClients.reduce(
      (sum, c) => sum + c.avgPaymentDaysOutstanding * c.totalBalance, 0
    );
    sl.avgPaymentDaysOutstanding = sl.totalBalance > 0 
      ? totalWeightedDays / sl.totalBalance 
      : 0;
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
    clientCount: paginatedServiceLines.reduce((sum, sl) => sum + sl.clientCount, 0),
    totalBalance: paginatedServiceLines.reduce((sum, sl) => sum + sl.totalBalance, 0),
    current: paginatedServiceLines.reduce((sum, sl) => sum + sl.aging.current, 0),
    days31_60: paginatedServiceLines.reduce((sum, sl) => sum + sl.aging.days31_60, 0),
    days61_90: paginatedServiceLines.reduce((sum, sl) => sum + sl.aging.days61_90, 0),
    days91_120: paginatedServiceLines.reduce((sum, sl) => sum + sl.aging.days91_120, 0),
    days120Plus: paginatedServiceLines.reduce((sum, sl) => sum + sl.aging.days120Plus, 0),
  };

  // Calculate weighted average days outstanding
  const totalWeightedDays = paginatedServiceLines.reduce(
    (sum, sl) => sum + sl.avgPaymentDaysOutstanding * sl.totalBalance, 0
  );
  const avgDaysOutstanding = grandTotals.totalBalance > 0 
    ? totalWeightedDays / grandTotals.totalBalance 
    : 0;

  // Get header label based on view mode
  const getHeaderLabel = () => {
    switch (viewMode) {
      case 'master-service-line':
        return 'Master Service Line';
      case 'sub-service-line-group':
        return 'Sub Service Line Group';
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
          className="grid gap-3 py-3 px-4 text-xs font-semibold text-white shadow-corporate"
          style={{
            background: 'linear-gradient(to right, #2E5AAC, #25488A)',
            gridTemplateColumns: '2fr 80px 110px 100px 100px 100px 100px 100px 80px',
          }}
        >
          <div>{getHeaderLabel()}</div>
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
          {paginatedServiceLines.map((sl, index) => (
            <div
              key={sl.code}
              className={`grid gap-3 py-3 px-4 text-xs transition-colors duration-200 hover:bg-forvis-blue-50 ${
                index % 2 === 0 ? 'bg-white' : 'bg-forvis-gray-50'
              }`}
              style={{ gridTemplateColumns: '2fr 80px 110px 100px 100px 100px 100px 100px 80px' }}
            >
              <div className="font-semibold text-forvis-gray-900">{sl.name}</div>
              <div className="text-right text-forvis-gray-700 tabular-nums">
                {sl.clientCount}
              </div>
              <div className={`text-right tabular-nums font-semibold ${
                sl.totalBalance > 0 ? 'text-forvis-blue-600' : 'text-forvis-gray-700'
              }`}>
                {formatCurrency(sl.totalBalance)}
              </div>
              <div className="text-right tabular-nums text-forvis-gray-700">
                {formatCurrency(sl.aging.current)}
              </div>
              <div className={`text-right tabular-nums ${
                sl.aging.days31_60 > 0 ? 'text-forvis-warning-600' : 'text-forvis-gray-400'
              }`}>
                {formatCurrency(sl.aging.days31_60)}
              </div>
              <div className={`text-right tabular-nums ${
                sl.aging.days61_90 > 0 ? 'text-forvis-warning-700' : 'text-forvis-gray-400'
              }`}>
                {formatCurrency(sl.aging.days61_90)}
              </div>
              <div className={`text-right tabular-nums ${
                sl.aging.days91_120 > 0 ? 'text-forvis-error-500' : 'text-forvis-gray-400'
              }`}>
                {formatCurrency(sl.aging.days91_120)}
              </div>
              <div className={`text-right tabular-nums font-medium ${
                sl.aging.days120Plus > 0 ? 'text-forvis-error-600' : 'text-forvis-gray-400'
              }`}>
                {formatCurrency(sl.aging.days120Plus)}
              </div>
              <div className={`text-right tabular-nums ${
                sl.avgPaymentDaysOutstanding > 90 ? 'text-forvis-error-600' :
                sl.avgPaymentDaysOutstanding > 60 ? 'text-forvis-warning-600' :
                'text-forvis-gray-700'
              }`}>
                {formatNumber(Math.round(sl.avgPaymentDaysOutstanding))}
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
        totalItems={sortedServiceLines.length}
        itemsPerPage={ITEMS_PER_PAGE}
        showMetadata
        className="mt-4 px-4"
      />
    </div>
  );
}
