'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { formatAmount } from '@/lib/formatters';

interface AdjustmentsListProps {
  params: { id: string };
}

interface TaxAdjustment {
  id: number;
  type: string;
  description: string;
  amount: number;
  status: string;
  sarsSection?: string;
  confidenceScore?: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

type StatusFilter = 'ALL' | 'SUGGESTED' | 'APPROVED' | 'MODIFIED' | 'REJECTED' | 'ARCHIVED';

export default function AdjustmentsListPage({ params }: AdjustmentsListProps) {
  const router = useRouter();
  const [adjustments, setAdjustments] = useState<TaxAdjustment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchAdjustments();
  }, [params.id]);

  const fetchAdjustments = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/projects/${params.id}/tax-adjustments`);

      if (!response.ok) throw new Error('Failed to fetch adjustments');

      const result = await response.json();
      const data = result.success ? result.data : result;
      setAdjustments(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleStatusChange = async (adjustmentId: number, newStatus: string) => {
    try {
      const response = await fetch(
        `/api/projects/${params.id}/tax-adjustments/${adjustmentId}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: newStatus }),
        }
      );

      if (!response.ok) throw new Error('Failed to update status');

      await fetchAdjustments();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update status');
    }
  };

  const handleDelete = async (adjustmentId: number) => {
    if (!confirm('Are you sure you want to delete this adjustment?')) return;

    try {
      const response = await fetch(
        `/api/projects/${params.id}/tax-adjustments/${adjustmentId}`,
        {
          method: 'DELETE',
        }
      );

      if (!response.ok) throw new Error('Failed to delete adjustment');

      await fetchAdjustments();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete');
    }
  };

  // Filter adjustments
  const filteredAdjustments = adjustments.filter((adj) => {
    const matchesStatus = statusFilter === 'ALL' || adj.status === statusFilter;
    const matchesSearch = 
      adj.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      adj.sarsSection?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      adj.notes?.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesStatus && matchesSearch;
  });

  // Calculate statistics
  const stats = {
    total: adjustments.length,
    suggested: adjustments.filter(a => a.status === 'SUGGESTED').length,
    approved: adjustments.filter(a => a.status === 'APPROVED').length,
    modified: adjustments.filter(a => a.status === 'MODIFIED').length,
    rejected: adjustments.filter(a => a.status === 'REJECTED').length,
    archived: adjustments.filter(a => a.status === 'ARCHIVED').length,
  };

  const getStatusBadge = (status: string) => {
    const baseClasses = 'px-2 py-1 text-xs font-medium rounded-full';
    
    switch (status) {
      case 'SUGGESTED':
        return `${baseClasses} bg-yellow-100 text-yellow-800`;
      case 'APPROVED':
        return `${baseClasses} bg-green-100 text-green-800`;
      case 'MODIFIED':
        return `${baseClasses} bg-blue-100 text-blue-800`;
      case 'REJECTED':
        return `${baseClasses} bg-red-100 text-red-800`;
      case 'ARCHIVED':
        return `${baseClasses} bg-gray-100 text-gray-800`;
      default:
        return `${baseClasses} bg-gray-100 text-gray-600`;
    }
  };

  const getTypeBadge = (type: string) => {
    const baseClasses = 'px-2 py-1 text-xs font-medium rounded';
    
    switch (type) {
      case 'DEBIT':
        return `${baseClasses} bg-orange-100 text-orange-800`;
      case 'CREDIT':
        return `${baseClasses} bg-green-100 text-green-800`;
      case 'ALLOWANCE':
        return `${baseClasses} bg-blue-100 text-blue-800`;
      default:
        return `${baseClasses} bg-gray-100 text-gray-600`;
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
        <div>
          <button
            onClick={() => router.push(`/dashboard/projects/${params.id}?tab=tax-calculation`)}
            className="text-blue-600 hover:text-blue-800 mb-1 flex items-center gap-1 text-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Tax Calculation
          </button>
          <h1 className="text-xl font-bold text-gray-900">Tax Adjustments</h1>
          <p className="text-gray-600 text-sm mt-0.5">
            Manage all tax adjustments for this project
          </p>
        </div>
        <button
          onClick={() => router.push(`/dashboard/projects/${params.id}/tax-calculation/adjustments/new`)}
          className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 shadow-md"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Create New Adjustment
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        <button
          onClick={() => setStatusFilter('ALL')}
          className={`p-2 rounded-lg border-2 transition-all ${
            statusFilter === 'ALL'
              ? 'border-blue-500 bg-blue-50'
              : 'border-gray-200 bg-white hover:border-gray-300'
          }`}
        >
          <p className="text-xs text-gray-600 font-medium">Total</p>
          <p className="text-xl font-bold text-gray-900">{stats.total}</p>
        </button>
        <button
          onClick={() => setStatusFilter('SUGGESTED')}
          className={`p-2 rounded-lg border-2 transition-all ${
            statusFilter === 'SUGGESTED'
              ? 'border-yellow-500 bg-yellow-50'
              : 'border-gray-200 bg-white hover:border-gray-300'
          }`}
        >
          <p className="text-xs text-yellow-700 font-medium">Suggested</p>
          <p className="text-xl font-bold text-yellow-800">{stats.suggested}</p>
        </button>
        <button
          onClick={() => setStatusFilter('APPROVED')}
          className={`p-2 rounded-lg border-2 transition-all ${
            statusFilter === 'APPROVED'
              ? 'border-green-500 bg-green-50'
              : 'border-gray-200 bg-white hover:border-gray-300'
          }`}
        >
          <p className="text-xs text-green-700 font-medium">Approved</p>
          <p className="text-xl font-bold text-green-800">{stats.approved}</p>
        </button>
        <button
          onClick={() => setStatusFilter('MODIFIED')}
          className={`p-2 rounded-lg border-2 transition-all ${
            statusFilter === 'MODIFIED'
              ? 'border-blue-500 bg-blue-50'
              : 'border-gray-200 bg-white hover:border-gray-300'
          }`}
        >
          <p className="text-xs text-blue-700 font-medium">Modified</p>
          <p className="text-xl font-bold text-blue-800">{stats.modified}</p>
        </button>
        <button
          onClick={() => setStatusFilter('REJECTED')}
          className={`p-2 rounded-lg border-2 transition-all ${
            statusFilter === 'REJECTED'
              ? 'border-red-500 bg-red-50'
              : 'border-gray-200 bg-white hover:border-gray-300'
          }`}
        >
          <p className="text-xs text-red-700 font-medium">Rejected</p>
          <p className="text-xl font-bold text-red-800">{stats.rejected}</p>
        </button>
        <button
          onClick={() => setStatusFilter('ARCHIVED')}
          className={`p-2 rounded-lg border-2 transition-all ${
            statusFilter === 'ARCHIVED'
              ? 'border-gray-500 bg-gray-50'
              : 'border-gray-200 bg-white hover:border-gray-300'
          }`}
        >
          <p className="text-xs text-gray-700 font-medium">Archived</p>
          <p className="text-xl font-bold text-gray-800">{stats.archived}</p>
        </button>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <input
          type="text"
          placeholder="Search adjustments..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-3 py-2 pl-9 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
        <svg
          className="absolute left-3 top-2.5 w-4 h-4 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
      </div>

      {/* Adjustments List */}
      {filteredAdjustments.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-8 text-center">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
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
          <h3 className="mt-2 text-sm font-medium text-gray-900">No adjustments found</h3>
          <p className="mt-1 text-sm text-gray-500">
            {searchTerm || statusFilter !== 'ALL'
              ? 'Try adjusting your filters'
              : 'Get started by creating a new adjustment'}
          </p>
          {!searchTerm && statusFilter === 'ALL' && (
            <button
              onClick={() => router.push(`/dashboard/projects/${params.id}/tax-calculation/adjustments/new`)}
              className="mt-4 px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Create First Adjustment
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Description
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    SARS Section
                  </th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredAdjustments.map((adjustment) => (
                  <tr
                    key={adjustment.id}
                    className="hover:bg-gray-50 cursor-pointer"
                    onClick={() =>
                      router.push(
                        `/dashboard/projects/${params.id}/tax-calculation/adjustments/${adjustment.id}`
                    )
                  }
                  >
                    <td className="px-4 py-3">
                      <div className="text-sm font-medium text-gray-900">
                        {adjustment.description}
                      </div>
                      {adjustment.confidenceScore && (
                        <div className="text-xs text-gray-500 mt-0.5">
                          AI Confidence: {Math.round(adjustment.confidenceScore * 100)}%
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={getTypeBadge(adjustment.type)}>
                        {adjustment.type}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="text-sm font-semibold text-gray-900 tabular-nums">
                        {formatAmount(Math.abs(adjustment.amount))}
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={getStatusBadge(adjustment.status)}>
                        {adjustment.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="text-sm text-gray-600">
                        {adjustment.sarsSection || '-'}
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                        {adjustment.status === 'SUGGESTED' && (
                          <>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleStatusChange(adjustment.id, 'APPROVED');
                              }}
                              className="text-green-600 hover:text-green-900"
                              title="Approve"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleStatusChange(adjustment.id, 'REJECTED');
                              }}
                              className="text-red-600 hover:text-red-900"
                              title="Reject"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            router.push(
                              `/dashboard/projects/${params.id}/tax-calculation/adjustments/${adjustment.id}`
                            );
                          }}
                          className="text-blue-600 hover:text-blue-900"
                          title="Edit"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                            />
                          </svg>
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(adjustment.id);
                          }}
                          className="text-gray-400 hover:text-red-600"
                          title="Delete"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                            />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}

