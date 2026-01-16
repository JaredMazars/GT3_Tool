'use client';

import { X } from 'lucide-react';
import { DocumentDetailClient } from '@/app/dashboard/document-vault/[id]/DocumentDetailClient';

interface DocumentDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  documentId: number | null;
}

export function DocumentDetailModal({ isOpen, onClose, documentId }: DocumentDetailModalProps) {
  if (!isOpen || !documentId) return null;

  // Close on backdrop click
  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  // Close on Escape key
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 transition-opacity z-50 flex items-center justify-center p-4"
      onClick={handleBackdropClick}
      onKeyDown={handleKeyDown}
      role="dialog"
      aria-modal="true"
    >
      <div className="relative bg-white rounded-lg shadow-corporate-lg max-w-5xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div
          className="px-6 py-4 rounded-t-lg flex-shrink-0"
          style={{ background: 'linear-gradient(135deg, #5B93D7 0%, #2E5AAC 50%, #1C3667 100%)' }}
        >
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-white">Document Details</h2>
            <button
              onClick={onClose}
              className="text-white hover:text-forvis-gray-200 transition-colors"
              aria-label="Close modal"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>

        {/* Content - Scrollable */}
        <div className="overflow-y-auto flex-1 p-6">
          <DocumentDetailClient documentId={String(documentId)} hideBackButton={true} />
        </div>
      </div>
    </div>
  );
}
