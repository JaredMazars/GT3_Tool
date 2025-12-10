'use client';

import { useState } from 'react';
import { FileText, Search, Trash2 } from 'lucide-react';
import { useAnalyticsDocuments, useDeleteAnalyticsDocument, useDeleteCreditRating } from '@/hooks/analytics/useClientAnalytics';
import { DeleteDocumentWithRatingsModal } from './DeleteDocumentWithRatingsModal';
import { ConfirmModal } from '@/components/shared/ConfirmModal';

interface AnalyticsDocumentsTabProps {
  clientId: string | number;  // Can be internal ID or GSClientID depending on context
}

export function AnalyticsDocumentsTab({ clientId }: AnalyticsDocumentsTabProps) {
  const GSClientID = clientId;  // Alias for backward compatibility with hooks
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('ALL');
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [showDeleteRatingsModal, setShowDeleteRatingsModal] = useState(false);
  const [documentToDelete, setDocumentToDelete] = useState<{ id: number; name: string } | null>(null);
  
  interface AffectedRating {
    id: number;
    ratingGrade: string;
    ratingScore: number;
    ratingDate: Date | string;
    confidence?: number;
  }
  const [affectedRatings, setAffectedRatings] = useState<AffectedRating[]>([]);
  const [isDeleting, setIsDeleting] = useState(false);

  // Modal state
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void | Promise<void>;
    variant?: 'danger' | 'warning' | 'info';
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });
  
  const { data: documentsData, isLoading } = useAnalyticsDocuments(GSClientID);
  const deleteMutation = useDeleteAnalyticsDocument();
  const deleteRatingMutation = useDeleteCreditRating();

  const documents = documentsData?.documents || [];

  const filteredDocuments = documents.filter((doc) => {
    const matchesSearch = searchTerm === '' || 
      doc.fileName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.documentType.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'ALL' || doc.documentType === filterType;
    return matchesSearch && matchesType;
  });

  const documentTypes = ['ALL', ...Array.from(new Set(documents.map((d) => d.documentType)))];

  const handleDelete = async (documentId: number, fileName: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Delete Document',
      message: `Are you sure you want to delete "${fileName}"? This action cannot be undone.`,
      variant: 'danger',
      onConfirm: async () => {
        setDeleteError(null);
        try {
          await deleteMutation.mutateAsync({ GSClientID, documentId });
        } catch (error) {
          // Check if this is a 409 conflict (document used in ratings)
          if (error && typeof error === 'object' && 'status' in error && error.status === 409 && 'ratingsAffected' in error) {
            // Show modal with affected ratings
            setDocumentToDelete({ id: documentId, name: fileName });
            setAffectedRatings((error as { ratingsAffected: AffectedRating[] }).ratingsAffected);
            setShowDeleteRatingsModal(true);
          } else {
            // Show error for other failures
            const errorMessage = error instanceof Error ? error.message : 'Failed to delete document';
            setDeleteError(errorMessage);
            // Auto-dismiss error after 10 seconds
            setTimeout(() => setDeleteError(null), 10000);
          }
        } finally {
          setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        }
      },
    });
  };

  const handleConfirmDeleteWithRatings = async () => {
    if (!documentToDelete || affectedRatings.length === 0) return;
    
    setIsDeleting(true);
    try {
      // Delete all affected ratings first
      for (const rating of affectedRatings) {
        await deleteRatingMutation.mutateAsync({
          GSClientID,
          ratingId: rating.id,
        });
      }
      
      // Now delete the document
      await deleteMutation.mutateAsync({
        GSClientID,
        documentId: documentToDelete.id,
      });
      
      // Close modal and reset state
      setShowDeleteRatingsModal(false);
      setDocumentToDelete(null);
      setAffectedRatings([]);
    } catch (error) {
      setDeleteError(error instanceof Error ? error.message : 'Failed to delete ratings/document');
      // Auto-dismiss error after 10 seconds
      setTimeout(() => setDeleteError(null), 10000);
      // Close modal on error
      setShowDeleteRatingsModal(false);
      setDocumentToDelete(null);
      setAffectedRatings([]);
    } finally {
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-forvis-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Delete Error */}
      {deleteError && (
        <div className="rounded-lg p-4 bg-red-50 border-2 border-red-200">
          <div className="flex items-start gap-3">
            <svg className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-red-900">Unable to Delete Document</h3>
              <p className="text-sm text-red-800 mt-1">{deleteError}</p>
            </div>
            <button
              onClick={() => setDeleteError(null)}
              className="text-red-400 hover:text-red-600"
            >
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Search and Filter */}
      <div className="card">
        <div className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-forvis-gray-400" />
              <input
                type="text"
                placeholder="Search documents..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 w-full border border-forvis-gray-300 rounded-lg focus:ring-2 focus:ring-forvis-blue-500 focus:border-transparent"
              />
            </div>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-4 py-2 border border-forvis-gray-300 rounded-lg focus:ring-2 focus:ring-forvis-blue-500 focus:border-transparent"
            >
              {documentTypes.map((type) => (
                <option key={type} value={type}>
                  {type === 'ALL' ? 'All Types' : type.replace(/_/g, ' ')}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Documents Table */}
      {filteredDocuments.length === 0 ? (
        <div className="text-center py-16 rounded-xl border-3 border-dashed shadow-lg" style={{ borderColor: '#2E5AAC', borderWidth: '3px', background: 'linear-gradient(135deg, #F8FBFE 0%, #EEF6FC 100%)' }}>
          <FileText className="mx-auto h-16 w-16" style={{ color: '#2E5AAC' }} />
          <h3 className="mt-4 text-lg font-bold" style={{ color: '#1C3667' }}>
            {documents.length === 0 ? 'No documents uploaded yet' : 'No documents match your search'}
          </h3>
          <p className="mt-2 text-sm font-medium" style={{ color: '#2E5AAC' }}>
            {documents.length === 0 
              ? 'Upload financial documents in the Upload & Analyze tab'
              : 'Try adjusting your search or filter criteria'
            }
          </p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full divide-y divide-forvis-gray-200">
              <thead style={{ background: 'linear-gradient(to right, #2E5AAC, #25488A)' }}>
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-bold text-white uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-white uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-white uppercase tracking-wider">
                    Upload Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-white uppercase tracking-wider">
                    Uploaded By
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-bold text-white uppercase tracking-wider">
                    Size
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-bold text-white uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-forvis-gray-200">
                {filteredDocuments.map((doc, index) => (
                  <tr 
                    key={doc.id} 
                    className={`hover:bg-forvis-blue-50 transition-colors ${
                      index % 2 === 0 ? 'bg-white' : 'bg-forvis-gray-50'
                    }`}
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <FileText className="h-5 w-5 text-forvis-blue-600 flex-shrink-0" />
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-forvis-gray-900 truncate">
                            {doc.fileName}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-forvis-blue-100 text-forvis-blue-800">
                        {doc.documentType.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-forvis-gray-600">
                      {new Date(doc.uploadedAt).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-sm text-forvis-gray-600">
                      {doc.uploadedBy}
                    </td>
                    <td className="px-6 py-4 text-sm text-forvis-gray-600 text-right">
                      {(doc.fileSize / 1024).toFixed(1)} KB
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button
                        onClick={() => handleDelete(doc.id, doc.fileName)}
                        disabled={deleteMutation.isPending}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-red-700 hover:text-red-900 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        title={deleteMutation.isPending ? 'Deleting...' : 'Delete document'}
                      >
                        {deleteMutation.isPending ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-700"></div>
                            Deleting...
                          </>
                        ) : (
                          <>
                            <Trash2 className="h-4 w-4" />
                            Delete
                          </>
                        )}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Results Summary */}
      {filteredDocuments.length > 0 && (
        <div className="text-sm text-forvis-gray-600 text-center">
          Showing {filteredDocuments.length} of {documents.length} document{documents.length !== 1 ? 's' : ''}
        </div>
      )}

      {/* Delete Document With Ratings Modal */}
      <DeleteDocumentWithRatingsModal
        isOpen={showDeleteRatingsModal}
        onClose={() => {
          setShowDeleteRatingsModal(false);
          setDocumentToDelete(null);
          setAffectedRatings([]);
        }}
        onConfirm={handleConfirmDeleteWithRatings}
        documentName={documentToDelete?.name || ''}
        affectedRatings={affectedRatings}
        isDeleting={isDeleting}
      />

      {/* Modals */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.title}
        message={confirmModal.message}
        variant={confirmModal.variant}
      />
    </div>
  );
}

