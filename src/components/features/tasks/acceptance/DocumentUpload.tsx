'use client';

import { useState, useRef } from 'react';
import { CloudUpload, File, Trash2 } from 'lucide-react';
import { useUploadDocument, useAcceptanceDocuments, useDeleteDocument } from '@/hooks/acceptance/useAcceptanceQuestionnaire';
import { ConfirmModal } from '@/components/shared/ConfirmModal';
import { GRADIENTS } from '@/lib/design-system/gradients';

interface DocumentUploadProps {
  taskId: string;
  documentType?: 'WECHECK' | 'PONG' | 'OTHER';
  disabled?: boolean;
}

export function DocumentUpload({ taskId, documentType = 'OTHER', disabled }: DocumentUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const { data: documentsData } = useAcceptanceDocuments(taskId);
  const uploadMutation = useUploadDocument(taskId);
  const deleteMutation = useDeleteDocument(taskId);

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
    setConfirmModal({
      isOpen: true,
      title: 'Delete Document',
      message: 'Are you sure you want to delete this document? This action cannot be undone.',
      variant: 'danger',
      onConfirm: async () => {
        try {
          await deleteMutation.mutateAsync(documentId);
        } catch (error) {
          console.error('Failed to delete document:', error);
        } finally {
          setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        }
      },
    });
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
          background: isDragging ? undefined : GRADIENTS.dashboard.card,
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
          <CloudUpload className="mx-auto h-10 w-10" style={{ color: '#2E5AAC' }} />
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
                <File className="h-5 w-5 text-forvis-blue-500" />
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
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}

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


