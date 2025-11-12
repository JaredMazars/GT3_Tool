'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  DocumentTextIcon,
  ArrowUpTrayIcon,
  TrashIcon,
  CheckCircleIcon,
  ClockIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline';
import { OpinionDocument } from '@/types';

interface DocumentManagerProps {
  projectId: number;
  draftId: number;
}

const DOCUMENT_CATEGORIES = [
  'Financial_Statement',
  'Tax_Return',
  'Correspondence',
  'Assessment',
  'Supporting_Document',
  'Other',
];

export default function DocumentManager({ projectId, draftId }: DocumentManagerProps) {
  const [documents, setDocuments] = useState<OpinionDocument[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);

  useEffect(() => {
    fetchDocuments();
  }, [draftId]);

  // Poll for updates only when there are documents being processed
  useEffect(() => {
    const hasProcessingDocs = documents.some(doc => !doc.vectorized);
    
    if (!hasProcessingDocs) return;
    
    const interval = setInterval(() => {
      fetchDocuments(true); // Silent update - don't show loading spinner
    }, 3000);
    
    return () => clearInterval(interval);
  }, [documents]);

  const fetchDocuments = async (silent = false) => {
    if (!silent) setIsLoading(true);
    try {
      const response = await fetch(
        `/api/projects/${projectId}/opinion-drafts/${draftId}/documents`
      );
      if (!response.ok) throw new Error('Failed to fetch documents');
      const data = await response.json();
      setDocuments(data.data || []);
    } catch (error) {
      console.error('Error fetching documents:', error);
      if (!silent) setError('Failed to load documents');
    } finally {
      if (!silent) setIsLoading(false);
    }
  };

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragActive(false);

      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        handleFiles(e.dataTransfer.files);
      }
    },
    []
  );

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFiles(e.target.files);
    }
  };

  const handleFiles = async (fileList: FileList) => {
    const files = Array.from(fileList);

    for (const file of files) {
      await uploadFile(file);
    }
  };

  const uploadFile = async (file: File, category: string = 'Other') => {
    setUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('category', category);

      const response = await fetch(
        `/api/projects/${projectId}/opinion-drafts/${draftId}/documents`,
        {
          method: 'POST',
          body: formData,
        }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to upload document');
      }

      await fetchDocuments();
    } catch (error: any) {
      console.error('Error uploading document:', error);
      setError(error.message || 'Failed to upload document');
    } finally {
      setUploading(false);
    }
  };

  const deleteDocument = async (documentId: number) => {
    if (!confirm('Are you sure you want to delete this document?')) return;

    try {
      const response = await fetch(
        `/api/projects/${projectId}/opinion-drafts/${draftId}/documents?documentId=${documentId}`,
        { method: 'DELETE' }
      );

      if (!response.ok) throw new Error('Failed to delete document');

      await fetchDocuments();
    } catch (error) {
      console.error('Error deleting document:', error);
      setError('Failed to delete document');
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const getCategoryDisplay = (category: string) => {
    return category.replace(/_/g, ' ');
  };

  const getStatusIcon = (doc: OpinionDocument) => {
    if (doc.vectorized) {
      return <CheckCircleIcon className="w-5 h-5 text-green-600" title="Indexed and ready for AI search" />;
    } else {
      return <ClockIcon className="w-5 h-5 text-yellow-600 animate-spin" title="Processing embeddings in background" />;
    }
  };

  const getStatusText = (doc: OpinionDocument) => {
    if (doc.vectorized) {
      return 'Ready for AI search';
    } else if (doc.extractedText) {
      return 'Generating embeddings...';
    } else {
      return 'Extracting text...';
    }
  };

  const groupByCategory = () => {
    const grouped: Record<string, OpinionDocument[]> = {};
    documents.forEach((doc) => {
      if (!grouped[doc.category]) {
        grouped[doc.category] = [];
      }
      grouped[doc.category]!.push(doc);
    });
    return grouped;
  };

  const groupedDocs = groupByCategory();

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="bg-white border-b-2 border-forvis-blue-600 px-6 py-4">
        <h3 className="text-lg font-bold text-forvis-gray-900">Documents</h3>
        <p className="text-sm text-forvis-gray-600">
          Upload client documents for AI analysis ({documents.length} uploaded)
        </p>
      </div>

      {/* Upload Area */}
      <div className="px-6 py-4 bg-forvis-gray-50">
        <div
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
            dragActive
              ? 'border-forvis-blue-600 bg-forvis-blue-50'
              : 'border-forvis-gray-300 hover:border-forvis-blue-400'
          }`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <ArrowUpTrayIcon className="w-12 h-12 mx-auto text-forvis-gray-400 mb-3" />
          <p className="text-sm font-semibold text-forvis-gray-900 mb-1">
            Drop files here or click to upload
          </p>
          <p className="text-xs text-forvis-gray-600 mb-4">
            Supported formats: PDF, Word, Text (Max 50MB)
          </p>
          <input
            type="file"
            id="file-upload"
            className="hidden"
            onChange={handleFileInput}
            multiple
            accept=".pdf,.doc,.docx,.txt"
            disabled={uploading}
          />
          <label
            htmlFor="file-upload"
            className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-forvis-blue-500 to-forvis-blue-700 text-white rounded-lg hover:from-forvis-blue-600 hover:to-forvis-blue-800 cursor-pointer transition-all text-sm font-semibold disabled:opacity-50"
          >
            <ArrowUpTrayIcon className="w-5 h-5" />
            Select Files
          </label>
          {uploading && (
            <p className="text-sm text-forvis-blue-600 mt-3 font-medium">Uploading...</p>
          )}
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="px-6 py-3 bg-red-50 border-y border-red-200">
          <div className="flex items-center gap-2">
            <XCircleIcon className="w-5 h-5 text-red-600" />
            <p className="text-sm text-red-600">{error}</p>
          </div>
        </div>
      )}

      {/* Documents List */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        {isLoading ? (
          <div className="flex justify-center items-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-forvis-blue-600"></div>
          </div>
        ) : documents.length === 0 ? (
          <div className="text-center py-12">
            <DocumentTextIcon className="w-16 h-16 mx-auto text-forvis-gray-400 mb-4" />
            <h4 className="text-lg font-semibold text-forvis-gray-900 mb-2">
              No Documents Yet
            </h4>
            <p className="text-sm text-forvis-gray-600">
              Upload client documents to enable AI-powered research and analysis
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(groupedDocs).map(([category, docs]) => (
              <div key={category}>
                <h4 className="text-sm font-bold text-forvis-gray-700 mb-3 uppercase tracking-wide">
                  {getCategoryDisplay(category)}
                </h4>
                <div className="space-y-2">
                  {docs.map((doc) => (
                    <div
                      key={doc.id}
                      className="bg-white border border-forvis-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3 flex-1">
                          <DocumentTextIcon className="w-6 h-6 text-forvis-blue-600 flex-shrink-0 mt-1" />
                          <div className="flex-1 min-w-0">
                            <h5 className="text-sm font-semibold text-forvis-gray-900 truncate">
                              {doc.fileName}
                            </h5>
                            <div className="flex items-center gap-3 mt-1">
                              <span className="text-xs text-forvis-gray-600">
                                {formatFileSize(doc.fileSize)}
                              </span>
                              <span className="text-xs text-forvis-gray-500">•</span>
                              <span className="text-xs text-forvis-gray-600">
                                {new Date(doc.createdAt).toLocaleDateString()}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 mt-2">
                              {getStatusIcon(doc)}
                              <span className="text-xs text-forvis-gray-600">
                                {getStatusText(doc)}
                              </span>
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={() => deleteDocument(doc.id)}
                          className="p-2 hover:bg-red-50 rounded-lg transition-colors group"
                          title="Delete document"
                        >
                          <TrashIcon className="w-5 h-5 text-forvis-gray-400 group-hover:text-red-600" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

