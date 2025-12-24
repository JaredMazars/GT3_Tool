'use client';

import { X } from 'lucide-react';
import { useEffect } from 'react';

export interface ErrorModalProps {
  isOpen: boolean;
  title?: string;
  message: string;
  onClose: () => void;
}

export function ErrorModal({ isOpen, title = 'Error', message, onClose }: ErrorModalProps) {
  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-white rounded-lg shadow-corporate-lg max-w-md w-full mx-4 z-50">
        {/* Header */}
        <div 
          className="px-6 py-4 border-b-2 border-forvis-gray-200 flex items-center justify-between"
          style={{ background: 'linear-gradient(135deg, #DC2626 0%, #B91C1C 100%)' }}
        >
          <h3 className="text-lg font-semibold text-white">{title}</h3>
          <button
            onClick={onClose}
            className="text-white hover:text-forvis-gray-200 transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        {/* Content */}
        <div className="px-6 py-4">
          <p className="text-sm text-forvis-gray-700 whitespace-pre-wrap">{message}</p>
        </div>
        
        {/* Footer */}
        <div className="px-6 py-4 border-t border-forvis-gray-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-white rounded-lg transition-all hover:scale-105 shadow-corporate"
            style={{ background: 'linear-gradient(135deg, #5B93D7 0%, #2E5AAC 100%)' }}
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
}




















