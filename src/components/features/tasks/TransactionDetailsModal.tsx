'use client';

import { useState, useMemo } from 'react';
import { X, ArrowUpDown, ArrowUp, ArrowDown, Calendar, User, Filter } from 'lucide-react';
import { useTaskTransactions, TaskTransaction } from '@/hooks/tasks/useTaskTransactions';
import { MetricType } from '@/types';
import { Input } from '@/components/ui';

interface TransactionDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  taskId: number;
  metricType: MetricType | null;
  metricLabel: string;
  metricValue: number;
}

type SortKey = 'tranDate' | 'tranType' | 'empName' | 'amount' | 'cost' | 'hour';
type SortDirection = 'asc' | 'desc';

// Map metric types to transaction type filters
const METRIC_TTYPE_FILTERS: Record<MetricType, string[] | null> = {
  grossProduction: ['T', 'D'],
  ltdAdjustment: ['ADJ'],
  ltdAdj: ['ADJ'], // Merged adjustments
  ltdAdjTime: ['ADJ'], // Legacy - will use TranType check
  ltdAdjDisb: ['ADJ'], // Legacy - will use TranType check
  ltdCost: null, // All non-provision (handled by special case)
  ltdFee: ['F'], // Merged fees
  ltdFeeTime: ['F'], // Legacy - will use TranType check
  ltdFeeDisb: ['F'], // Legacy - will use TranType check
  balWIP: null, // All transactions
  balTime: ['T', 'ADJ', 'F'],
  balDisb: ['D', 'ADJ', 'F'],
  wipProvision: ['P'],
  ltdHours: ['T'], // Only Time transactions have hours
  netRevenue: ['T', 'D', 'ADJ', 'P'], // Gross production + adjustments + provisions
  grossProfit: null, // All transactions
  grossProfitPercentage: null, // All transactions
  averageChargeoutRate: ['T'], // Rate based on hours (T only)
  averageRecoveryRate: ['T'], // Rate based on hours (T only)
};

