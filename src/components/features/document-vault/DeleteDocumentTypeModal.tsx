'use client';

import { useState, useEffect } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { Button, LoadingSpinner } from '@/components/ui';

interface DeleteDocumentTypeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  documentType: {
    id: number;
    code: string;
    name: string;
    documentCount: number;
  } | null;
}

export function DeleteDocumentTypeModal({ isOpen, onClose, onSuccess, documentType }: DeleteDocumentTypeModalProps) {
  const [isDeleting, setIsDeleting] = useState(false);
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
      if (e.key === 'Escape' && isOpen && !isDeleting) {
        onClose();
      }
    };
    
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, isDeleting, onClose]);

  if (!isOpen || !documentType) return null;

  const handleDelete = async () => {
    setError(null);
    
    // Prevent deletion if type has documents
    if (documentType.documentCount > 0) {
      setError(`Cannot delete document type with ${documentType.documentCount} associated documents. Please reassign these documents to a different type first.`);
      return;
    }

    setIsDeleting(true);

    try {
      const response = await fetch(`/api/admin/document-vault/types/${documentType.id}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete document type');
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred');
    } finally {
      setIsDeleting(false);
    }
  };

  const hasDocuments = documentType.documentCount > 0;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 transition-opacity z-50 flex items-center justify-center p-4">
      <div className="relative bg-white rounded-lg shadow-corporate-lg max-w-lg w-full">
        {/* Header */}
        <div
          className="px-6 py-4 rounded-t-lg"
          style={{ background: 'linear-gradient(135deg, #DC2626 0%, #B91C1C 100%)' }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-6 w-6 text-white" />
              <h3 className="text-lg font-bold text-white">Delete Document Type</h3>
            </div>
            <button
              onClick={onClose}
              disabled={isDeleting}
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
              background: hasDocuments 
                ? 'linear-gradient(135deg, #FEF3C7 0%, #FDE68A 100%)' 
                : 'linear-gradient(135deg, #FEE2E2 0%, #FECACA 100%)', 
              borderColor: hasDocuments ? '#F59E0B' : '#EF4444' 
            }}
          >
            <p className={`text-sm font-semibold ${hasDocuments ? 'text-yellow-900' : 'text-red-900'}`}>
              {hasDocuments ? (
                <>Cannot delete document type &quot;{documentType.name}&quot; ({documentType.code})</>
              ) : (
                <>Are you sure you want to delete &quot;{documentType.name}&quot;?</>
              )}
            </p>
            <p className={`text-sm mt-2 ${hasDocuments ? 'text-yellow-800' : 'text-red-800'}`}>
              {hasDocuments ? (
                <>
                  This document type currently has <strong>{documentType.documentCount}</strong> associated document{documentType.documentCount !== 1 ? 's' : ''}. 
                  You must reassign these documents to a different type before deleting this type.
                </>
              ) : (
                <>This action cannot be undone. The document type code &quot;{documentType.code}&quot; will be permanently removed.</>
              )}
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-4 bg-red-50 border-2 border-red-200 rounded-lg">
              <p className="text-sm font-semibold text-red-800">{error}</p>
            </div>
          )}

          {/* Document Type Info */}
          <div className="bg-forvis-gray-50 rounded-lg p-4 border border-forvis-gray-200">
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm font-medium text-forvis-gray-700">Type Code:</span>
                <span className="text-sm font-mono text-forvis-gray-900">{documentType.code}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm font-medium text-forvis-gray-700">Display Name:</span>
                <span className="text-sm text-forvis-gray-900">{documentType.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm font-medium text-forvis-gray-700">Associated Documents:</span>
                <span className={`text-sm font-semibold ${hasDocuments ? 'text-yellow-700' : 'text-green-700'}`}>
                  {documentType.documentCount}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-forvis-gray-200 bg-forvis-gray-50 rounded-b-lg flex justify-end gap-3">
          <Button
            variant="secondary"
            onClick={onClose}
            disabled={isDeleting}
          >
            {hasDocuments ? 'Close' : 'Cancel'}
          </Button>
          {!hasDocuments && (
            <Button
              variant="danger"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <>
                  <LoadingSpinner size="sm" />
                  <span className="ml-2">Deleting...</span>
                </>
              ) : (
                <>
                  <AlertTriangle className="h-4 w-4 mr-2" />
                  Delete Type
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
