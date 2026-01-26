'use client';

import { useState, useEffect } from 'react';
import DocumentUploader from '../../../shared/DocumentUploader';

interface AddAdjustmentModalProps {
  isOpen: boolean;
  adjustmentType: 'DEBIT' | 'CREDIT' | 'ALLOWANCE' | 'RECOUPMENT';
  taskId: number;
  onClose: () => void;
  onSuccess: () => void;
}

export default function AddAdjustmentModal({
  isOpen,
  adjustmentType,
  taskId,
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
    if (Number.isNaN(amountNum) || amountNum <= 0) {
      setError('Please enter a valid positive amount');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      const response = await fetch(`/api/tasks/${taskId}/tax-adjustments`, {
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

  // Forvis blue corporate color scheme for all adjustment types
  const forvisBlue = {
    gradient: 'linear-gradient(135deg, #5B93D7 0%, #2E5AAC 50%, #1C3667 100%)',
    borderColor: '#2E5AAC',
    bgClass: 'bg-blue-50',
    textClass: 'text-blue-900'
  };
  const color = forvisBlue;

  const typeLabels = {
    DEBIT: 'Debit Adjustment',
    CREDIT: 'Credit Adjustment',
    ALLOWANCE: 'Allowance',
    RECOUPMENT: 'Recoupment',
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-corporate-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto border-2" style={{ borderColor: color.borderColor }}>
        {/* Header */}
        <div 
          className="p-6 sticky top-0 z-10 border-b-4 shadow-corporate"
          style={{ 
            background: color.gradient,
            borderColor: color.borderColor
          }}
        >
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-white">
              Add {typeLabels[adjustmentType]}
            </h2>
            <button
              onClick={onClose}
              className="text-white hover:text-gray-200 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
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

          {!showDocumentUpload ? (
            <>
              {/* Adjustment Details Form */}
              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-bold text-gray-800 mb-2">
                    Description <span className="text-red-600">*</span>
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Enter adjustment description"
                    rows={3}
                    className="w-full px-4 py-2.5 bg-white text-gray-900 border-2 border-forvis-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-forvis-blue-500 transition-all shadow-sm focus:shadow-corporate disabled:bg-gray-50 disabled:cursor-not-allowed"
                    autoFocus
                    disabled={isSubmitting}
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-800 mb-2">
                    Amount <span className="text-red-600">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-3 text-gray-600 font-semibold">R</span>
                    <input
                      type="number"
                      value={formData.amount}
                      onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                      placeholder="0.00"
                      step="0.01"
                      min="0"
                      className="w-full pl-9 pr-4 py-2.5 bg-white text-gray-900 border-2 border-forvis-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-forvis-blue-500 transition-all shadow-sm focus:shadow-corporate disabled:bg-gray-50 disabled:cursor-not-allowed"
                      disabled={isSubmitting}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-800 mb-2">
                    SARS Section <span className="text-gray-500 font-normal">(optional)</span>
                  </label>
                  <input
                    type="text"
                    value={formData.sarsSection}
                    onChange={(e) => setFormData({ ...formData, sarsSection: e.target.value })}
                    placeholder="e.g., s11(e), s23, s18A"
                    className="w-full px-4 py-2.5 bg-white text-gray-900 border-2 border-forvis-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-forvis-blue-500 transition-all shadow-sm focus:shadow-corporate disabled:bg-gray-50 disabled:cursor-not-allowed"
                    disabled={isSubmitting}
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-800 mb-2">
                    Notes / Reasoning <span className="text-gray-500 font-normal">(optional)</span>
                  </label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Additional notes or explanation for this adjustment"
                    rows={4}
                    className="w-full px-4 py-2.5 bg-white text-gray-900 border-2 border-forvis-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-forvis-blue-500 transition-all shadow-sm focus:shadow-corporate disabled:bg-gray-50 disabled:cursor-not-allowed"
                    disabled={isSubmitting}
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 justify-end pt-6 border-t-2 border-gray-200">
                <button
                  onClick={onClose}
                  disabled={isSubmitting}
                  className="px-6 py-2.5 text-sm font-semibold bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed transition-all shadow-sm hover:shadow-corporate"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="px-6 py-2.5 text-sm font-bold text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-corporate hover:shadow-corporate-lg transition-all"
                  style={{ background: isSubmitting ? '#9CA3AF' : color.gradient }}
                >
                  {isSubmitting ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                      Creating...
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
              <div className="space-y-5">
                <div 
                  className="border-2 rounded-lg p-5 shadow-corporate"
                  style={{ 
                    background: 'linear-gradient(to right, #ECFDF5, #D1FAE5)',
                    borderColor: '#059669'
                  }}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex-shrink-0 w-10 h-10 rounded-full bg-green-500 flex items-center justify-center shadow-corporate">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-base font-bold text-green-900">
                        Adjustment Created Successfully!
                      </p>
                      <p className="text-sm text-green-700 mt-0.5">
                        The adjustment has been added to your tax calculation.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-blue-50 border-2 rounded-lg p-5 shadow-corporate" style={{ borderColor: '#5B93D7' }}>
                  <h3 className="text-base font-bold text-gray-900 mb-2 flex items-center gap-2">
                    <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                    Upload Supporting Documents
                    <span className="text-xs font-normal text-gray-600">(Optional)</span>
                  </h3>
                  <p className="text-sm text-gray-700 mb-4">
                    Add any supporting documents for this adjustment. You can upload PDFs, Excel files, or CSV files.
                  </p>
                  
                  {createdAdjustmentId && (
                    <DocumentUploader
                      taskId={taskId}
                      adjustmentId={createdAdjustmentId}
                      onUploadComplete={() => {}}
                      onUploadError={(err) => setError(err)}
                    />
                  )}
                </div>
              </div>

              {/* Finish Button */}
              <div className="flex justify-end pt-6 border-t-2 border-gray-200">
                <button
                  onClick={handleFinish}
                  className="px-8 py-3 text-sm font-bold text-white rounded-lg flex items-center gap-2 shadow-corporate hover:shadow-corporate-lg transition-all"
                  style={{ background: color.gradient }}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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

