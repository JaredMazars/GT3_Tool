'use client';

/**
 * Client Totals Table Component
 * 
 * Displays aggregated totals by Client (with Group context)
 * Columns: Group Name | Client | Total Tasks | Net WIP
 */

import { useState } from 'react';
import { Pagination } from '@/components/shared/Pagination';
import type { TaskWithWIPAndServiceLine } from '@/types/api';

interface ClientTotal {
  groupCode: string;
  groupDesc: string;
  GSClientID: string;
  clientCode: string;
  clientNameFull: string | null;
  taskCount: number;
  totalWIP: number;
  ltdHours: number;
  grossProduction: number;
  ltdAdj: number;
  netRevenue: number;
  ltdCost: number;
  grossProfit: number;
}

interface ClientTotalsTableProps {
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

export function ClientTotalsTable({ tasks }: ClientTotalsTableProps) {
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 25;

  // Aggregate tasks by client
  const clientTotals = new Map<string, ClientTotal>();

  tasks.forEach((task) => {
    if (!clientTotals.has(task.GSClientID)) {
      clientTotals.set(task.GSClientID, {
        groupCode: task.groupCode,
        groupDesc: task.groupDesc,
        GSClientID: task.GSClientID,
        clientCode: task.clientCode,
        clientNameFull: task.clientNameFull,
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

    const client = clientTotals.get(task.GSClientID)!;
    client.taskCount += 1;
    client.totalWIP += task.netWip;
    client.ltdHours += task.ltdHours;
    client.grossProduction += task.grossProduction;
    client.ltdAdj += task.ltdAdj;
    client.netRevenue += task.netRevenue;
    client.ltdCost += task.ltdCost;
    client.grossProfit += task.grossProfit;
  });

  // Convert to array and sort by group then client code
  const sortedClients = Array.from(clientTotals.values()).sort((a, b) => {
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
    taskCount: paginatedClients.reduce((sum, client) => sum + client.taskCount, 0),
    ltdHours: paginatedClients.reduce((sum, client) => sum + client.ltdHours, 0),
    grossProduction: paginatedClients.reduce((sum, client) => sum + client.grossProduction, 0),
    ltdAdj: paginatedClients.reduce((sum, client) => sum + client.ltdAdj, 0),
    netRevenue: paginatedClients.reduce((sum, client) => sum + client.netRevenue, 0),
    ltdCost: paginatedClients.reduce((sum, client) => sum + client.ltdCost, 0),
    grossProfit: paginatedClients.reduce((sum, client) => sum + client.grossProfit, 0),
  };
  
  const totalAdjPercentage = grandTotals.grossProduction !== 0 
    ? (grandTotals.ltdAdj / grandTotals.grossProduction) * 100 
    : 0;
  const totalGPPercentage = grandTotals.netRevenue !== 0 
    ? (grandTotals.grossProfit / grandTotals.netRevenue) * 100 
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
        <h3 className="mt-2 text-sm font-medium text-forvis-gray-900">No clients found</h3>
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
            background: 'linear-gradient(to right, #2E5AAC, #25488A)',
            gridTemplateColumns: '1fr 1.5fr 70px 90px 110px 110px 110px 90px 110px 110px 110px',
          }}
        >
          <div>Group</div>
          <div>Client</div>
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
          {paginatedClients.map((client, index) => {
            const adjustmentPercentage = client.grossProduction !== 0 ? (client.ltdAdj / client.grossProduction) * 100 : 0;
            const grossProfitPercentage = client.netRevenue !== 0 ? (client.grossProfit / client.netRevenue) * 100 : 0;
            
            return (
              <div
                key={client.GSClientID}
                className={`grid gap-3 py-3 px-4 text-xs transition-colors duration-200 hover:bg-forvis-blue-50 ${
                  index % 2 === 0 ? 'bg-white' : 'bg-forvis-gray-50'
                }`}
                style={{ gridTemplateColumns: '1fr 1.5fr 70px 90px 110px 110px 110px 90px 110px 110px 110px' }}
              >
                <div className="text-forvis-gray-700">{client.groupDesc}</div>
                <div className="text-forvis-gray-900">
                  <span className="font-medium">{client.clientCode}</span>
                  {' - '}
                  {client.clientNameFull || 'Unnamed Client'}
                </div>
                <div className="text-right text-forvis-gray-700 tabular-nums">
                  {client.taskCount}
                </div>
                <div className="text-right tabular-nums text-forvis-gray-700">
                  {formatNumber(client.ltdHours)}
                </div>
                <div className="text-right tabular-nums text-forvis-gray-700">
                  {formatCurrency(client.grossProduction)}
                </div>
                <div className={`text-right tabular-nums font-medium ${
                  client.ltdAdj < 0 ? 'text-red-600' : 'text-forvis-gray-700'
                }`}>
                  {formatCurrency(client.ltdAdj)}
                </div>
                <div className={`text-right tabular-nums font-semibold ${
                  client.netRevenue < 0 ? 'text-red-600' : 'text-forvis-blue-600'
                }`}>
                  {formatCurrency(client.netRevenue)}
                </div>
                <div className={`text-right tabular-nums ${
                  adjustmentPercentage < 0 ? 'text-red-600' : 'text-forvis-gray-700'
                }`}>
                  {formatPercentage(adjustmentPercentage)}
                </div>
                <div className="text-right tabular-nums text-forvis-gray-700">
                  {formatCurrency(client.ltdCost)}
                </div>
                <div className={`text-right tabular-nums font-semibold ${
                  client.grossProfit < 0 ? 'text-red-600' : 'text-green-600'
                }`}>
                  {formatCurrency(client.grossProfit)}
                </div>
                <div className={`text-right tabular-nums font-bold ${
                  grossProfitPercentage >= 60 ? 'text-green-600' : 
                  grossProfitPercentage >= 50 ? 'text-yellow-600' : 
                  'text-red-600'
                }`}>
                  {formatPercentage(grossProfitPercentage)}
                </div>
              </div>
            );
          })}

          {/* Totals Row */}
          <div
            className="grid gap-3 py-3 px-4 text-xs font-bold border-t-2 border-forvis-blue-500"
            style={{
              background: 'linear-gradient(135deg, #F0F7FD 0%, #E0EDFB 100%)',
              gridTemplateColumns: '1fr 1.5fr 70px 90px 110px 110px 110px 90px 110px 110px 110px'
            }}
          >
            <div className="text-forvis-blue-800" style={{ gridColumn: 'span 2' }}>TOTAL (Page {currentPage} of {totalPages})</div>
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
        totalItems={sortedClients.length}
        itemsPerPage={ITEMS_PER_PAGE}
        showMetadata
        className="mt-4 px-4"
      />
    </div>
  );
}
