'use client';

import { useState, useRef } from 'react';
import { CloudArrowUpIcon, DocumentIcon, TrashIcon } from '@heroicons/react/24/outline';
import { useUploadDocument, useAcceptanceDocuments, useDeleteDocument } from '@/hooks/acceptance/useAcceptanceQuestionnaire';

interface DocumentUploadProps {
  projectId: string;
  documentType?: 'WECHECK' | 'PONG' | 'OTHER';
  disabled?: boolean;
}

export function DocumentUpload({ projectId, documentType = 'OTHER', disabled }: DocumentUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: documentsData } = useAcceptanceDocuments(projectId);
  const uploadMutation = useUploadDocument(projectId);
  const deleteMutation = useDeleteDocument(projectId);

  const documents = documentsData?.data || [];

  const handleFileSelect = async (file: File) => {
    try {
      await uploadMutation.mutateAsync({ file, documentType });
    } catch (error) {
      console.error('Failed to upload document:', error);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    if (disabled) return;

    const files = Array.from(e.dataTransfer.files);
    const file = files[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    const file = files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDelete = async (documentId: number) => {
    if (confirm('Are you sure you want to delete this document?')) {
      try {
        await deleteMutation.mutateAsync(documentId);
      } catch (error) {
        console.error('Failed to delete document:', error);
      }
    }
  };

  return (
    <div className="space-y-4">
      {/* Upload Area */}
      <div
        className={`
          flex justify-center px-6 pt-5 pb-6 border-3 border-dashed rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl
          ${isDragging ? 'border-forvis-blue-600 bg-forvis-blue-50' : ''}
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        `}
        style={{
          borderColor: '#2E5AAC',
          borderWidth: '3px',
          background: isDragging ? undefined : 'linear-gradient(135deg, #F0F7FD 0%, #E5F1FB 100%)',
        }}
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled) setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => {
          if (!disabled) fileInputRef.current?.click();
        }}
      >
        <div className="space-y-2 text-center">
          <CloudArrowUpIcon className="mx-auto h-10 w-10" style={{ color: '#2E5AAC' }} />
          <div className="flex text-sm" style={{ color: '#1C3667' }}>
            <span className="font-bold transition-all" style={{ color: '#2E5AAC' }}>
              Upload a file
            </span>
            <p className="pl-1">or drag and drop</p>
          </div>
          <p className="text-xs font-bold" style={{ color: '#2E5AAC' }}>
            {documentType === 'WECHECK' && 'WeCheck Report'}
            {documentType === 'PONG' && 'PONG Report'}
            {documentType === 'OTHER' && 'Supporting Document'}
          </p>
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        onChange={handleFileInputChange}
        disabled={disabled}
      />

      {/* Upload Progress */}
      {uploadMutation.isPending && (
        <div className="p-3 bg-forvis-blue-50 border border-forvis-blue-200 rounded-lg">
          <div className="flex items-center gap-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-forvis-blue-500"></div>
            <span className="text-sm text-forvis-blue-700">Uploading...</span>
          </div>
        </div>
      )}

      {/* Document List */}
      {documents.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-semibold text-forvis-gray-900">Uploaded Documents</h4>
          {documents.map((doc: { id: number; fileName: string; documentType: string; uploadedAt: string | Date }) => (
            <div
              key={doc.id}
              className="flex items-center justify-between p-3 bg-white border border-forvis-gray-200 rounded-lg hover:border-forvis-blue-300 transition-colors"
            >
              <div className="flex items-center gap-3">
                <DocumentIcon className="h-5 w-5 text-forvis-blue-500" />
                <div>
                  <p className="text-sm font-medium text-forvis-gray-900">{doc.fileName}</p>
                  <p className="text-xs text-forvis-gray-600">
                    {doc.documentType} • {new Date(doc.uploadedAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <button
                onClick={() => handleDelete(doc.id)}
                disabled={disabled || deleteMutation.isPending}
                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
              >
                <TrashIcon className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}


