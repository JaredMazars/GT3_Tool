'use client';

import { useEffect } from 'react';
import { X } from 'lucide-react';
import { DocumentUploadForm } from './DocumentUploadForm';

interface EditDocumentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  document: {
    id: number;
    title: string;
    description: string | null;
    documentType: string;
    categoryId: number;
    scope: string;
    serviceLine: string | null;
    tags: string | null;
    effectiveDate: Date | null;
    expiryDate: Date | null;
    documentVersion: string | null;
    fileName: string;
    VaultDocumentCategory?: {
      name: string;
    };
  } | null;
  categories: Array<{ 
    id: number; 
    name: string; 
    documentType: string | null;
    approverCount?: number;
    active?: boolean;
  }>;
  serviceLines?: string[];
}

export function EditDocumentModal({ 
  isOpen, 
  onClose, 
  onSuccess, 
  document,
  categories,
  serviceLines = []
}: EditDocumentModalProps) {
  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      window.document.body.style.overflow = 'hidden';
    } else {
      window.document.body.style.overflow = 'unset';
    }
    return () => {
      window.document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen || !document) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 transition-opacity z-50 flex items-center justify-center p-4">
      <div 
        className="bg-white rounded-lg shadow-corporate-lg max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="sticky top-0 bg-white border-b border-forvis-gray-200 px-6 py-4 flex items-center justify-between z-10">
          <h2 className="text-xl font-semibold text-forvis-gray-900">Edit Document</h2>
          <button 
            onClick={onClose}
            className="text-forvis-gray-400 hover:text-forvis-gray-600 transition-colors p-1 rounded-lg hover:bg-forvis-gray-100"
            aria-label="Close modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="px-6 py-6 overflow-y-auto flex-1">
          <DocumentUploadForm
            mode="edit"
            documentToEdit={document}
            categories={categories}
            serviceLines={serviceLines}
            defaultServiceLine={document.serviceLine || undefined}
            onSuccess={() => {
              onSuccess();
              onClose();
            }}
            onCancel={onClose}
          />
        </div>
      </div>
    </div>
  );
}
