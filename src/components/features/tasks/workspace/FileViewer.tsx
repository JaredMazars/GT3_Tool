'use client';

import { useState, useEffect } from 'react';
import { X, Loader2, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui';
import { GRADIENTS } from '@/lib/design-system/gradients';

interface FileViewerProps {
  fileId: number;
  fileName: string;
  embedUrl?: string;
  webUrl: string;
  onClose: () => void;
}

export function FileViewer({ fileId, fileName, embedUrl, webUrl, onClose }: FileViewerProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Reset state when file changes
    setIsLoading(true);
    setError(null);
  }, [fileId]);

  const handleIframeLoad = () => {
    setIsLoading(false);
  };

  const handleIframeError = () => {
    setIsLoading(false);
    setError('Failed to load file viewer');
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-corporate-lg w-full h-full max-w-7xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div
          className="flex items-center justify-between p-4 border-b border-forvis-gray-200 rounded-t-lg"
          style={{ background: GRADIENTS.primary.horizontal }}
        >
          <h2 className="text-lg font-semibold text-white truncate flex-1">{fileName}</h2>
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              onClick={() => window.open(webUrl, '_blank')}
              className="flex items-center gap-2 text-sm"
            >
              <ExternalLink className="w-4 h-4" />
              Open in Office
            </Button>
            <button
              onClick={onClose}
              className="text-white hover:bg-white hover:bg-opacity-20 p-2 rounded transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 relative bg-forvis-gray-50">
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <Loader2 className="w-8 h-8 text-forvis-blue-600 animate-spin mx-auto mb-2" />
                <p className="text-sm text-forvis-gray-600">Loading file...</p>
              </div>
            </div>
          )}

          {error && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center max-w-md mx-auto p-6">
                <p className="text-red-600 font-medium mb-4">{error}</p>
                <Button
                  variant="primary"
                  onClick={() => window.open(webUrl, '_blank')}
                  className="flex items-center gap-2"
                >
                  <ExternalLink className="w-4 h-4" />
                  Open in Office Online
                </Button>
              </div>
            </div>
          )}

          {embedUrl && !error && (
            <iframe
              src={embedUrl}
              className="w-full h-full border-0"
              onLoad={handleIframeLoad}
              onError={handleIframeError}
              title={fileName}
              sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
            />
          )}

          {!embedUrl && !error && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center max-w-md mx-auto p-6">
                <p className="text-forvis-gray-600 mb-4">
                  This file type cannot be previewed in the browser.
                </p>
                <Button
                  variant="primary"
                  onClick={() => window.open(webUrl, '_blank')}
                  className="flex items-center gap-2"
                >
                  <ExternalLink className="w-4 h-4" />
                  Open in Office Online
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


































