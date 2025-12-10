'use client';

import { useState, useEffect } from 'react';
import { useTask } from '@/hooks/tasks/useTaskData';
import { AdministrationDocument } from '@/types';
import { Plus, Folder, FileText, Download } from 'lucide-react';

interface DocumentManagementPageProps {
  params: { id: string };
}

export default function DocumentManagementPage({ params }: DocumentManagementPageProps) {
  // Note: In client components, params is already resolved (not a Promise)
  const { data: _task } = useTask(params.id);
  const [documents, setDocuments] = useState<AdministrationDocument[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [filterCategory, setFilterCategory] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDocuments();
  }, [params.id]);

  const fetchDocuments = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/tasks/${params.id}/administration-documents`);
      if (!response.ok) throw new Error('Failed to fetch documents');
      const data = await response.json();
      setDocuments(data.data || []);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to fetch documents');
    } finally {
      setIsLoading(false);
    }
  };

  const categories = Array.from(new Set(documents.map(d => d.category)));
  const filteredDocuments = filterCategory 
    ? documents.filter(d => d.category === filterCategory)
    : documents;

  const groupedDocuments = filteredDocuments.reduce((acc, doc) => {
    if (!acc[doc.category]) {
      acc[doc.category] = [];
    }
    acc[doc.category]!.push(doc);
    return acc;
  }, {} as Record<string, AdministrationDocument[]>);

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-forvis-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-forvis-gray-900">Document Management</h2>
          <p className="text-sm text-forvis-gray-600 mt-1">Organize and manage project documents</p>
        </div>
        <button
          onClick={() => {/* File upload handler */}}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white rounded-lg transition-colors shadow-corporate"
          style={{ background: 'linear-gradient(135deg, #5B93D7 0%, #2E5AAC 100%)' }}
        >
          <Plus className="w-5 h-5" />
          Upload Document
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {/* Category Filter */}
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => setFilterCategory(null)}
          className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
            !filterCategory
              ? 'bg-forvis-blue-600 text-white'
              : 'bg-white text-forvis-gray-700 border border-forvis-gray-300 hover:bg-forvis-gray-50'
          }`}
        >
          All Documents ({documents.length})
        </button>
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setFilterCategory(cat)}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
              filterCategory === cat
                ? 'bg-forvis-blue-600 text-white'
                : 'bg-white text-forvis-gray-700 border border-forvis-gray-300 hover:bg-forvis-gray-50'
            }`}
          >
            {cat} ({documents.filter(d => d.category === cat).length})
          </button>
        ))}
      </div>

      {documents.length === 0 ? (
        <div className="bg-white rounded-lg shadow-corporate border-2 p-12 text-center" style={{ borderColor: '#2E5AAC' }}>
          <Folder className="w-16 h-16 mx-auto text-forvis-gray-400 mb-4" />
          <h3 className="text-lg font-semibold text-forvis-gray-900 mb-2">No Documents Yet</h3>
          <p className="text-sm text-forvis-gray-600">
            Upload documents to start organizing your project files.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedDocuments).map(([category, docs]) => (
            <div key={category} className="bg-white rounded-lg shadow-corporate border-2" style={{ borderColor: '#2E5AAC' }}>
              <div className="px-4 py-3 flex items-center gap-3" style={{ background: 'linear-gradient(135deg, #5B93D7 0%, #2E5AAC 100%)' }}>
                <Folder className="w-5 h-5 text-white" />
                <h3 className="text-sm font-bold text-white">{category} ({docs.length})</h3>
              </div>
              <div className="divide-y divide-forvis-gray-200">
                {docs.map((doc) => (
                  <div key={doc.id} className="p-4 flex items-center justify-between hover:bg-forvis-gray-50 transition-colors">
                    <div className="flex items-start gap-3 flex-1">
                      <FileText className="w-5 h-5 text-forvis-gray-400 mt-0.5" />
                      <div className="flex-1">
                        <h4 className="text-sm font-semibold text-forvis-gray-900">{doc.fileName}</h4>
                        {doc.description && (
                          <p className="text-xs text-forvis-gray-600 mt-1">{doc.description}</p>
                        )}
                        <div className="flex items-center gap-3 mt-1 text-xs text-forvis-gray-500">
                          <span>{formatFileSize(doc.fileSize)}</span>
                          <span>•</span>
                          <span>Version {doc.version}</span>
                          <span>•</span>
                          <span>Uploaded {new Date(doc.createdAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => {/* Download handler */}}
                      className="px-3 py-1.5 text-xs font-semibold text-forvis-blue-600 hover:text-forvis-blue-800 flex items-center gap-1"
                    >
                      <Download className="w-4 h-4" />
                      Download
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
