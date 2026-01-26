/**
 * Attachment Lightbox Component
 * Full-screen viewer for attachments with download functionality
 */

'use client';

import { useState, useEffect } from 'react';
import { X, Download, ChevronLeft, ChevronRight, FileText, File } from 'lucide-react';
import { Button } from '@/components/ui';

interface Attachment {
  id: number;
  fileName: string;
  filePath: string;
  fileSize: number;
  fileType: string;
  uploadedBy: string;
  createdAt: Date | string;
  User?: {
    name: string | null;
    email: string;
  };
}

interface AttachmentLightboxProps {
  isOpen: boolean;
  onClose: () => void;
  attachments: Attachment[];
  initialIndex?: number;
  taskId: number;
  noteId: number;
}

export function AttachmentLightbox({
  isOpen,
  onClose,
  attachments,
  initialIndex = 0,
  taskId,
  noteId,
}: AttachmentLightboxProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    setCurrentIndex(initialIndex);
    setImageError(false);
  }, [initialIndex, isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowLeft') {
        goToPrevious();
      } else if (e.key === 'ArrowRight') {
        goToNext();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, currentIndex]);

  if (!isOpen || attachments.length === 0) return null;

  const currentAttachment = attachments[currentIndex];
  
  if (!currentAttachment) return null;
  
  const isImage = currentAttachment.fileType.startsWith('image/');
  const attachmentUrl = `/api/tasks/${taskId}/review-notes/${noteId}/attachments/${currentAttachment.id}`;

  const goToNext = () => {
    if (currentIndex < attachments.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setImageError(false);
    }
  };

  const goToPrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setImageError(false);
    }
  };

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = attachmentUrl;
    link.download = currentAttachment.fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDate = (date: Date | string): string => {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleString();
  };

  const getFileIcon = () => {
    if (currentAttachment.fileType.includes('pdf')) return FileText;
    if (currentAttachment.fileType.includes('word') || currentAttachment.fileType.includes('document')) return FileText;
    if (currentAttachment.fileType.includes('excel') || currentAttachment.fileType.includes('sheet')) return FileText;
    return File;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-95 z-[100] flex items-center justify-center">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 p-4 bg-gradient-to-b from-black/50 to-transparent z-10">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex-1 min-w-0 mr-4">
            <h3 className="text-lg font-semibold text-white truncate">
              {currentAttachment.fileName}
            </h3>
            <div className="flex items-center space-x-4 mt-1">
              <span className="text-sm text-gray-300">
                {formatFileSize(currentAttachment.fileSize)}
              </span>
              <span className="text-sm text-gray-300">
                {currentAttachment.User?.name || currentAttachment.User?.email || 'Unknown'}
              </span>
              <span className="text-sm text-gray-400">
                {formatDate(currentAttachment.createdAt)}
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Button
              onClick={handleDownload}
              variant="secondary"
              size="sm"
              icon={<Download className="w-4 h-4" />}
            >
              Download
            </Button>
            <button
              onClick={onClose}
              className="p-2 text-white hover:bg-white/10 rounded-lg transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="w-full h-full flex items-center justify-center p-20">
        <div
          className="absolute inset-0"
          onClick={onClose}
        />

        <div className="relative max-w-7xl max-h-full w-full h-full flex items-center justify-center">
          {isImage && !imageError ? (
            <img
              src={attachmentUrl}
              alt={currentAttachment.fileName}
              className="max-w-full max-h-full object-contain"
              onError={() => setImageError(true)}
            />
          ) : (
            <div className="bg-white rounded-lg p-12 text-center">
              {(() => {
                const IconComponent = getFileIcon();
                return <IconComponent className="w-24 h-24 mx-auto mb-4 text-forvis-gray-400" />;
              })()}
              <p className="text-lg font-medium text-forvis-gray-900 mb-2">
                {currentAttachment.fileName}
              </p>
              <p className="text-sm text-forvis-gray-600 mb-6">
                This file type cannot be previewed
              </p>
              <Button
                onClick={handleDownload}
                variant="gradient"
                size="md"
                icon={<Download className="w-4 h-4" />}
              >
                Download File
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Navigation */}
      {attachments.length > 1 && (
        <>
          {/* Previous Button */}
          {currentIndex > 0 && (
            <button
              onClick={goToPrevious}
              className="absolute left-4 top-1/2 -translate-y-1/2 p-3 bg-black/50 hover:bg-black/70 rounded-full text-white transition-colors z-10"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
          )}

          {/* Next Button */}
          {currentIndex < attachments.length - 1 && (
            <button
              onClick={goToNext}
              className="absolute right-4 top-1/2 -translate-y-1/2 p-3 bg-black/50 hover:bg-black/70 rounded-full text-white transition-colors z-10"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          )}

          {/* Counter */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 bg-black/50 rounded-full text-white text-sm z-10">
            {currentIndex + 1} / {attachments.length}
          </div>
        </>
      )}
    </div>
  );
}



