'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { formatAmount } from '@/lib/formatters';
import DocumentUploader from '@/components/DocumentUploader';
import ExtractionResults from '@/components/ExtractionResults';
import CalculationBreakdown from '@/components/CalculationBreakdown';

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
  const [adjustment, setAdjustment] = useState<TaxAdjustment | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    type: '',
    description: '',
    amount: 0,
    sarsSection: '',
    notes: '',
  });

  useEffect(() => {
    fetchAdjustment();
  }, [params.adjustmentId]);

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

  const fetchAdjustment = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(
        `/api/projects/${params.id}/tax-adjustments/${params.adjustmentId}`
      );

      if (!response.ok) throw new Error('Failed to fetch adjustment');

      const data = await response.json();
      setAdjustment(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      const response = await fetch(
        `/api/projects/${params.id}/tax-adjustments/${params.adjustmentId}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...formData,
            status: 'MODIFIED',
          }),
        }
      );

      if (!response.ok) throw new Error('Failed to save adjustment');

      await fetchAdjustment();
      setIsEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setIsSaving(false);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    try {
      const response = await fetch(
        `/api/projects/${params.id}/tax-adjustments/${params.adjustmentId}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: newStatus }),
        }
      );

      if (!response.ok) throw new Error('Failed to update status');

      await fetchAdjustment();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update status');
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this adjustment?')) return;

    try {
      const response = await fetch(
        `/api/projects/${params.id}/tax-adjustments/${params.adjustmentId}`,
        {
          method: 'DELETE',
        }
      );

      if (!response.ok) throw new Error('Failed to delete adjustment');

      router.push(`/dashboard/projects/${params.id}/tax-calculation/adjustments`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete');
    }
  };

  const handleDocumentUpload = async () => {
    await fetchAdjustment();
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!adjustment || error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-sm text-red-600">{error || 'Adjustment not found'}</p>
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
            onClick={() => router.push(`/dashboard/projects/${params.id}/tax-calculation/adjustments`)}
            className="text-blue-600 hover:text-blue-800 mb-1 flex items-center gap-1 text-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Adjustments
          </button>
          <h1 className="text-xl font-bold text-gray-900">
            Tax Adjustment Details
          </h1>
          <p className="text-gray-600 text-sm mt-0.5">
            Project: {adjustment.project.name}
          </p>
        </div>

        <div className="flex gap-2">
          {!isEditing && (
            <>
              <button
                onClick={() => setIsEditing(true)}
                className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Edit
              </button>
              <button
                onClick={handleDelete}
                className="px-3 py-1.5 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Delete
              </button>
            </>
          )}
        </div>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-4">
          {/* Details Card */}
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-4">
            <h2 className="text-base font-semibold mb-3">Adjustment Details</h2>

            {isEditing ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Type
                  </label>
                  <select
                    value={formData.type}
                    onChange={(e) =>
                      setFormData({ ...formData, type: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  >
                    <option value="DEBIT">Debit (Add Back)</option>
                    <option value="CREDIT">Credit (Deduct)</option>
                    <option value="ALLOWANCE">Allowance</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Amount
                  </label>
                  <input
                    type="number"
                    value={formData.amount}
                    onChange={(e) =>
                      setFormData({ ...formData, amount: parseFloat(e.target.value) })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    SARS Section
                  </label>
                  <input
                    type="text"
                    value={formData.sarsSection}
                    onChange={(e) =>
                      setFormData({ ...formData, sarsSection: e.target.value })
                    }
                    placeholder="e.g., s23(g)"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Notes / Reasoning
                  </label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) =>
                      setFormData({ ...formData, notes: e.target.value })
                    }
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>

                <div className="flex gap-2 pt-4">
                  <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
                  >
                    {isSaving ? 'Saving...' : 'Save Changes'}
                  </button>
                  <button
                    onClick={() => setIsEditing(false)}
                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <span className="text-sm text-gray-600">Type:</span>
                  <p className="font-medium">{adjustment.type}</p>
                </div>
                <div>
                  <span className="text-sm text-gray-600">Description:</span>
                  <p className="font-medium">{adjustment.description}</p>
                </div>
              <div>
                <span className="text-sm text-gray-600">Amount:</span>
                <p className="text-lg font-bold">{formatAmount(adjustment.amount)}</p>
              </div>
                {adjustment.sarsSection && (
                  <div>
                    <span className="text-sm text-gray-600">SARS Section:</span>
                    <p className="font-medium">{adjustment.sarsSection}</p>
                  </div>
                )}
                {adjustment.notes && (
                  <div>
                    <span className="text-sm text-gray-600">Notes:</span>
                    <p className="text-gray-800">{adjustment.notes}</p>
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
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-4">
            <h2 className="text-base font-semibold mb-3">Supporting Documents</h2>
            <DocumentUploader
              projectId={parseInt(params.id)}
              adjustmentId={parseInt(params.adjustmentId)}
              onUploadComplete={handleDocumentUpload}
              onUploadError={(error) => setError(error)}
            />

            {/* Documents List */}
            {adjustment.documents.length > 0 && (
              <div className="mt-4 space-y-3">
                <h3 className="text-sm font-medium text-gray-900">Uploaded Documents</h3>
                {adjustment.documents.map((doc) => (
                  <div key={doc.id} className="border border-gray-200 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <p className="font-medium text-gray-900">{doc.fileName}</p>
                        <p className="text-xs text-gray-500">
                          {(doc.fileSize / 1024).toFixed(2)} KB • {doc.fileType}
                        </p>
                      </div>
                      <span
                        className={`text-xs px-2 py-1 rounded-full ${
                          doc.extractionStatus === 'COMPLETED'
                            ? 'bg-green-100 text-green-800'
                            : doc.extractionStatus === 'FAILED'
                            ? 'bg-red-100 text-red-800'
                            : doc.extractionStatus === 'PROCESSING'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-gray-100 text-gray-800'
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
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-4">
            <h2 className="text-sm font-semibold mb-3">Status</h2>
            <div className="space-y-2">
              <button
                onClick={() => handleStatusChange('SUGGESTED')}
                className={`w-full px-4 py-2 rounded-lg text-sm font-medium ${
                  adjustment.status === 'SUGGESTED'
                    ? 'bg-yellow-100 text-yellow-800 border-2 border-yellow-400'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                Suggested
              </button>
              <button
                onClick={() => handleStatusChange('APPROVED')}
                className={`w-full px-4 py-2 rounded-lg text-sm font-medium ${
                  adjustment.status === 'APPROVED'
                    ? 'bg-green-100 text-green-800 border-2 border-green-400'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                Approved
              </button>
              <button
                onClick={() => handleStatusChange('MODIFIED')}
                className={`w-full px-4 py-2 rounded-lg text-sm font-medium ${
                  adjustment.status === 'MODIFIED'
                    ? 'bg-blue-100 text-blue-800 border-2 border-blue-400'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                Modified
              </button>
              <button
                onClick={() => handleStatusChange('REJECTED')}
                className={`w-full px-4 py-2 rounded-lg text-sm font-medium ${
                  adjustment.status === 'REJECTED'
                    ? 'bg-red-100 text-red-800 border-2 border-red-400'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                Rejected
              </button>
            </div>
          </div>

          {/* Metadata */}
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-4">
            <h2 className="text-sm font-semibold mb-3">Metadata</h2>
            <div className="space-y-3 text-sm">
              {adjustment.confidenceScore && (
                <div>
                  <span className="text-gray-600">AI Confidence:</span>
                  <p className="font-medium">
                    {Math.round(adjustment.confidenceScore * 100)}%
                  </p>
                </div>
              )}
              <div>
                <span className="text-gray-600">Created:</span>
                <p className="font-medium">
                  {new Date(adjustment.createdAt).toLocaleDateString()}
                </p>
              </div>
              <div>
                <span className="text-gray-600">Updated:</span>
                <p className="font-medium">
                  {new Date(adjustment.updatedAt).toLocaleDateString()}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}


