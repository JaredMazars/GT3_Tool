'use client';

import { useState, useMemo } from 'react';
import {
  FileText,
  Download,
  FolderOpen,
  Search,
  X,
} from 'lucide-react';
import { useClientDocuments, downloadClientDocument } from '@/hooks/clients/useClientDocuments';
import { DocumentType, ClientDocument } from '@/types';
import { formatDate } from '@/lib/utils/taskUtils';

interface ClientDocumentsProps {
  GSClientID: string | number;
}

const DOCUMENT_TYPE_LABELS = {
  [DocumentType.ENGAGEMENT_LETTER]: 'Engagement Letters',
  [DocumentType.ADMINISTRATION]: 'Administration',
  [DocumentType.ADJUSTMENT]: 'Adjustments',
  [DocumentType.OPINION]: 'Opinions',
  [DocumentType.SARS]: 'SARS',
};

function formatFileSize(bytes: number): string {
  if (bytes === 0) return 'N/A';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

export function ClientDocuments({ GSClientID }: ClientDocumentsProps) {
  const [activeTab, setActiveTab] = useState<DocumentType>(DocumentType.ENGAGEMENT_LETTER);
  const [searchTerm, setSearchTerm] = useState('');
  const { data, isLoading, error } = useClientDocuments(GSClientID);

  const handleDownload = (doc: ClientDocument) => {
    downloadClientDocument(
      GSClientID,
      doc.documentType,
      doc.id,
      doc.taskId,
      doc.fileName
    );
  };

  const getDocumentsForTab = (): ClientDocument[] => {
    if (!data?.documents) return [];
    
    switch (activeTab) {
      case DocumentType.ENGAGEMENT_LETTER:
        return data.documents.engagementLetters;
      case DocumentType.ADMINISTRATION:
        return data.documents.administration;
      case DocumentType.ADJUSTMENT:
        return data.documents.adjustments;
      case DocumentType.OPINION:
        return data.documents.opinions;
      case DocumentType.SARS:
        return data.documents.sars;
      default:
        return [];
    }
  };

  // Filter documents by search term
  const filteredDocuments = useMemo(() => {
    if (!data?.documents) return [];
    
    const docs = getDocumentsForTab();
    if (!searchTerm.trim()) return docs;
    
    const searchLower = searchTerm.toLowerCase();
    return docs.filter((doc) => {
      return (
        doc.fileName?.toLowerCase().includes(searchLower) ||
        doc.taskName?.toLowerCase().includes(searchLower) ||
        doc.uploadedBy?.toLowerCase().includes(searchLower) ||
        doc.category?.toLowerCase().includes(searchLower) ||
        doc.referenceNumber?.toLowerCase().includes(searchLower) ||
        doc.subject?.toLowerCase().includes(searchLower) ||
        doc.description?.toLowerCase().includes(searchLower)
      );
    });
  }, [searchTerm, data?.documents, activeTab]);

  const getDocumentCount = (type: DocumentType): number => {
    if (!data?.documents) return 0;
    
    switch (type) {
      case DocumentType.ENGAGEMENT_LETTER:
        return data.documents.engagementLetters.length;
      case DocumentType.ADMINISTRATION:
        return data.documents.administration.length;
      case DocumentType.ADJUSTMENT:
        return data.documents.adjustments.length;
      case DocumentType.OPINION:
        return data.documents.opinions.length;
      case DocumentType.SARS:
        return data.documents.sars.length;
      default:
        return 0;
    }
  };

  const documents = filteredDocuments;

  if (error) {
    return (
      <div className="p-6 text-center">
        <p className="text-forvis-error-600">Failed to load documents. Please try again.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border-2 border-forvis-gray-200 shadow-corporate">
      {/* Header */}
      <div className="px-6 py-4 border-b border-forvis-gray-200">
        <h2 className="text-xl font-semibold text-forvis-gray-900">Client Documents</h2>
        <p className="mt-1 text-sm text-forvis-gray-600">
          All documents across all projects ({data?.totalCount || 0} total)
        </p>
      </div>

      {/* Tabs */}
      <div className="border-b border-forvis-gray-200">
        <nav className="flex -mb-px px-6" aria-label="Document Type Tabs">
          {Object.values(DocumentType).map((type) => {
            const count = getDocumentCount(type);
            const isActive = activeTab === type;
            
            return (
              <button
                key={type}
                onClick={() => setActiveTab(type)}
                className={`flex items-center space-x-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                  isActive
                    ? 'border-forvis-blue-600 text-forvis-blue-600'
                    : 'border-transparent text-forvis-gray-600 hover:text-forvis-gray-900 hover:border-forvis-gray-300'
                }`}
              >
                <span>{DOCUMENT_TYPE_LABELS[type]}</span>
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                    isActive
                      ? 'bg-forvis-blue-100 text-forvis-blue-700'
                      : 'bg-forvis-gray-100 text-forvis-gray-600'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Search Bar */}
      <div className="px-6 pt-4 pb-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-forvis-gray-400" />
          <input
            type="text"
            placeholder="Search documents by name, project, uploaded by, category..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 pr-10 py-2 w-full border border-forvis-gray-300 rounded-lg focus:ring-2 focus:ring-forvis-blue-500 focus:border-transparent text-sm"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-forvis-gray-400 hover:text-forvis-gray-600"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>
        {searchTerm && (
          <div className="mt-2 text-sm text-forvis-gray-600">
            Found <span className="font-medium">{documents.length}</span>{' '}
            document{documents.length !== 1 ? 's' : ''} matching "{searchTerm}"
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-6 pt-2">
        {isLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-forvis-blue-600 mx-auto"></div>
            <p className="mt-4 text-sm text-forvis-gray-600">Loading documents...</p>
          </div>
        ) : documents.length === 0 ? (
          <div className="text-center py-12">
            <FolderOpen className="mx-auto h-12 w-12 text-forvis-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-forvis-gray-900">
              {searchTerm ? 'No documents found' : `No ${DOCUMENT_TYPE_LABELS[activeTab].toLowerCase()}`}
            </h3>
            <p className="mt-1 text-sm text-forvis-gray-600">
              {searchTerm 
                ? `No documents match your search "${searchTerm}".`
                : `This client doesn't have any ${DOCUMENT_TYPE_LABELS[activeTab].toLowerCase()} yet.`
              }
            </p>
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="mt-4 text-sm text-forvis-blue-600 hover:text-forvis-blue-700 font-medium"
              >
                Clear search
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-forvis-gray-200">
              <thead className="bg-forvis-gray-50">
                <tr>
                  <th
                    scope="col"
                    className="px-4 py-3 text-left text-xs font-semibold text-forvis-gray-700 uppercase tracking-wider"
                  >
                    Document Name
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-3 text-left text-xs font-semibold text-forvis-gray-700 uppercase tracking-wider"
                  >
                    Project
                  </th>
                  {activeTab === DocumentType.ADMINISTRATION && (
                    <th
                      scope="col"
                      className="px-4 py-3 text-left text-xs font-semibold text-forvis-gray-700 uppercase tracking-wider"
                    >
                      Category
                    </th>
                  )}
                  {activeTab === DocumentType.OPINION && (
                    <th
                      scope="col"
                      className="px-4 py-3 text-left text-xs font-semibold text-forvis-gray-700 uppercase tracking-wider"
                    >
                      Category
                    </th>
                  )}
                  {activeTab === DocumentType.SARS && (
                    <th
                      scope="col"
                      className="px-4 py-3 text-left text-xs font-semibold text-forvis-gray-700 uppercase tracking-wider"
                    >
                      Reference
                    </th>
                  )}
                  {activeTab === DocumentType.ADJUSTMENT && (
                    <th
                      scope="col"
                      className="px-4 py-3 text-left text-xs font-semibold text-forvis-gray-700 uppercase tracking-wider"
                    >
                      Status
                    </th>
                  )}
                  <th
                    scope="col"
                    className="px-4 py-3 text-left text-xs font-semibold text-forvis-gray-700 uppercase tracking-wider"
                  >
                    Uploaded By
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-3 text-left text-xs font-semibold text-forvis-gray-700 uppercase tracking-wider"
                  >
                    Date
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-3 text-left text-xs font-semibold text-forvis-gray-700 uppercase tracking-wider"
                  >
                    Size
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-3 text-right text-xs font-semibold text-forvis-gray-700 uppercase tracking-wider"
                  >
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-forvis-gray-100">
                {documents.map((doc) => (
                  <tr key={`${doc.documentType}-${doc.id}`} className="hover:bg-forvis-gray-50">
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center">
                        <FileText className="h-5 w-5 text-forvis-gray-400 mr-2 flex-shrink-0" />
                        <span className="text-sm font-medium text-forvis-gray-900 truncate max-w-xs">
                          {doc.fileName}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="text-sm text-forvis-gray-600">{doc.taskName}</span>
                    </td>
                    {activeTab === DocumentType.ADMINISTRATION && (
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="text-sm text-forvis-gray-600">{doc.category || 'N/A'}</span>
                      </td>
                    )}
                    {activeTab === DocumentType.OPINION && (
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="text-sm text-forvis-gray-600">{doc.category || 'N/A'}</span>
                      </td>
                    )}
                    {activeTab === DocumentType.SARS && (
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="text-sm text-forvis-gray-600">{doc.referenceNumber || 'N/A'}</span>
                      </td>
                    )}
                    {activeTab === DocumentType.ADJUSTMENT && (
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            doc.extractionStatus === 'COMPLETED'
                              ? 'bg-forvis-success-100 text-forvis-success-700'
                              : doc.extractionStatus === 'PENDING'
                              ? 'bg-forvis-warning-100 text-forvis-warning-700'
                              : 'bg-forvis-error-100 text-forvis-error-700'
                          }`}
                        >
                          {doc.extractionStatus || 'N/A'}
                        </span>
                      </td>
                    )}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="text-sm text-forvis-gray-600">{doc.uploadedBy || 'System'}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-forvis-gray-600 whitespace-nowrap">{formatDate(doc.createdAt)}</span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="text-sm text-forvis-gray-600">{formatFileSize(doc.fileSize)}</span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-right">
                      <button
                        onClick={() => handleDownload(doc)}
                        className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-forvis-blue-600 hover:text-forvis-blue-700 hover:bg-forvis-blue-50 rounded-lg transition-colors"
                        title="Download document"
                      >
                        <Download className="h-4 w-4 mr-1" />
                        Download
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

