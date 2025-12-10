'use client';

import { useState, useRef } from 'react';
import { CloudUpload, FileText, CheckCircle, XCircle, BarChart3 } from 'lucide-react';
import { useAnalyticsDocuments, useUploadAnalyticsDocument, useGenerateCreditRating } from '@/hooks/analytics/useClientAnalytics';
import { AnalyticsDocumentType } from '@/types/analytics';

interface UploadAnalyzeTabProps {
  clientId: string | number;  // Can be internal ID or GSClientID depending on context
  onGenerateComplete?: () => void;
}

export function UploadAnalyzeTab({ clientId, onGenerateComplete }: UploadAnalyzeTabProps) {
  const GSClientID = clientId;  // Alias for backward compatibility with hooks
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedDocumentType, setSelectedDocumentType] = useState<AnalyticsDocumentType>(AnalyticsDocumentType.AFS);
  const [selectedDocumentIds, setSelectedDocumentIds] = useState<Set<number>>(new Set());
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [generateSuccess, setGenerateSuccess] = useState(false);

  const { data: documentsData, isLoading: isLoadingDocs } = useAnalyticsDocuments(GSClientID);
  const uploadMutation = useUploadAnalyticsDocument();
  const generateMutation = useGenerateCreditRating();

  const documents = documentsData?.documents || [];

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setUploadError(null);
    const file = files[0];
    if (!file) return;

    try {
      await uploadMutation.mutateAsync({
        GSClientID,
        file,
        documentType: selectedDocumentType,
      });
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : 'Failed to upload document');
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleToggleDocument = (docId: number) => {
    const newSelected = new Set(selectedDocumentIds);
    if (newSelected.has(docId)) {
      newSelected.delete(docId);
    } else {
      newSelected.add(docId);
    }
    setSelectedDocumentIds(newSelected);
  };

  const handleGenerateRating = async () => {
    if (selectedDocumentIds.size === 0) {
      setGenerateError('Please select at least one document');
      return;
    }

    setGenerateError(null);
    setGenerateSuccess(false);

    try {
      await generateMutation.mutateAsync({
        GSClientID,
        documentIds: Array.from(selectedDocumentIds),
      });
      setGenerateSuccess(true);
      setSelectedDocumentIds(new Set());
      
      // Call the callback after a short delay to show success message
      setTimeout(() => {
        if (onGenerateComplete) {
          onGenerateComplete();
        }
      }, 1500);
    } catch (error) {
      setGenerateError(error instanceof Error ? error.message : 'Failed to generate credit rating');
    }
  };

  const documentTypeOptions = [
    { value: AnalyticsDocumentType.AFS, label: 'Annual Financial Statements' },
    { value: AnalyticsDocumentType.MANAGEMENT_ACCOUNTS, label: 'Management Accounts' },
    { value: AnalyticsDocumentType.BANK_STATEMENTS, label: 'Bank Statements' },
    { value: AnalyticsDocumentType.CASH_FLOW, label: 'Cash Flow Statements' },
    { value: AnalyticsDocumentType.OTHER, label: 'Other' },
  ];

  return (
    <div className="space-y-6">
      {/* Success Message */}
      {generateSuccess && (
        <div className="rounded-xl p-4 border-2 shadow-corporate" style={{ background: 'linear-gradient(135deg, #EBF8F2 0%, #D1F0E1 100%)', borderColor: '#10B981' }}>
          <div className="flex items-center gap-3">
            <CheckCircle className="h-6 w-6 text-green-600 flex-shrink-0" />
            <div>
              <h3 className="font-bold text-green-900">Credit Rating Generated Successfully!</h3>
              <p className="text-sm text-green-800 mt-1">Redirecting to Credit Ratings tab...</p>
            </div>
          </div>
        </div>
      )}

      {/* Upload Section */}
      <div className="card">
        <div className="px-4 py-3 border-b border-forvis-gray-200" style={{ background: 'linear-gradient(to right, #2E5AAC, #25488A)' }}>
          <h2 className="text-lg font-bold text-white">Upload Financial Documents</h2>
        </div>

        <div className="p-6 space-y-4">
          {/* Document Type Selector */}
          <div>
            <label className="block text-sm font-medium text-forvis-gray-700 mb-2">
              Document Type
            </label>
            <select
              value={selectedDocumentType}
              onChange={(e) => setSelectedDocumentType(e.target.value as AnalyticsDocumentType)}
              className="block w-full px-4 py-2 border border-forvis-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-forvis-blue-500 focus:border-transparent"
            >
              {documentTypeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {/* File Upload Area */}
          <div
            className="flex justify-center px-6 pt-5 pb-6 border-3 border-dashed rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl cursor-pointer"
            style={{ borderColor: '#2E5AAC', borderWidth: '3px', background: 'linear-gradient(135deg, #F0F7FD 0%, #E5F1FB 100%)' }}
            onClick={() => fileInputRef.current?.click()}
          >
            <div className="space-y-2 text-center">
              <CloudUpload className="mx-auto h-10 w-10" style={{ color: '#2E5AAC' }} />
              <div className="text-sm" style={{ color: '#1C3667' }}>
                <label className="relative cursor-pointer font-bold transition-all" style={{ color: '#2E5AAC' }}>
                  <span>Upload a file</span>
                  <input
                    ref={fileInputRef}
                    type="file"
                    className="sr-only"
                    accept=".pdf,.xlsx,.xls,.csv,.png,.jpg,.jpeg"
                    onChange={handleFileSelect}
                    disabled={uploadMutation.isPending}
                  />
                </label>
                <p className="inline"> or drag and drop</p>
              </div>
              <p className="text-xs font-bold" style={{ color: '#2E5AAC' }}>
                PDF, Excel, CSV, or Images up to 10MB
              </p>
              {uploadMutation.isPending && (
                <div className="flex items-center justify-center gap-2 pt-2">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-forvis-blue-600"></div>
                  <span className="text-sm font-medium" style={{ color: '#2E5AAC' }}>Uploading...</span>
                </div>
              )}
            </div>
          </div>

          {/* Upload Error */}
          {uploadError && (
            <div className="rounded-lg p-3 bg-red-50 border border-red-200">
              <div className="flex items-center gap-2">
                <XCircle className="h-5 w-5 text-red-600" />
                <p className="text-sm text-red-800">{uploadError}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Select Documents Section */}
      <div className="card">
        <div className="px-4 py-3 border-b border-forvis-gray-200" style={{ background: 'linear-gradient(to right, #2E5AAC, #25488A)' }}>
          <h2 className="text-lg font-bold text-white">Select Documents for Analysis</h2>
        </div>

        <div className="p-6">
          {isLoadingDocs ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-forvis-blue-600"></div>
            </div>
          ) : documents.length === 0 ? (
            <div className="text-center py-16 rounded-xl border-3 border-dashed shadow-lg" style={{ borderColor: '#2E5AAC', borderWidth: '3px', background: 'linear-gradient(135deg, #F8FBFE 0%, #EEF6FC 100%)' }}>
              <FileText className="mx-auto h-16 w-16" style={{ color: '#2E5AAC' }} />
              <h3 className="mt-4 text-lg font-bold" style={{ color: '#1C3667' }}>No documents uploaded yet</h3>
              <p className="mt-2 text-sm font-medium" style={{ color: '#2E5AAC' }}>Upload financial documents above to get started</p>
            </div>
          ) : (
            <div className="space-y-3">
              {documents.map((doc) => (
                <div
                  key={doc.id}
                  className={`flex items-center gap-4 p-4 rounded-lg border-2 transition-all cursor-pointer ${
                    selectedDocumentIds.has(doc.id)
                      ? 'border-forvis-blue-500 bg-forvis-blue-50'
                      : 'border-forvis-gray-200 hover:border-forvis-gray-300 bg-white'
                  }`}
                  onClick={() => handleToggleDocument(doc.id)}
                >
                  <input
                    type="checkbox"
                    checked={selectedDocumentIds.has(doc.id)}
                    onChange={() => handleToggleDocument(doc.id)}
                    className="h-4 w-4 text-forvis-blue-500 border-forvis-gray-300 rounded focus:ring-forvis-blue-500"
                  />
                  <FileText className="h-6 w-6 text-forvis-blue-600 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-forvis-gray-900 truncate">{doc.fileName}</p>
                    <p className="text-xs text-forvis-gray-600">
                      {doc.documentType.replace(/_/g, ' ')} • Uploaded {new Date(doc.uploadedAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-xs text-forvis-gray-500">
                    {(doc.fileSize / 1024).toFixed(1)} KB
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Generate Button */}
        {documents.length > 0 && (
          <div className="px-6 pb-6">
            <button
              onClick={handleGenerateRating}
              disabled={selectedDocumentIds.size === 0 || generateMutation.isPending}
              className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 text-sm font-bold text-white rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ background: selectedDocumentIds.size > 0 ? 'linear-gradient(135deg, #5B93D7 0%, #2E5AAC 100%)' : '#9CA3AF' }}
            >
              {generateMutation.isPending ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  Generating Credit Rating...
                </>
              ) : (
                <>
                  <BarChart3 className="h-5 w-5" />
                  Generate Credit Rating ({selectedDocumentIds.size} document{selectedDocumentIds.size !== 1 ? 's' : ''} selected)
                </>
              )}
            </button>

            {generateError && (
              <div className="mt-3 rounded-lg p-3 bg-red-50 border border-red-200">
                <div className="flex items-center gap-2">
                  <XCircle className="h-5 w-5 text-red-600" />
                  <p className="text-sm text-red-800">{generateError}</p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

