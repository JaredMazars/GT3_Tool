'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { formatAmount } from '@/lib/utils/formatters';
import { ConfirmModal } from '@/components/shared/ConfirmModal';

interface AdjustmentsListProps {
  params: Promise<{ id: string }>;
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

export default function AdjustmentsListPage({ params }: { params: { id: string } }) {
  // Note: In client components, params is already resolved (not a Promise)
  const router = useRouter();
  const [adjustments, setAdjustments] = useState<TaxAdjustment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  // Modal state
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void | Promise<void>;
    variant?: 'danger' | 'warning' | 'info';
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  useEffect(() => {
    fetchAdjustments();
  }, [params.id]);

  const fetchAdjustments = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/tasks/${params.id}/tax-adjustments`);

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
        `/api/tasks/${params.id}/tax-adjustments/${adjustmentId}`,
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
    setConfirmModal({
      isOpen: true,
      title: 'Delete Tax Adjustment',
      message: 'Are you sure you want to delete this adjustment? This action cannot be undone.',
      variant: 'danger',
      onConfirm: async () => {
        try {
          const response = await fetch(
            `/api/tasks/${params.id}/tax-adjustments/${adjustmentId}`,
            {
              method: 'DELETE',
            }
          );

          if (!response.ok) throw new Error('Failed to delete adjustment');

          await fetchAdjustments();
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Failed to delete');
        } finally {
          setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        }
      },
    });
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
    const baseClasses = 'px-3 py-1.5 text-xs font-bold rounded-full border-2 inline-block';
    
    switch (status) {
      case 'SUGGESTED':
        return `${baseClasses}`;
      case 'APPROVED':
        return `${baseClasses}`;
      case 'MODIFIED':
        return `${baseClasses}`;
      case 'REJECTED':
        return `${baseClasses}`;
      case 'ARCHIVED':
        return `${baseClasses}`;
      default:
        return `${baseClasses}`;
    }
  };

  const getStatusBadgeStyle = (status: string) => {
    switch (status) {
      case 'SUGGESTED':
        return { backgroundColor: '#DBEAFE', borderColor: '#93C5FD', color: '#1E40AF' };
      case 'APPROVED':
        return { backgroundColor: '#D1FAE5', borderColor: '#6EE7B7', color: '#065F46' };
      case 'MODIFIED':
        return { backgroundColor: '#DBEAFE', borderColor: '#93C5FD', color: '#1E3A8A' };
      case 'REJECTED':
        return { backgroundColor: '#F3F4F6', borderColor: '#D1D5DB', color: '#4B5563' };
      case 'ARCHIVED':
        return { backgroundColor: '#F9FAFB', borderColor: '#E5E7EB', color: '#6B7280' };
      default:
        return { backgroundColor: '#F9FAFB', borderColor: '#E5E7EB', color: '#6B7280' };
    }
  };

  const getTypeBadge = (type: string) => {
    const baseClasses = 'px-3 py-1.5 text-xs font-bold rounded-lg border-2 inline-block';
    
    return baseClasses;
  };

  const getTypeBadgeStyle = (type: string) => {
    switch (type) {
      case 'DEBIT':
        return { backgroundColor: '#DBEAFE', borderColor: '#93C5FD', color: '#1E40AF' };
      case 'CREDIT':
        return { backgroundColor: '#DBEAFE', borderColor: '#93C5FD', color: '#1E3A8A' };
      case 'ALLOWANCE':
        return { backgroundColor: '#DBEAFE', borderColor: '#93C5FD', color: '#1E40AF' };
      case 'RECOUPMENT':
        return { backgroundColor: '#DBEAFE', borderColor: '#93C5FD', color: '#1E3A8A' };
      default:
        return { backgroundColor: '#F9FAFB', borderColor: '#E5E7EB', color: '#6B7280' };
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-forvis-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <button
              onClick={() => router.push(`/dashboard/tasks/${params.id}?tab=tax-calculation`)}
              className="mb-2 flex items-center gap-2 text-sm font-semibold transition-colors"
              style={{ color: '#2E5AAC' }}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to Tax Calculation
            </button>
            <h1 className="text-2xl font-bold text-gray-900">Manage Tax Adjustments</h1>
            <p className="text-gray-600 text-sm mt-1">
              Review, approve, and manage all tax adjustments for this project
            </p>
          </div>
          <button
            onClick={() => router.push(`/dashboard/tasks/${params.id}/tax-calculation/adjustments/new`)}
            className="px-6 py-2.5 text-sm font-bold text-white rounded-lg transition-all flex items-center gap-2 shadow-corporate hover:shadow-corporate-lg"
            style={{ background: 'linear-gradient(135deg, #5B93D7 0%, #2E5AAC 50%, #1C3667 100%)' }}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Create New Adjustment
          </button>
        </div>

      {error && (
        <div className="bg-red-50 border-2 border-red-300 rounded-lg p-4 shadow-corporate">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-sm font-medium text-red-800">{error}</p>
          </div>
        </div>
      )}

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        <button
          onClick={() => setStatusFilter('ALL')}
          className="p-5 rounded-lg border-2 transition-all shadow-corporate hover:shadow-corporate-lg text-center"
          style={{ 
            borderColor: statusFilter === 'ALL' ? '#2E5AAC' : '#E5E7EB',
            background: statusFilter === 'ALL' ? 'linear-gradient(135deg, #5B93D7 0%, #2E5AAC 50%, #1C3667 100%)' : '#FFFFFF'
          }}
        >
          <p className="text-xs font-bold uppercase tracking-wide mb-2" style={{ color: statusFilter === 'ALL' ? '#FFFFFF' : '#6B7280' }}>Total</p>
          <p className="text-3xl font-bold" style={{ color: statusFilter === 'ALL' ? '#FFFFFF' : '#1F2937' }}>{stats.total}</p>
        </button>
        <button
          onClick={() => setStatusFilter('SUGGESTED')}
          className="p-5 rounded-lg border-2 transition-all shadow-corporate hover:shadow-corporate-lg text-center"
          style={{ 
            borderColor: statusFilter === 'SUGGESTED' ? '#2E5AAC' : '#E5E7EB',
            background: statusFilter === 'SUGGESTED' ? 'linear-gradient(135deg, #5B93D7 0%, #2E5AAC 50%, #1C3667 100%)' : '#FFFFFF'
          }}
        >
          <p className="text-xs font-bold uppercase tracking-wide mb-2" style={{ color: statusFilter === 'SUGGESTED' ? '#FFFFFF' : '#2E5AAC' }}>Suggested</p>
          <p className="text-3xl font-bold" style={{ color: statusFilter === 'SUGGESTED' ? '#FFFFFF' : '#2E5AAC' }}>{stats.suggested}</p>
        </button>
        <button
          onClick={() => setStatusFilter('APPROVED')}
          className="p-5 rounded-lg border-2 transition-all shadow-corporate hover:shadow-corporate-lg text-center"
          style={{ 
            borderColor: statusFilter === 'APPROVED' ? '#059669' : '#E5E7EB',
            background: statusFilter === 'APPROVED' ? 'linear-gradient(135deg, #059669 0%, #047857 50%, #065F46 100%)' : '#FFFFFF'
          }}
        >
          <p className="text-xs font-bold uppercase tracking-wide mb-2" style={{ color: statusFilter === 'APPROVED' ? '#FFFFFF' : '#059669' }}>Approved</p>
          <p className="text-3xl font-bold" style={{ color: statusFilter === 'APPROVED' ? '#FFFFFF' : '#059669' }}>{stats.approved}</p>
        </button>
        <button
          onClick={() => setStatusFilter('MODIFIED')}
          className="p-5 rounded-lg border-2 transition-all shadow-corporate hover:shadow-corporate-lg text-center"
          style={{ 
            borderColor: statusFilter === 'MODIFIED' ? '#2E5AAC' : '#E5E7EB',
            background: statusFilter === 'MODIFIED' ? 'linear-gradient(135deg, #5B93D7 0%, #2E5AAC 50%, #1C3667 100%)' : '#FFFFFF'
          }}
        >
          <p className="text-xs font-bold uppercase tracking-wide mb-2" style={{ color: statusFilter === 'MODIFIED' ? '#FFFFFF' : '#2E5AAC' }}>Modified</p>
          <p className="text-3xl font-bold" style={{ color: statusFilter === 'MODIFIED' ? '#FFFFFF' : '#2E5AAC' }}>{stats.modified}</p>
        </button>
        <button
          onClick={() => setStatusFilter('REJECTED')}
          className="p-5 rounded-lg border-2 transition-all shadow-corporate hover:shadow-corporate-lg text-center"
          style={{ 
            borderColor: statusFilter === 'REJECTED' ? '#6B7280' : '#E5E7EB',
            background: statusFilter === 'REJECTED' ? 'linear-gradient(135deg, #9CA3AF 0%, #6B7280 50%, #4B5563 100%)' : '#FFFFFF'
          }}
        >
          <p className="text-xs font-bold uppercase tracking-wide mb-2" style={{ color: statusFilter === 'REJECTED' ? '#FFFFFF' : '#6B7280' }}>Rejected</p>
          <p className="text-3xl font-bold" style={{ color: statusFilter === 'REJECTED' ? '#FFFFFF' : '#6B7280' }}>{stats.rejected}</p>
        </button>
        <button
          onClick={() => setStatusFilter('ARCHIVED')}
          className="p-5 rounded-lg border-2 transition-all shadow-corporate hover:shadow-corporate-lg text-center"
          style={{ 
            borderColor: statusFilter === 'ARCHIVED' ? '#6B7280' : '#E5E7EB',
            background: statusFilter === 'ARCHIVED' ? 'linear-gradient(135deg, #9CA3AF 0%, #6B7280 50%, #4B5563 100%)' : '#FFFFFF'
          }}
        >
          <p className="text-xs font-bold uppercase tracking-wide mb-2" style={{ color: statusFilter === 'ARCHIVED' ? '#FFFFFF' : '#6B7280' }}>Archived</p>
          <p className="text-3xl font-bold" style={{ color: statusFilter === 'ARCHIVED' ? '#FFFFFF' : '#6B7280' }}>{stats.archived}</p>
        </button>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <input
          type="text"
          placeholder="Search by description, SARS section, or notes..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-4 py-3 pl-11 text-sm border-2 rounded-lg focus:outline-none focus:ring-2 transition-all shadow-sm focus:shadow-corporate border-forvis-gray-200 focus:ring-forvis-blue-500"
        />
        <svg
          className="absolute left-4 top-3.5 w-5 h-5"
          style={{ color: '#9CA3AF' }}
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
        <div className="bg-white border-2 rounded-lg shadow-corporate p-12 text-center" style={{ borderColor: '#E5E7EB' }}>
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full mb-4" style={{ backgroundColor: '#EFF6FF' }}>
            <svg
              className="w-8 h-8"
              style={{ color: '#2E5AAC' }}
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
          </div>
          <h3 className="text-lg font-bold text-gray-900">No adjustments found</h3>
          <p className="mt-2 text-sm text-gray-600">
            {searchTerm || statusFilter !== 'ALL'
              ? 'Try adjusting your filters or search terms'
              : 'Get started by creating your first tax adjustment'}
          </p>
          {!searchTerm && statusFilter === 'ALL' && (
            <button
              onClick={() => router.push(`/dashboard/tasks/${params.id}/tax-calculation/adjustments/new`)}
              className="mt-6 px-6 py-3 text-sm font-bold text-white rounded-lg transition-all shadow-corporate hover:shadow-corporate-lg flex items-center gap-2 mx-auto"
              style={{ background: 'linear-gradient(135deg, #5B93D7 0%, #2E5AAC 50%, #1C3667 100%)' }}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Create First Adjustment
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white border-2 rounded-lg shadow-corporate overflow-hidden" style={{ borderColor: '#5B93D7' }}>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y-2" style={{ borderColor: '#E5E7EB' }}>
              <thead style={{ background: 'linear-gradient(135deg, #5B93D7 0%, #2E5AAC 50%, #1C3667 100%)' }}>
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-bold text-white uppercase tracking-wider">
                    Description
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-white uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-white uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-white uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-white uppercase tracking-wider">
                    SARS Section
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-bold text-white uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y-2" style={{ borderColor: '#F3F4F6' }}>
                {filteredAdjustments.map((adjustment) => (
                  <tr
                    key={adjustment.id}
                    className="cursor-pointer transition-colors hover:bg-forvis-blue-50"
                    onClick={() =>
                      router.push(
                        `/dashboard/tasks/${params.id}/tax-calculation/adjustments/${adjustment.id}`
                    )
                  }
                  >
                    <td className="px-6 py-4">
                      <div className="text-sm font-semibold text-gray-900">
                        {adjustment.description}
                      </div>
                      {adjustment.confidenceScore && (
                        <div className="text-xs mt-1 font-medium flex items-center gap-1" style={{ color: '#2E5AAC' }}>
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                          </svg>
                          AI Confidence: {Math.round(adjustment.confidenceScore * 100)}%
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={getTypeBadge(adjustment.type)} style={getTypeBadgeStyle(adjustment.type)}>
                        {adjustment.type}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-bold text-gray-900 tabular-nums">
                        {formatAmount(Math.abs(adjustment.amount))}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={getStatusBadge(adjustment.status)} style={getStatusBadgeStyle(adjustment.status)}>
                        {adjustment.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-600 font-medium">
                        {adjustment.sarsSection || '-'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-3" onClick={(e) => e.stopPropagation()}>
                        {adjustment.status === 'SUGGESTED' && (
                          <>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleStatusChange(adjustment.id, 'APPROVED');
                              }}
                              className="p-1.5 rounded-lg transition-all hover:bg-green-100"
                              style={{ color: '#059669' }}
                              title="Approve"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleStatusChange(adjustment.id, 'REJECTED');
                              }}
                              className="p-1.5 rounded-lg transition-all hover:bg-gray-100"
                              style={{ color: '#6B7280' }}
                              title="Reject"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            router.push(
                              `/dashboard/tasks/${params.id}/tax-calculation/adjustments/${adjustment.id}`
                            );
                          }}
                          className="p-1.5 rounded-lg transition-all hover:bg-blue-100"
                          style={{ color: '#2E5AAC' }}
                          title="Edit"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                          className="p-1.5 rounded-lg transition-all hover:bg-red-100"
                          style={{ color: '#9CA3AF' }}
                          title="Delete"
                          onMouseEnter={(e) => e.currentTarget.style.color = '#DC2626'}
                          onMouseLeave={(e) => e.currentTarget.style.color = '#9CA3AF'}
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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

      {/* Modals */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.title}
        message={confirmModal.message}
        variant={confirmModal.variant}
      />
      </div>
    </div>
  );
}
