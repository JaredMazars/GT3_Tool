'use client';

import { useState, useEffect } from 'react';
import { X, ChevronDown, ChevronRight, ExternalLink } from 'lucide-react';
import { useClientDebtorDetails } from '@/hooks/clients/useClientDebtorDetails';
import { InvoiceDetail } from '@/lib/services/analytics/debtorAggregation';
import Link from 'next/link';

interface InvoiceDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  clientId: string;
  initialBucket: 'current' | 'days31_60' | 'days61_90' | 'days91_120' | 'days120Plus';
  clientName?: string;
}

const bucketLabels = {
  current: 'Current (0-30 days)',
  days31_60: '31-60 days',
  days61_90: '61-90 days',
  days91_120: '91-120 days',
  days120Plus: '120+ days',
};

export function InvoiceDetailsModal({
  isOpen,
  onClose,
  clientId,
  initialBucket,
  clientName,
}: InvoiceDetailsModalProps) {
  const [activeTab, setActiveTab] = useState<keyof typeof bucketLabels>(initialBucket);
  const [expandedInvoices, setExpandedInvoices] = useState<Set<string>>(new Set());

  const { data, isLoading, error } = useClientDebtorDetails(clientId, { enabled: isOpen });

  // Update active tab when initialBucket changes (when user clicks different aging bucket)
  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialBucket);
    }
  }, [initialBucket, isOpen]);

  if (!isOpen) return null;

  const toggleInvoice = (invoiceNumber: string) => {
    setExpandedInvoices((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(invoiceNumber)) {
        newSet.delete(invoiceNumber);
      } else {
        newSet.add(invoiceNumber);
      }
      return newSet;
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const formatDate = (date: Date | string) => {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return new Intl.DateTimeFormat('en-ZA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(dateObj);
  };

  const currentInvoices = data?.invoicesByBucket[activeTab] || [];
  const totalAmount = currentInvoices.reduce((sum, inv) => sum + inv.netBalance, 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <div
        className="bg-white rounded-lg shadow-corporate-lg max-w-6xl w-full max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 rounded-t-lg" style={{ background: 'linear-gradient(135deg, #5B93D7 0%, #2E5AAC 50%, #1C3667 100%)' }}>
          <div>
            <h2 className="text-xl font-semibold text-white">Outstanding Invoices</h2>
            {clientName && (
              <p className="text-sm text-white/90 mt-1">{clientName}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-white/20 transition-colors"
            aria-label="Close modal"
          >
            <X className="h-6 w-6 text-white" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="border-b border-forvis-gray-200 px-6 pt-4">
          <nav className="flex flex-wrap gap-2 -mb-px">
            {(Object.entries(bucketLabels) as [keyof typeof bucketLabels, string][]).map(([bucket, label]) => {
              const count = data?.invoicesByBucket[bucket]?.length || 0;
              return (
                <button
                  key={bucket}
                  onClick={() => setActiveTab(bucket)}
                  className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === bucket
                      ? 'border-forvis-blue-600 text-forvis-blue-600'
                      : 'border-transparent text-forvis-gray-600 hover:text-forvis-gray-900 hover:border-forvis-gray-300'
                  }`}
                >
                  {label} ({count})
                </button>
              );
            })}
          </nav>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {isLoading && (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-forvis-blue-200 border-t-forvis-blue-600" />
            </div>
          )}

          {error && (
            <div className="text-center py-12">
              <p className="text-red-600 font-medium">Error loading invoice details</p>
              <p className="text-sm text-forvis-gray-600 mt-2">
                {error instanceof Error ? error.message : 'An error occurred'}
              </p>
            </div>
          )}

          {!isLoading && !error && currentInvoices.length === 0 && (
            <div className="text-center py-12">
              <p className="text-forvis-gray-600 font-medium">No invoices in this aging bucket</p>
            </div>
          )}

          {!isLoading && !error && currentInvoices.length > 0 && (
            <div className="space-y-2">
              {/* Table Header */}
              <div className="grid grid-cols-12 gap-4 px-4 py-2 bg-forvis-gray-100 border border-forvis-gray-200 rounded-lg font-semibold text-xs text-forvis-gray-700 uppercase tracking-wider">
                <div className="col-span-2">Invoice</div>
                <div className="col-span-2">Date</div>
                <div className="col-span-2 text-right">Original</div>
                <div className="col-span-2 text-right">Payments</div>
                <div className="col-span-2 text-right">Balance</div>
                <div className="col-span-1 text-center">Days</div>
                <div className="col-span-1">Service</div>
              </div>
              
              <p className="text-xs text-forvis-gray-500 px-4 mt-2 italic">
                Click on any invoice row to view detailed payment history and narrations
              </p>

              {currentInvoices.map((invoice, index) => (
                <div key={invoice.invoiceNumber} className="border border-forvis-gray-200 rounded-lg overflow-hidden">
                  {/* Invoice Summary Row - Clickable */}
                  <div
                    onClick={() => toggleInvoice(invoice.invoiceNumber)}
                    className={`grid grid-cols-12 gap-4 p-4 cursor-pointer transition-colors hover:bg-forvis-blue-50 ${
                      index % 2 === 0 ? 'bg-white' : 'bg-forvis-gray-50'
                    } ${expandedInvoices.has(invoice.invoiceNumber) ? 'bg-forvis-blue-50' : ''}`}
                  >
                    <div className="col-span-2 flex items-center gap-2">
                      <div className="flex-shrink-0">
                        {expandedInvoices.has(invoice.invoiceNumber) ? (
                          <ChevronDown className="h-4 w-4 text-forvis-blue-600" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-forvis-gray-600" />
                        )}
                      </div>
                      <span className="font-medium text-forvis-blue-600 text-sm truncate">
                        {invoice.invoiceNumber}
                      </span>
                    </div>
                    <div className="col-span-2 text-sm text-forvis-gray-700">
                      {formatDate(invoice.invoiceDate)}
                    </div>
                    <div className="col-span-2 text-sm text-forvis-gray-700 text-right">
                      {formatCurrency(invoice.originalAmount)}
                    </div>
                    <div className="col-span-2 text-sm text-green-700 text-right">
                      {formatCurrency(invoice.paymentsReceived)}
                    </div>
                    <div className="col-span-2 text-sm font-bold text-forvis-blue-600 text-right">
                      {formatCurrency(invoice.netBalance)}
                    </div>
                    <div className="col-span-1 text-sm text-forvis-gray-700 text-center">
                      {invoice.daysOutstanding}
                    </div>
                    <div className="col-span-1 text-xs text-forvis-gray-600 truncate">
                      {invoice.servLineName || invoice.servLineCode}
                    </div>
                  </div>

                  {/* Expanded Payment History */}
                  {expandedInvoices.has(invoice.invoiceNumber) && (
                    <div className="border-t border-forvis-gray-200 bg-forvis-gray-50 p-4">
                      <h4 className="text-sm font-semibold text-forvis-gray-900 mb-3">Payment History & Transaction Details</h4>
                      {invoice.paymentHistory.length === 0 ? (
                        <p className="text-sm text-forvis-gray-600">No payment transactions</p>
                      ) : (
                        <div className="space-y-2">
                          {invoice.paymentHistory.map((payment, pIdx) => (
                            <div
                              key={pIdx}
                              className="bg-white rounded-lg border border-forvis-gray-200 p-3"
                            >
                              {/* Transaction Summary Row */}
                              <div className="grid grid-cols-12 gap-4 text-sm">
                                <div className="col-span-3 text-forvis-gray-700">
                                  {formatDate(payment.date)}
                                </div>
                                <div className={`col-span-3 font-medium ${payment.amount >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                                  {formatCurrency(payment.amount)}
                                </div>
                                <div className="col-span-3 text-forvis-gray-600 text-xs">
                                  {payment.entryType || 'N/A'}
                                </div>
                                <div className="col-span-3 text-forvis-gray-600 text-xs truncate">
                                  {payment.reference || '-'}
                                </div>
                              </div>
                              
                              {/* Narration */}
                              {payment.narration && (
                                <div className="mt-2 pt-2 border-t border-forvis-gray-100">
                                  <p className="text-xs font-medium text-forvis-gray-700 mb-1">Narration:</p>
                                  <p className="text-xs text-forvis-gray-600 leading-relaxed">
                                    {payment.narration}
                                  </p>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {!isLoading && !error && currentInvoices.length > 0 && (
          <div className="border-t border-forvis-gray-200 px-6 py-4 bg-forvis-gray-50">
            <div className="flex items-center justify-between">
              <div className="text-sm text-forvis-gray-700">
                <span className="font-medium">{currentInvoices.length}</span> invoice{currentInvoices.length !== 1 ? 's' : ''}
              </div>
              <div className="text-sm">
                <span className="text-forvis-gray-700 mr-2">Total Outstanding:</span>
                <span className="text-lg font-bold text-forvis-blue-600">{formatCurrency(totalAmount)}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

