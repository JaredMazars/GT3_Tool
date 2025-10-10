'use client';

import { useState, useEffect } from 'react';
import DocumentUploader from './DocumentUploader';

interface AddAdjustmentModalProps {
  isOpen: boolean;
  adjustmentType: 'DEBIT' | 'CREDIT' | 'ALLOWANCE' | 'RECOUPMENT';
  projectId: number;
  onClose: () => void;
  onSuccess: () => void;
}

export default function AddAdjustmentModal({
  isOpen,
  adjustmentType,
  projectId,
  onClose,
  onSuccess,
}: AddAdjustmentModalProps) {
  const [formData, setFormData] = useState({
    description: '',
    amount: '',
    sarsSection: '',
    notes: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdAdjustmentId, setCreatedAdjustmentId] = useState<number | null>(null);
  const [showDocumentUpload, setShowDocumentUpload] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      // Reset form when modal closes
      setFormData({ description: '', amount: '', sarsSection: '', notes: '' });
      setError(null);
      setCreatedAdjustmentId(null);
      setShowDocumentUpload(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async () => {
    if (!formData.description || !formData.amount) {
      setError('Description and amount are required');
      return;
    }

    const amountNum = parseFloat(formData.amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      setError('Please enter a valid positive amount');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      const response = await fetch(`/api/projects/${projectId}/tax-adjustments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: adjustmentType,
          description: formData.description,
          amount: amountNum,
          status: 'APPROVED',
          sarsSection: formData.sarsSection || null,
          notes: formData.notes || null,
          confidenceScore: 1.0,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create adjustment');
      }

      const result = await response.json();
      setCreatedAdjustmentId(result.id);
      setShowDocumentUpload(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create adjustment');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFinish = () => {
    onSuccess();
    onClose();
  };

  const colors = {
    DEBIT: { bg: 'bg-orange-50', border: 'border-orange-500', text: 'text-orange-900', button: 'bg-orange-600 hover:bg-orange-700' },
    CREDIT: { bg: 'bg-green-50', border: 'border-green-500', text: 'text-green-900', button: 'bg-green-600 hover:bg-green-700' },
    ALLOWANCE: { bg: 'bg-blue-50', border: 'border-blue-500', text: 'text-blue-900', button: 'bg-blue-600 hover:bg-blue-700' },
    RECOUPMENT: { bg: 'bg-purple-50', border: 'border-purple-500', text: 'text-purple-900', button: 'bg-purple-600 hover:bg-purple-700' },
  };
  const color = colors[adjustmentType];

  const typeLabels = {
    DEBIT: 'Debit Adjustment',
    CREDIT: 'Credit Adjustment',
    ALLOWANCE: 'Allowance',
    RECOUPMENT: 'Recoupment',
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className={`${color.bg} border-b-4 ${color.border} p-4 sticky top-0 z-10`}>
          <div className="flex items-center justify-between">
            <h2 className={`text-lg font-bold ${color.text}`}>
              Add {typeLabels[adjustmentType]}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {!showDocumentUpload ? (
            <>
              {/* Adjustment Details Form */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Enter adjustment description"
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    autoFocus
                    disabled={isSubmitting}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Amount <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-gray-500">R</span>
                    <input
                      type="number"
                      value={formData.amount}
                      onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                      placeholder="0.00"
                      step="0.01"
                      min="0"
                      className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      disabled={isSubmitting}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    SARS Section (optional)
                  </label>
                  <input
                    type="text"
                    value={formData.sarsSection}
                    onChange={(e) => setFormData({ ...formData, sarsSection: e.target.value })}
                    placeholder="e.g., s11(e), s23, s18A"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={isSubmitting}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Notes / Reasoning (optional)
                  </label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Additional notes or explanation for this adjustment"
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={isSubmitting}
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 justify-end pt-4 border-t">
                <button
                  onClick={onClose}
                  disabled={isSubmitting}
                  className="px-4 py-2 text-sm bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 disabled:bg-gray-100 disabled:text-gray-400"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className={`px-4 py-2 text-sm text-white rounded-lg ${color.button} disabled:bg-gray-400 flex items-center gap-2`}
                >
                  {isSubmitting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Creating...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Create Adjustment
                    </>
                  )}
                </button>
              </div>
            </>
          ) : (
            <>
              {/* Document Upload Section */}
              <div className="space-y-4">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center gap-2">
                    <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="text-sm font-medium text-green-800">
                      Adjustment created successfully!
                    </p>
                  </div>
                </div>

                <div>
                  <h3 className="text-base font-semibold text-gray-900 mb-3">
                    Upload Supporting Documents (Optional)
                  </h3>
                  <p className="text-sm text-gray-600 mb-4">
                    Add any supporting documents for this adjustment. You can upload PDFs, Excel files, or CSV files.
                  </p>
                  
                  {createdAdjustmentId && (
                    <DocumentUploader
                      projectId={projectId}
                      adjustmentId={createdAdjustmentId}
                      onUploadComplete={() => {}}
                      onUploadError={(err) => setError(err)}
                    />
                  )}
                </div>
              </div>

              {/* Finish Button */}
              <div className="flex justify-end pt-4 border-t">
                <button
                  onClick={handleFinish}
                  className={`px-6 py-2 text-sm text-white rounded-lg ${color.button} flex items-center gap-2`}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Finish
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

