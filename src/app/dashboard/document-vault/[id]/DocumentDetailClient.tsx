'use client';

import { useState, useEffect } from 'react';
import { Download, Calendar, Tag, ArrowLeft, FileText, Sparkles } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Button, LoadingSpinner } from '@/components/ui';

export function DocumentDetailClient({ documentId }: { documentId: string }) {
  const router = useRouter();
  const [document, setDocument] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDownloading, setIsDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/document-vault/${documentId}`)
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setDocument(data.data);
        } else {
          setError(data.error || 'Failed to load document');
        }
      })
      .catch(err => {
        setError('Failed to load document');
        console.error(err);
      })
      .finally(() => setIsLoading(false));
  }, [documentId]);

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      const response = await fetch(`/api/document-vault/${documentId}/download`);
      const data = await response.json();
      
      if (data.success) {
        // Open download URL
        window.open(data.data.downloadUrl, '_blank');
      } else {
        alert('Failed to download document');
      }
    } catch (err) {
      alert('Failed to download document');
      console.error(err);
    } finally {
      setIsDownloading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <LoadingSpinner />
      </div>
    );
  }

  if (error || !document) {
    return (
      <div className="space-y-4">
        <Button variant="secondary" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">
          {error || 'Document not found'}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <Button variant="secondary" onClick={() => router.back()}>
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Vault
      </Button>

      {/* Document Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <h1 className="text-3xl font-semibold text-forvis-gray-900">{document.title}</h1>
          <div className="flex flex-wrap gap-2 mt-3">
            <span className="inline-flex items-center px-3 py-1 rounded-md text-sm font-medium bg-forvis-blue-100 text-forvis-blue-800">
              {document.documentType}
            </span>
            <span 
              className="inline-flex items-center px-3 py-1 rounded-md text-sm font-medium text-white"
              style={{ backgroundColor: document.Category.color || '#2E5AAC' }}
            >
              {document.Category.name}
            </span>
            {document.serviceLine && (
              <span className="inline-flex items-center px-3 py-1 rounded-md text-sm font-medium bg-forvis-gray-100 text-forvis-gray-700">
                {document.serviceLine}
              </span>
            )}
            <span className="inline-flex items-center px-3 py-1 rounded-md text-sm font-medium bg-green-100 text-green-800">
              v{document.version}
            </span>
          </div>
        </div>
        <Button variant="primary" onClick={handleDownload} disabled={isDownloading}>
          {isDownloading ? (
            <>
              <LoadingSpinner size="sm" />
              Downloading...
            </>
          ) : (
            <>
              <Download className="h-4 w-4 mr-2" />
              Download
            </>
          )}
        </Button>
      </div>

      {/* Description */}
      {document.description && (
        <div className="p-4 bg-white rounded-lg border border-forvis-gray-200">
          <p className="text-sm text-forvis-gray-700">{document.description}</p>
        </div>
      )}

      {/* AI Summary */}
      {document.aiSummary && (
        <div 
          className="rounded-lg border-2 p-6"
          style={{ background: 'linear-gradient(135deg, #F0F7FD 0%, #E0EDFB 100%)', borderColor: '#2E5AAC' }}
        >
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="h-5 w-5 text-forvis-blue-600" />
            <h3 className="text-xl font-semibold text-forvis-blue-600">
              AI-Generated Summary
            </h3>
          </div>
          <p className="text-sm text-forvis-gray-800 leading-relaxed">{document.aiSummary}</p>
        </div>
      )}

      {/* Key Points */}
      {document.aiKeyPoints && document.aiKeyPoints.length > 0 && (
        <div className="p-6 bg-white rounded-lg border border-forvis-gray-200">
          <h3 className="text-lg font-semibold text-forvis-gray-900 mb-4">Key Points</h3>
          <ul className="space-y-2">
            {document.aiKeyPoints.map((point: string, index: number) => (
              <li key={index} className="flex items-start gap-2 text-sm text-forvis-gray-700">
                <span className="text-forvis-blue-600 mt-1">•</span>
                <span>{point}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Metadata */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {document.effectiveDate && (
          <div className="p-4 bg-white rounded-lg border border-forvis-gray-200">
            <div className="text-xs font-medium text-forvis-gray-600 uppercase tracking-wider mb-1">
              Effective Date
            </div>
            <div className="text-sm font-medium text-forvis-gray-900">
              {new Date(document.effectiveDate).toLocaleDateString()}
            </div>
          </div>
        )}
        {document.expiryDate && (
          <div className="p-4 bg-white rounded-lg border border-forvis-gray-200">
            <div className="text-xs font-medium text-forvis-gray-600 uppercase tracking-wider mb-1">
              Expiry Date
            </div>
            <div className="text-sm font-medium text-forvis-gray-900">
              {new Date(document.expiryDate).toLocaleDateString()}
            </div>
          </div>
        )}
        <div className="p-4 bg-white rounded-lg border border-forvis-gray-200">
          <div className="text-xs font-medium text-forvis-gray-600 uppercase tracking-wider mb-1">
            Published
          </div>
          <div className="text-sm font-medium text-forvis-gray-900">
            {document.publishedAt ? new Date(document.publishedAt).toLocaleDateString() : 'N/A'}
          </div>
        </div>
        <div className="p-4 bg-white rounded-lg border border-forvis-gray-200">
          <div className="text-xs font-medium text-forvis-gray-600 uppercase tracking-wider mb-1">
            File Size
          </div>
          <div className="text-sm font-medium text-forvis-gray-900">
            {(document.fileSize / 1024).toFixed(1)} KB
          </div>
        </div>
      </div>

      {/* Tags */}
      {document.tags && document.tags.length > 0 && (
        <div className="p-6 bg-white rounded-lg border border-forvis-gray-200">
          <div className="flex items-center gap-2 mb-3">
            <Tag className="h-5 w-5 text-forvis-gray-600" />
            <h3 className="text-lg font-semibold text-forvis-gray-900">Tags</h3>
          </div>
          <div className="flex flex-wrap gap-2">
            {document.tags.map((tag: string, index: number) => (
              <span
                key={index}
                className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-forvis-blue-50 text-forvis-blue-700"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Version History */}
      {document.versions && document.versions.length > 1 && (
        <div className="p-6 bg-white rounded-lg border border-forvis-gray-200">
          <h3 className="text-lg font-semibold text-forvis-gray-900 mb-4">Version History</h3>
          <div className="space-y-2">
            {document.versions.map((version: any) => (
              <div
                key={version.id}
                className="flex items-center justify-between p-3 rounded-lg bg-forvis-gray-50"
              >
                <div className="flex items-center gap-3">
                  <FileText className="h-4 w-4 text-forvis-gray-600" />
                  <div>
                    <div className="text-sm font-medium text-forvis-gray-900">
                      Version {version.version}
                    </div>
                    <div className="text-xs text-forvis-gray-600">
                      {new Date(version.uploadedAt).toLocaleDateString()}
                      {version.changeNotes && ` • ${version.changeNotes}`}
                    </div>
                  </div>
                </div>
                {version.version !== document.version && (
                  <button
                    onClick={() => {
                      fetch(`/api/document-vault/${documentId}/download?version=${version.version}`)
                        .then(res => res.json())
                        .then(data => {
                          if (data.success) {
                            window.open(data.data.downloadUrl, '_blank');
                          }
                        });
                    }}
                    className="text-sm text-forvis-blue-600 hover:text-forvis-blue-700"
                  >
                    Download
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
