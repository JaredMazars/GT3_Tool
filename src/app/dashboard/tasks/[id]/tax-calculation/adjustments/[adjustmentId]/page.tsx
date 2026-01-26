'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { formatAmount } from '@/lib/utils/formatters';
import DocumentUploader from '@/components/shared/DocumentUploader';
import ExtractionResults from '@/components/shared/ExtractionResults';
import CalculationBreakdown from '@/components/shared/CalculationBreakdown';
import { ConfirmModal } from '@/components/shared/ConfirmModal';
import { 
  useTaxAdjustment, 
  useUpdateTaxAdjustment, 
  useUpdateAdjustmentDetails,
  useDeleteTaxAdjustment 
} from '@/hooks/tasks/useTaskData';

interface AdjustmentDetailProps {
  params: { id: string; adjustmentId: string };
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
  calculationDetails?: any;
  extractedData?: any;
  createdAt: string;
  updatedAt: string;
  project: {
    id: number;
    name: string;
  };
  documents: AdjustmentDocument[];
}

interface AdjustmentDocument {
  id: number;
  fileName: string;
  fileType: string;
  fileSize: number;
  extractionStatus: string;
  extractedData?: any;
  createdAt: string;
}

export default function AdjustmentDetailPage({ params }: AdjustmentDetailProps) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
  
  // React Query hooks
  const { data: adjustment, isLoading, error: queryError, refetch } = useTaxAdjustment(params.id, params.adjustmentId);
  const updateStatus = useUpdateTaxAdjustment(params.id);
  const updateDetails = useUpdateAdjustmentDetails(params.id, params.adjustmentId);
  const deleteAdjustment = useDeleteTaxAdjustment(params.id);

  // Form state
  const [formData, setFormData] = useState({
    type: '',
    description: '',
    amount: 0,
    sarsSection: '',
    notes: '',
  });

  // Update form data when adjustment loads
  useEffect(() => {
    if (adjustment) {
      setFormData({
        type: adjustment.type,
        description: adjustment.description,
        amount: adjustment.amount,
        sarsSection: adjustment.sarsSection || '',
        notes: adjustment.notes || '',
      });
    }
  }, [adjustment]);

  // Set error from query if it exists
  useEffect(() => {
    if (queryError) {
      setError(queryError instanceof Error ? queryError.message : 'An error occurred');
    }
  }, [queryError]);

  const handleSave = async () => {
    try {
      await updateDetails.mutateAsync({
        ...formData,
        status: 'MODIFIED',
      });
      setIsEditing(false);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    try {
      await updateStatus.mutateAsync({ 
        adjustmentId: parseInt(params.adjustmentId), 
        status: newStatus 
      });
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update status');
    }
  };

  const handleDelete = async () => {
    setConfirmModal({
      isOpen: true,
      title: 'Delete Tax Adjustment',
      message: 'Are you sure you want to delete this adjustment? This action cannot be undone.',
      variant: 'danger',
      onConfirm: async () => {
        try {
          await deleteAdjustment.mutateAsync(parseInt(params.adjustmentId));
          router.push(`/dashboard/tasks/${params.id}?tab=tax-calculation`);
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Failed to delete');
        } finally {
          setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        }
      },
    });
  };

  const handleDocumentUpload = async () => {
    await refetch();
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-forvis-blue-600"></div>
      </div>
    );
  }

  if (!adjustment || error) {
    return (
      <div className="bg-red-50 border-2 border-red-300 rounded-lg p-4 shadow-corporate">
        <p className="text-sm text-red-600 font-medium">{error || 'Adjustment not found'}</p>
      </div>
    );
  }

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
        <div>
          <button
            onClick={() => router.push(`/dashboard/tasks/${params.id}?tab=tax-calculation`)}
            className="text-forvis-blue-600 hover:text-forvis-blue-800 mb-1 flex items-center gap-1 text-sm font-medium transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Tax Calculation
          </button>
          <h1 className="text-2xl font-bold text-forvis-gray-900">
            Tax Adjustment Details
          </h1>
          <p className="text-forvis-gray-600 text-sm mt-0.5">
            Task: {adjustment.project.name}
          </p>
        </div>

        <div className="flex gap-2">
          {!isEditing && (
            <>
              <button
                onClick={() => setIsEditing(true)}
                className="px-4 py-2 text-sm font-semibold text-white rounded-lg shadow-corporate hover:shadow-corporate-md transition-all"
                style={{ background: 'linear-gradient(to right, #2E5AAC, #25488A)' }}
              >
                Edit
              </button>
              <button
                onClick={handleDelete}
                className="px-4 py-2 text-sm font-semibold bg-red-600 text-white rounded-lg hover:bg-red-700 shadow-corporate hover:shadow-corporate-md transition-all"
              >
                Delete
              </button>
            </>
          )}
        </div>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 border-2 border-red-300 rounded-lg p-4 shadow-corporate">
          <p className="text-sm text-red-600 font-medium">{error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-4">
          {/* Details Card */}
          <div className="bg-white border-2 rounded-lg shadow-corporate p-5" style={{ borderColor: '#5B93D7' }}>
            <h2 className="text-lg font-bold mb-4 text-forvis-gray-900">Adjustment Details</h2>

            {isEditing ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-forvis-gray-700 mb-2">
                    Type
                  </label>
                  <select
                    value={formData.type}
                    onChange={(e) =>
                      setFormData({ ...formData, type: e.target.value })
                    }
                    className="w-full px-4 py-2.5 bg-white text-forvis-gray-900 border-2 border-forvis-blue-200 rounded-lg focus:border-forvis-blue-500 focus:ring-2 focus:ring-forvis-blue-200 transition-colors"
                  >
                    <option value="DEBIT">Debit (Add Back)</option>
                    <option value="CREDIT">Credit (Deduct)</option>
                    <option value="ALLOWANCE">Allowance</option>
                    <option value="RECOUPMENT">Recoupment</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-forvis-gray-700 mb-2">
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    rows={3}
                    className="w-full px-4 py-2.5 bg-white text-forvis-gray-900 border-2 border-forvis-blue-200 rounded-lg focus:border-forvis-blue-500 focus:ring-2 focus:ring-forvis-blue-200 transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-forvis-gray-700 mb-2">
                    Amount
                  </label>
                  <input
                    type="number"
                    value={formData.amount}
                    onChange={(e) =>
                      setFormData({ ...formData, amount: parseFloat(e.target.value) })
                    }
                    className="w-full px-4 py-2.5 bg-white text-forvis-gray-900 border-2 border-forvis-blue-200 rounded-lg focus:border-forvis-blue-500 focus:ring-2 focus:ring-forvis-blue-200 transition-colors font-mono"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-forvis-gray-700 mb-2">
                    SARS Section
                  </label>
                  <input
                    type="text"
                    value={formData.sarsSection}
                    onChange={(e) =>
                      setFormData({ ...formData, sarsSection: e.target.value })
                    }
                    placeholder="e.g., s23(g)"
                    className="w-full px-4 py-2.5 bg-white text-forvis-gray-900 border-2 border-forvis-blue-200 rounded-lg focus:border-forvis-blue-500 focus:ring-2 focus:ring-forvis-blue-200 transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-forvis-gray-700 mb-2">
                    Notes / Reasoning
                  </label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) =>
                      setFormData({ ...formData, notes: e.target.value })
                    }
                    rows={4}
                    className="w-full px-4 py-2.5 bg-white text-forvis-gray-900 border-2 border-forvis-blue-200 rounded-lg focus:border-forvis-blue-500 focus:ring-2 focus:ring-forvis-blue-200 transition-colors"
                  />
                </div>

                <div className="flex gap-3 pt-4 border-t-2 border-forvis-blue-100">
                  <button
                    onClick={handleSave}
                    disabled={updateDetails.isPending}
                    className="px-6 py-2.5 text-white rounded-lg font-semibold shadow-corporate hover:shadow-corporate-md disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
                    style={{ background: updateDetails.isPending ? '#9CA3AF' : 'linear-gradient(to right, #2E5AAC, #25488A)' }}
                  >
                    {updateDetails.isPending ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        Saving...
                      </>
                    ) : (
                      'Save Changes'
                    )}
                  </button>
                  <button
                    onClick={() => setIsEditing(false)}
                    disabled={updateDetails.isPending}
                    className="px-6 py-2.5 bg-forvis-gray-200 text-forvis-gray-700 rounded-lg hover:bg-forvis-gray-300 font-semibold shadow-corporate hover:shadow-corporate-md transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="bg-forvis-blue-50 rounded-lg p-3 border-2 border-forvis-blue-200">
                  <span className="text-xs font-semibold text-forvis-blue-700 uppercase tracking-wide">Type</span>
                  <p className="font-bold text-forvis-gray-900 mt-1">{adjustment.type}</p>
                </div>
                <div>
                  <span className="text-xs font-semibold text-forvis-gray-600 uppercase tracking-wide">Description</span>
                  <p className="font-medium text-forvis-gray-900 mt-1">{adjustment.description}</p>
                </div>
              <div className="bg-forvis-blue-50 rounded-lg p-3 border-2 border-forvis-blue-200">
                <span className="text-xs font-semibold text-forvis-blue-700 uppercase tracking-wide">Amount</span>
                <p className="text-2xl font-bold text-forvis-gray-900 mt-1 font-mono">{formatAmount(adjustment.amount)}</p>
              </div>
                {adjustment.sarsSection && (
                  <div>
                    <span className="text-xs font-semibold text-forvis-gray-600 uppercase tracking-wide">SARS Section</span>
                    <p className="font-medium mt-1 inline-flex items-center px-3 py-1 rounded-full bg-forvis-blue-100 text-forvis-blue-800 border border-forvis-blue-200">
                      {adjustment.sarsSection}
                    </p>
                  </div>
                )}
                {adjustment.notes && (
                  <div>
                    <span className="text-xs font-semibold text-forvis-gray-600 uppercase tracking-wide">Notes / Reasoning</span>
                    <p className="text-forvis-gray-800 mt-1 leading-relaxed">{adjustment.notes}</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Calculation Breakdown */}
          {adjustment.calculationDetails && (
            <CalculationBreakdown
              calculationDetails={adjustment.calculationDetails}
              amount={adjustment.amount}
            />
          )}

          {/* Document Upload */}
          <div className="bg-white border-2 rounded-lg shadow-corporate p-5" style={{ borderColor: '#5B93D7' }}>
            <h2 className="text-lg font-bold mb-4 text-forvis-gray-900">Supporting Documents</h2>
            <DocumentUploader
              taskId={parseInt(params.id)}
              adjustmentId={parseInt(params.adjustmentId)}
              onUploadComplete={handleDocumentUpload}
              onUploadError={(error) => setError(error)}
            />

            {/* Documents List */}
            {adjustment.documents.length > 0 && (
              <div className="mt-6 space-y-3">
                <h3 className="text-sm font-bold text-forvis-gray-900 uppercase tracking-wide">Uploaded Documents</h3>
                {adjustment.documents.map((doc: AdjustmentDocument) => (
                  <div key={doc.id} className="border-2 border-forvis-blue-200 rounded-lg p-4 bg-white shadow-corporate hover:shadow-corporate-md transition-shadow">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <p className="font-semibold text-forvis-gray-900">{doc.fileName}</p>
                        <p className="text-xs text-forvis-gray-600 mt-1">
                          {(doc.fileSize / 1024).toFixed(2)} KB • {doc.fileType}
                        </p>
                      </div>
                      <span
                        className={`text-xs px-3 py-1 rounded-full font-semibold border-2 ${
                          doc.extractionStatus === 'COMPLETED'
                            ? 'bg-green-50 text-green-700 border-green-300'
                            : doc.extractionStatus === 'FAILED'
                            ? 'bg-red-50 text-red-700 border-red-300'
                            : doc.extractionStatus === 'PROCESSING'
                            ? 'bg-forvis-blue-50 text-forvis-blue-700 border-forvis-blue-300'
                            : 'bg-forvis-gray-50 text-forvis-gray-700 border-forvis-gray-300'
                        }`}
                      >
                        {doc.extractionStatus}
                      </span>
                    </div>

                    {doc.extractedData && (
                      <ExtractionResults
                        extractedData={doc.extractedData}
                        fileName={doc.fileName}
                      />
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Status Card */}
          <div className="bg-white border-2 rounded-lg shadow-corporate p-5" style={{ borderColor: '#5B93D7' }}>
            <h2 className="text-sm font-bold mb-4 text-forvis-gray-900 uppercase tracking-wide">Status</h2>
            <div className="space-y-2">
              <button
                onClick={() => handleStatusChange('SUGGESTED')}
                disabled={updateStatus.isPending}
                className={`w-full px-4 py-2.5 rounded-lg text-sm font-semibold transition-all shadow-sm hover:shadow-corporate disabled:opacity-50 disabled:cursor-not-allowed ${
                  adjustment.status === 'SUGGESTED'
                    ? 'bg-forvis-blue-100 text-forvis-blue-800 border-2 border-forvis-blue-400'
                    : 'bg-forvis-gray-50 text-forvis-gray-700 hover:bg-forvis-gray-100 border-2 border-forvis-gray-200'
                }`}
              >
                Suggested
              </button>
              <button
                onClick={() => handleStatusChange('APPROVED')}
                disabled={updateStatus.isPending}
                className={`w-full px-4 py-2.5 rounded-lg text-sm font-semibold transition-all shadow-sm hover:shadow-corporate disabled:opacity-50 disabled:cursor-not-allowed ${
                  adjustment.status === 'APPROVED'
                    ? 'bg-green-100 text-green-800 border-2 border-green-400'
                    : 'bg-forvis-gray-50 text-forvis-gray-700 hover:bg-forvis-gray-100 border-2 border-forvis-gray-200'
                }`}
              >
                Approved
              </button>
              <button
                onClick={() => handleStatusChange('MODIFIED')}
                disabled={updateStatus.isPending}
                className={`w-full px-4 py-2.5 rounded-lg text-sm font-semibold transition-all shadow-sm hover:shadow-corporate disabled:opacity-50 disabled:cursor-not-allowed ${
                  adjustment.status === 'MODIFIED'
                    ? 'bg-forvis-blue-100 text-forvis-blue-800 border-2 border-forvis-blue-400'
                    : 'bg-forvis-gray-50 text-forvis-gray-700 hover:bg-forvis-gray-100 border-2 border-forvis-gray-200'
                }`}
              >
                Modified
              </button>
              <button
                onClick={() => handleStatusChange('REJECTED')}
                disabled={updateStatus.isPending}
                className={`w-full px-4 py-2.5 rounded-lg text-sm font-semibold transition-all shadow-sm hover:shadow-corporate disabled:opacity-50 disabled:cursor-not-allowed ${
                  adjustment.status === 'REJECTED'
                    ? 'bg-red-100 text-red-800 border-2 border-red-400'
                    : 'bg-forvis-gray-50 text-forvis-gray-700 hover:bg-forvis-gray-100 border-2 border-forvis-gray-200'
                }`}
              >
                Rejected
              </button>
            </div>
          </div>

          {/* Metadata */}
          <div className="bg-white border-2 rounded-lg shadow-corporate p-5" style={{ borderColor: '#5B93D7' }}>
            <h2 className="text-sm font-bold mb-4 text-forvis-gray-900 uppercase tracking-wide">Metadata</h2>
            <div className="space-y-4 text-sm">
              {adjustment.confidenceScore && (
                <div className="pb-3 border-b border-forvis-blue-100">
                  <span className="text-xs font-semibold text-forvis-gray-600 uppercase tracking-wide">AI Confidence</span>
                  <div className="mt-2 flex items-center gap-2">
                    <div className="flex-1 bg-forvis-gray-200 rounded-full h-2">
                      <div 
                        className="h-2 rounded-full transition-all"
                        style={{ 
                          width: `${Math.round(adjustment.confidenceScore * 100)}%`,
                          background: 'linear-gradient(to right, #2E5AAC, #5B93D7)'
                        }}
                      ></div>
                    </div>
                    <span className="font-bold text-forvis-blue-900">
                      {Math.round(adjustment.confidenceScore * 100)}%
                    </span>
                  </div>
                </div>
              )}
              <div>
                <span className="text-xs font-semibold text-forvis-gray-600 uppercase tracking-wide">Created</span>
                <p className="font-medium text-forvis-gray-900 mt-1">
                  {new Date(adjustment.createdAt).toLocaleDateString()}
                </p>
              </div>
              <div>
                <span className="text-xs font-semibold text-forvis-gray-600 uppercase tracking-wide">Last Updated</span>
                <p className="font-medium text-forvis-gray-900 mt-1">
                  {new Date(adjustment.updatedAt).toLocaleDateString()}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

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