export function TransactionDetailsModal({
  isOpen,
  onClose,
  taskId,
  metricType,
  metricLabel,
  metricValue,
}: TransactionDetailsModalProps) {
  const { data, isLoading, error } = useTaskTransactions(taskId, { enabled: isOpen });
  
  const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: SortDirection }>({
    key: 'tranDate',
    direction: 'desc',
  });
  
  const [filters, setFilters] = useState<{
    startDate: string;
    endDate: string;
    employee: string;
  }>({
    startDate: '',
    endDate: '',
    employee: '',
  });

  // Filter transactions based on metric type
  const filteredTransactions = useMemo(() => {
    if (!data?.transactions || !metricType) return [];
    
    let filtered = data.transactions;
    
    // Apply metric type filter
    const ttypeFilters = METRIC_TTYPE_FILTERS[metricType];
    
    // Special handling for metrics that need TranType differentiation
    if (metricType === 'ltdFeeTime') {
      filtered = filtered.filter(txn => {
        const tTypeUpper = txn.tType.toUpperCase();
        const tranTypeUpper = txn.tranType.toUpperCase();
        return tTypeUpper === 'F' && (tranTypeUpper.includes('TIME') || tranTypeUpper.includes('REVT'));
      });
    } else if (metricType === 'ltdFeeDisb') {
      filtered = filtered.filter(txn => {
        const tTypeUpper = txn.tType.toUpperCase();
        const tranTypeUpper = txn.tranType.toUpperCase();
        return tTypeUpper === 'F' && (tranTypeUpper.includes('DISB') || tranTypeUpper.includes('REVD'));
      });
    } else if (metricType === 'ltdAdjTime') {
      filtered = filtered.filter(txn => {
        const tTypeUpper = txn.tType.toUpperCase();
        const tranTypeUpper = txn.tranType.toUpperCase();
        return tTypeUpper === 'ADJ' && tranTypeUpper.includes('TIME');
      });
    } else if (metricType === 'ltdAdjDisb') {
      filtered = filtered.filter(txn => {
        const tTypeUpper = txn.tType.toUpperCase();
        const tranTypeUpper = txn.tranType.toUpperCase();
        return tTypeUpper === 'ADJ' && (tranTypeUpper.includes('DISBURSEMENT') || tranTypeUpper.includes('DISB'));
      });
    } else if (metricType === 'ltdAdj') {
      // Merged adjustments - all ADJ transactions regardless of TranType
      filtered = filtered.filter(txn => txn.tType.toUpperCase() === 'ADJ');
    } else if (metricType === 'ltdFee') {
      // Merged fees - all F transactions regardless of TranType
      filtered = filtered.filter(txn => txn.tType.toUpperCase() === 'F');
    } else if (metricType === 'ltdAdjustment') {
      filtered = filtered.filter(txn => txn.tType.toUpperCase() === 'ADJ');
    } else if (ttypeFilters && ttypeFilters.length > 0) {
      // Standard TType filtering
      filtered = filtered.filter(txn => {
        const tTypeUpper = txn.tType.toUpperCase();
        return ttypeFilters.some(filter => tTypeUpper === filter || tTypeUpper.startsWith(filter));
      });
    } else if (metricType === 'ltdCost') {
      // All except provisions
      filtered = filtered.filter(txn => txn.tType.toUpperCase() !== 'P');
    }
    
    // Apply date range filter
    if (filters.startDate) {
      const startDate = new Date(filters.startDate);
      filtered = filtered.filter(txn => new Date(txn.tranDate) >= startDate);
    }
    if (filters.endDate) {
      const endDate = new Date(filters.endDate);
      filtered = filtered.filter(txn => new Date(txn.tranDate) <= endDate);
    }
    
    // Apply employee filter
    if (filters.employee) {
      filtered = filtered.filter(txn => 
        txn.empCode === filters.employee || txn.empName === filters.employee
      );
    }
    
    return filtered;
  }, [data?.transactions, metricType, filters]);

  // Sort transactions
  const sortedTransactions = useMemo(() => {
    const sorted = [...filteredTransactions];
    
    sorted.sort((a, b) => {
      let aVal: any = a[sortConfig.key];
      let bVal: any = b[sortConfig.key];
      
      // Handle dates
      if (sortConfig.key === 'tranDate') {
        aVal = new Date(aVal).getTime();
        bVal = new Date(bVal).getTime();
      }
      
      // Handle nulls
      if (aVal == null) return 1;
      if (bVal == null) return -1;
      
      // Compare
      if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
    
    return sorted;
  }, [filteredTransactions, sortConfig]);

  // Calculate summary
  const summary = useMemo(() => {
    return {
      count: sortedTransactions.length,
      totalAmount: sortedTransactions.reduce((sum, txn) => sum + (txn.amount || 0), 0),
      totalCost: sortedTransactions.reduce((sum, txn) => sum + txn.cost, 0),
      totalHours: sortedTransactions.reduce((sum, txn) => sum + txn.hour, 0),
    };
  }, [sortedTransactions]);

  // Get unique employees for filter dropdown
  const uniqueEmployees = useMemo(() => {
    if (!data?.transactions) return [];
    const employees = new Map<string, string>();
    data.transactions.forEach(txn => {
      if (txn.empCode && txn.empName) {
        employees.set(txn.empCode, txn.empName);
      }
    });
    return Array.from(employees.entries()).map(([code, name]) => ({ code, name }));
  }, [data?.transactions]);

  const handleSort = (key: SortKey) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  const handleClearFilters = () => {
    setFilters({
      startDate: '',
      endDate: '',
      employee: '',
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-ZA', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const getSortIcon = (key: SortKey) => {
    if (sortConfig.key !== key) return <ArrowUpDown className="w-4 h-4 opacity-50" />;
    return sortConfig.direction === 'asc' 
      ? <ArrowUp className="w-4 h-4" />
      : <ArrowDown className="w-4 h-4" />;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div 
          className="relative w-full max-w-6xl bg-white rounded-lg shadow-corporate-lg"
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="bg-gradient-primary-horizontal px-6 py-4 rounded-t-lg">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-white">{metricLabel}</h2>
                <p className="text-sm text-white/90 mt-1">
                  Total Value: {formatCurrency(metricValue)}
                </p>
              </div>
              <button
                onClick={onClose}
                className="text-white hover:bg-white/20 rounded-lg p-2 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
          </div>

          {/* Filters */}
          <div className="px-6 py-4 border-b border-forvis-gray-200 bg-forvis-gray-50">
            <div className="flex items-end gap-4">
              <div className="flex-1">
                <Input
                  type="date"
                  label="Start Date"
                  value={filters.startDate}
                  onChange={e => setFilters(prev => ({ ...prev, startDate: e.target.value }))}
                />
              </div>
              <div className="flex-1">
                <Input
                  type="date"
                  label="End Date"
                  value={filters.endDate}
                  onChange={e => setFilters(prev => ({ ...prev, endDate: e.target.value }))}
                />
              </div>
              <div className="flex-1">
                <Input
                  variant="select"
                  label="Employee"
                  value={filters.employee}
                  onChange={e => setFilters(prev => ({ ...prev, employee: e.target.value }))}
                  options={[
                    { value: '', label: 'All Employees' },
                    ...uniqueEmployees.map(emp => ({
                      value: emp.code,
                      label: emp.name
                    }))
                  ]}
                />
              </div>
              <button
                onClick={handleClearFilters}
                className="px-4 py-2 text-sm font-medium text-forvis-gray-700 hover:bg-forvis-gray-200 rounded-lg transition-colors"
              >
                Clear
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="px-6 py-4">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-forvis-blue-600"></div>
              </div>
            ) : error ? (
              <div className="text-center py-12">
                <p className="text-red-600">Failed to load transactions</p>
              </div>
            ) : sortedTransactions.length === 0 ? (
              <div className="text-center py-12">
                <Filter className="w-12 h-12 mx-auto text-forvis-gray-400 mb-3" />
                <p className="text-forvis-gray-600">No transactions found</p>
                <p className="text-sm text-forvis-gray-500 mt-1">Try adjusting your filters</p>
              </div>
            ) : (
              <div 
                className="overflow-auto" 
                style={{ maxHeight: '500px' }}
              >
                <table className="w-full">
                  <thead className="sticky top-0 z-10">
                    <tr className="bg-gradient-primary-horizontal text-left text-white text-sm">
                      <th 
                        className="px-4 py-3 cursor-pointer hover:bg-white/10"
                        onClick={() => handleSort('tranDate')}
                      >
                        <div className="flex items-center gap-2">
                          Date {getSortIcon('tranDate')}
                        </div>
                      </th>
                      <th 
                        className="px-4 py-3 cursor-pointer hover:bg-white/10"
                        onClick={() => handleSort('tranType')}
                      >
                        <div className="flex items-center gap-2">
                          Type {getSortIcon('tranType')}
                        </div>
                      </th>
                      <th 
                        className="px-4 py-3 cursor-pointer hover:bg-white/10"
                        onClick={() => handleSort('empName')}
                      >
                        <div className="flex items-center gap-2">
                          Employee {getSortIcon('empName')}
                        </div>
                      </th>
                      <th 
                        className="px-4 py-3 text-right cursor-pointer hover:bg-white/10"
                        onClick={() => handleSort('hour')}
                      >
                        <div className="flex items-center justify-end gap-2">
                          Hours {getSortIcon('hour')}
                        </div>
                      </th>
                      <th 
                        className="px-4 py-3 text-right cursor-pointer hover:bg-white/10"
                        onClick={() => handleSort('amount')}
                      >
                        <div className="flex items-center justify-end gap-2">
                          Amount {getSortIcon('amount')}
                        </div>
                      </th>
                      <th 
                        className="px-4 py-3 text-right cursor-pointer hover:bg-white/10"
                        onClick={() => handleSort('cost')}
                      >
                        <div className="flex items-center justify-end gap-2">
                          Cost {getSortIcon('cost')}
                        </div>
                      </th>
                      <th className="px-4 py-3">Ref</th>
                      <th className="px-4 py-3">Narration</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedTransactions.map((txn, index) => (
                      <tr
                        key={txn.id}
                        className={`text-sm hover:bg-forvis-blue-50 transition-colors ${
                          index % 2 === 0 ? 'bg-white' : 'bg-forvis-gray-50'
                        }`}
                      >
                        <td className="px-4 py-3 whitespace-nowrap">{formatDate(txn.tranDate)}</td>
                        <td className="px-4 py-3">{txn.tranType}</td>
                        <td className="px-4 py-3">{txn.empName || 'N/A'}</td>
                        <td className="px-4 py-3 text-right tabular-nums">
                          {txn.hour.toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums">
                          {txn.amount != null ? formatCurrency(txn.amount) : 'N/A'}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums">
                          {formatCurrency(txn.cost)}
                        </td>
                        <td className="px-4 py-3">{txn.ref || '-'}</td>
                        <td className="px-4 py-3 max-w-xs truncate" title={txn.narr || ''}>
                          {txn.narr || '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Summary Footer */}
          {!isLoading && !error && sortedTransactions.length > 0 && (
            <div className="bg-gradient-primary-horizontal px-6 py-4 rounded-b-lg">
              <div className="flex items-center justify-between text-white text-sm font-medium">
                <div className="flex items-center gap-6">
                  <span>{summary.count} Transactions</span>
                  <span>|</span>
                  <span>Total Amount: {formatCurrency(summary.totalAmount)}</span>
                  <span>|</span>
                  <span>Total Cost: {formatCurrency(summary.totalCost)}</span>
                  <span>|</span>
                  <span>Total Hours: {summary.totalHours.toFixed(2)}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


























