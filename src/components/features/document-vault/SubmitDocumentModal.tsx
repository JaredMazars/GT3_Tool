'use client';

import { useState, useEffect } from 'react';
import { Send, X } from 'lucide-react';
import { Button, LoadingSpinner } from '@/components/ui';

interface SubmitDocumentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  document: {
    id: number;
    title: string;
    documentType?: string;
    version?: number;
  } | null;
  isServiceLine?: boolean;
}

export function SubmitDocumentModal({ 
  isOpen, 
  onClose, 
  onSuccess, 
  document: documentToSubmit,
  isServiceLine = false 
}: SubmitDocumentModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset error when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setError(null);
    }
  }, [isOpen]);

  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !isSubmitting) {
        onClose();
      }
    };
    
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, isSubmitting, onClose]);

  if (!isOpen || !documentToSubmit) return null;

  const handleSubmit = async () => {
    setError(null);
    setIsSubmitting(true);

    try {
      const endpoint = isServiceLine
        ? `/api/document-vault/admin/${documentToSubmit.id}/submit`
        : `/api/admin/document-vault/${documentToSubmit.id}/submit`;

      const response = await fetch(endpoint, {
        method: 'POST',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit document');
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 transition-opacity z-50 flex items-center justify-center p-4">
      <div className="relative bg-white rounded-lg shadow-corporate-lg max-w-lg w-full">
        {/* Header */}
        <div
          className="px-6 py-4 rounded-t-lg"
          style={{ background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)' }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Send className="h-6 w-6 text-white" />
              <h3 className="text-lg font-bold text-white">Submit for Approval</h3>
            </div>
            <button
              onClick={onClose}
              disabled={isSubmitting}
              className="text-white hover:text-forvis-gray-200 transition-colors disabled:opacity-50"
              aria-label="Close modal"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="px-6 py-5 space-y-4">
          {/* Warning Message */}
          <div
            className="rounded-lg p-4 border-2"
            style={{ 
              background: 'linear-gradient(135deg, #DBEAFE 0%, #BFDBFE 100%)', 
              borderColor: '#3B82F6' 
            }}
          >
            <p className="text-sm font-semibold text-blue-900">
              Submit &quot;{documentToSubmit.title}&quot; for approval?
            </p>
            <p className="text-sm mt-2 text-blue-800">
              Once submitted, this document will enter the approval workflow and cannot be edited until the approval process is complete.
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-4 bg-red-50 border-2 border-red-200 rounded-lg">
              <p className="text-sm font-semibold text-red-800">{error}</p>
            </div>
          )}

          {/* Document Info */}
          <div className="bg-forvis-gray-50 rounded-lg p-4 border border-forvis-gray-200">
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm font-medium text-forvis-gray-700">Document Title:</span>
                <span className="text-sm text-forvis-gray-900 font-semibold">{documentToSubmit.title}</span>
              </div>
              {documentToSubmit.documentType && (
                <div className="flex justify-between">
                  <span className="text-sm font-medium text-forvis-gray-700">Type:</span>
                  <span className="text-sm text-forvis-gray-900">{documentToSubmit.documentType}</span>
                </div>
              )}
              {documentToSubmit.version && (
                <div className="flex justify-between">
                  <span className="text-sm font-medium text-forvis-gray-700">Version:</span>
                  <span className="text-sm text-forvis-gray-900">v{documentToSubmit.version}</span>
                </div>
              )}
            </div>
          </div>

          {/* What happens next */}
          <div className="bg-forvis-blue-50 rounded-lg p-4 border border-forvis-blue-200">
            <p className="text-sm font-semibold text-forvis-blue-900 mb-2">What happens next:</p>
            <ul className="text-sm text-forvis-blue-800 space-y-1 list-disc list-inside">
              <li>Document will be sent to designated approvers</li>
              <li>Status will change to &quot;Pending Approval&quot;</li>
              <li>You will be notified of the approval decision</li>
              <li>If approved, document will be published</li>
              <li>If rejected, you can edit and resubmit</li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-forvis-gray-200 bg-forvis-gray-50 rounded-b-lg flex justify-end gap-3">
          <Button
            variant="secondary"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <LoadingSpinner size="sm" />
                <span className="ml-2">Submitting...</span>
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Submit for Approval
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
