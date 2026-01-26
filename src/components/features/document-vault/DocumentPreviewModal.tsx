'use client';

import { useState } from 'react';
import { X, Download, AlertCircle } from 'lucide-react';
import { Button, LoadingSpinner } from '@/components/ui';

interface DocumentPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  downloadUrl: string;
  fileName: string;
  mimeType: string;
  onDownload?: () => void;
}

/**
 * Modal for previewing documents (PDFs and images)
 * Shows download option for unsupported formats
 */
export function DocumentPreviewModal({
  isOpen,
  onClose,
  downloadUrl,
  fileName,
  mimeType,
  onDownload,
}: DocumentPreviewModalProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  if (!isOpen) return null;

  // Determine if preview is supported
  const isPdf = mimeType === 'application/pdf';
  const isImage = mimeType.startsWith('image/');
  const canPreview = isPdf || isImage;

  const handleLoad = () => {
    setIsLoading(false);
  };

  const handleError = () => {
    setIsLoading(false);
    setHasError(true);
  };

  const handleDownloadClick = () => {
    window.open(downloadUrl, '_blank');
    if (onDownload) {
      onDownload();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div
        className="bg-white rounded-lg shadow-corporate-lg w-full h-full max-w-[90vw] max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between p-4 border-b border-forvis-blue-100 rounded-t-lg"
          style={{ background: 'linear-gradient(to right, #2E5AAC, #25488A)' }}
        >
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-white truncate">{fileName}</h3>
            <p className="text-xs text-white opacity-90">
              {canPreview ? 'Document Preview' : 'Preview not available'}
            </p>
          </div>
          <div className="flex items-center space-x-2 ml-4">
            <Button
              variant="secondary"
              size="sm"
              onClick={handleDownloadClick}
              className="bg-white text-forvis-blue-600 hover:bg-forvis-blue-50"
            >
              <Download className="h-4 w-4 mr-1" />
              Download
            </Button>
            <button
              onClick={onClose}
              className="text-white hover:bg-white hover:bg-opacity-20 rounded-lg p-2 transition-colors"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden bg-forvis-gray-50 relative">
          {canPreview ? (
            <>
              {isLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-white">
                  <div className="text-center">
                    <LoadingSpinner size="lg" />
                    <p className="text-sm text-forvis-gray-600 mt-4">Loading document...</p>
                  </div>
                </div>
              )}

              {hasError ? (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center max-w-md mx-auto p-6">
                    <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                    <h4 className="text-lg font-semibold text-forvis-gray-900 mb-2">
                      Failed to Load Preview
                    </h4>
                    <p className="text-sm text-forvis-gray-600 mb-4">
                      The document preview could not be loaded. You can still download the file to
                      view it.
                    </p>
                    <Button variant="gradient" onClick={handleDownloadClick}>
                      <Download className="h-4 w-4 mr-2" />
                      Download Document
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  {isPdf && (
                    <iframe
                      src={downloadUrl}
                      className="w-full h-full border-0"
                      title={fileName}
                      onLoad={handleLoad}
                      onError={handleError}
                    />
                  )}

                  {isImage && (
                    <div className="w-full h-full flex items-center justify-center p-4 overflow-auto">
                      <img
                        src={downloadUrl}
                        alt={fileName}
                        className="max-w-full max-h-full object-contain"
                        onLoad={handleLoad}
                        onError={handleError}
                      />
                    </div>
                  )}
                </>
              )}
            </>
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center max-w-md mx-auto p-6">
                <AlertCircle className="h-12 w-12 text-forvis-blue-600 mx-auto mb-4" />
                <h4 className="text-lg font-semibold text-forvis-gray-900 mb-2">
                  Preview Not Available
                </h4>
                <p className="text-sm text-forvis-gray-600 mb-4">
                  This file type ({mimeType}) cannot be previewed in the browser. Please download
                  the file to view it.
                </p>
                <Button variant="gradient" onClick={handleDownloadClick}>
                  <Download className="h-4 w-4 mr-2" />
                  Download Document
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
