'use client';

import { useState, useEffect } from 'react';
import { Archive, X } from 'lucide-react';
import { Button, LoadingSpinner } from '@/components/ui';

interface ArchiveDocumentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  document: {
    id: number;
    title: string;
    documentType?: string;
    version?: number;
  } | null;
}

export function ArchiveDocumentModal({ isOpen, onClose, onSuccess, document: documentToArchive }: ArchiveDocumentModalProps) {
  const [isArchiving, setIsArchiving] = useState(false);
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
      if (e.key === 'Escape' && isOpen && !isArchiving) {
        onClose();
      }
    };
    
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, isArchiving, onClose]);

  if (!isOpen || !documentToArchive) return null;

  const handleArchive = async () => {
    setError(null);
    setIsArchiving(true);

    try {
      const response = await fetch(`/api/document-vault/admin/${documentToArchive.id}/archive`, {
        method: 'PATCH',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to archive document');
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred');
    } finally {
      setIsArchiving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 transition-opacity z-50 flex items-center justify-center p-4">
      <div className="relative bg-white rounded-lg shadow-corporate-lg max-w-lg w-full">
        {/* Header */}
        <div
          className="px-6 py-4 rounded-t-lg"
          style={{ background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)' }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Archive className="h-6 w-6 text-white" />
              <h3 className="text-lg font-bold text-white">Archive Document</h3>
            </div>
            <button
              onClick={onClose}
              disabled={isArchiving}
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
              background: 'linear-gradient(135deg, #FEF3C7 0%, #FDE68A 100%)', 
              borderColor: '#F59E0B' 
            }}
          >
            <p className="text-sm font-semibold text-yellow-900">
              Are you sure you want to archive &quot;{documentToArchive.title}&quot;?
            </p>
            <p className="text-sm mt-2 text-yellow-800">
              Archived documents will no longer be visible to users but can be restored later if needed.
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
                <span className="text-sm text-forvis-gray-900 font-semibold">{documentToArchive.title}</span>
              </div>
              {documentToArchive.documentType && (
                <div className="flex justify-between">
                  <span className="text-sm font-medium text-forvis-gray-700">Type:</span>
                  <span className="text-sm text-forvis-gray-900">{documentToArchive.documentType}</span>
                </div>
              )}
              {documentToArchive.version && (
                <div className="flex justify-between">
                  <span className="text-sm font-medium text-forvis-gray-700">Version:</span>
                  <span className="text-sm text-forvis-gray-900">v{documentToArchive.version}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-forvis-gray-200 bg-forvis-gray-50 rounded-b-lg flex justify-end gap-3">
          <Button
            variant="secondary"
            onClick={onClose}
            disabled={isArchiving}
          >
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={handleArchive}
            disabled={isArchiving}
          >
            {isArchiving ? (
              <>
                <LoadingSpinner size="sm" />
                <span className="ml-2">Archiving...</span>
              </>
            ) : (
              <>
                <Archive className="h-4 w-4 mr-2" />
                Archive Document
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
