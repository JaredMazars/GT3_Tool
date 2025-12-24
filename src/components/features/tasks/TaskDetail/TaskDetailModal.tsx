'use client';

import { useEffect } from 'react';
import { X } from 'lucide-react';
import { TaskDetailContent } from './TaskDetailContent';

export interface TaskDetailModalProps {
  isOpen: boolean;
  taskId: string;
  onClose: () => void;
  serviceLine?: string;
  subServiceLineGroup?: string;
  clientId?: string;
  onTaskUpdated?: () => void;
}

export function TaskDetailModal({
  isOpen,
  taskId,
  onClose,
  serviceLine,
  subServiceLineGroup,
  clientId,
  onTaskUpdated,
}: TaskDetailModalProps) {
  // Handle ESC key to close modal
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleArchive = () => {
    // When archiving from modal, close it and refresh parent
    onClose();
    if (onTaskUpdated) {
      onTaskUpdated();
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50"
      onClick={handleBackdropClick}
    >
      <div 
        className="relative bg-white rounded-lg shadow-corporate-lg w-full max-w-7xl max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div 
          className="px-6 py-4 rounded-t-lg flex items-center justify-between flex-shrink-0 border-b border-forvis-gray-200"
          style={{ background: 'linear-gradient(135deg, #5B93D7 0%, #2E5AAC 50%, #1C3667 100%)' }}
        >
          <h2 className="text-xl font-semibold text-white">Task Details</h2>
          <button
            onClick={onClose}
            className="text-white hover:text-forvis-gray-200 transition-colors focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-forvis-blue-600 rounded-lg p-1"
            aria-label="Close modal"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Modal Content - Scrollable */}
        <div className="flex-1 overflow-y-auto">
          <TaskDetailContent
            taskId={taskId}
            serviceLine={serviceLine}
            subServiceLineGroup={subServiceLineGroup}
            clientId={clientId}
            showHeader={true}
            onUpdate={onTaskUpdated}
            onArchive={handleArchive}
          />
        </div>
      </div>
    </div>
  );
}


















