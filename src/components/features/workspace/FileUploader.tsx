'use client';

import { useState, useRef, DragEvent, ChangeEvent } from 'react';
import { Upload, X, FileText, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui';

interface FileUploaderProps {
  folderId: number;
  taskId: number;
  onUploadComplete?: () => void;
  onClose?: () => void;
}

export function FileUploader({ folderId, taskId, onUploadComplete, onClose }: FileUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [description, setDescription] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      setSelectedFile(files[0] ?? null);
      setError(null);
    }
  };

  const handleFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      setSelectedFile(files[0] ?? null);
      setError(null);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setError('Please select a file');
      return;
    }

    setIsUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('folderId', folderId.toString());
      if (description) {
        formData.append('description', description);
      }

      const response = await fetch(`/api/tasks/${taskId}/workspace/files`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to upload file');
      }

      // Success
      setSelectedFile(null);
      setDescription('');
      onUploadComplete?.();
      onClose?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload file');
    } finally {
      setIsUploading(false);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow-corporate-lg max-w-2xl w-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-forvis-gray-900">Upload File</h2>
        {onClose && (
          <button
            onClick={onClose}
            className="text-forvis-gray-500 hover:text-forvis-gray-700 transition-colors"
            disabled={isUploading}
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Error message */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
          {error}
        </div>
      )}

      {/* Dropzone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`flex justify-center px-6 pt-5 pb-6 border-3 border-dashed rounded-xl transition-all ${
          isDragging
            ? 'border-forvis-blue-500 bg-forvis-blue-50'
            : 'border-forvis-blue-300'
        }`}
        style={{
          background: isDragging
            ? 'linear-gradient(135deg, #F0F7FD 0%, #E5F1FB 100%)'
            : 'linear-gradient(135deg, #F0F7FD 0%, #E5F1FB 100%)',
          borderWidth: '3px',
        }}
      >
        <div className="space-y-3 text-center">
          {selectedFile ? (
            <>
              <FileText className="mx-auto h-12 w-12 text-forvis-blue-600" />
              <div className="flex text-sm text-forvis-gray-700">
                <p className="font-medium">{selectedFile.name}</p>
              </div>
              <p className="text-xs text-forvis-gray-500">
                {formatFileSize(selectedFile.size)}
              </p>
              <button
                onClick={() => setSelectedFile(null)}
                className="text-sm text-forvis-blue-600 hover:text-forvis-blue-700 font-medium"
              >
                Choose different file
              </button>
            </>
          ) : (
            <>
              <Upload className="mx-auto h-12 w-12 text-forvis-blue-600" />
              <div className="flex text-sm text-forvis-gray-700">
                <label
                  htmlFor="file-upload"
                  className="relative cursor-pointer rounded-md font-medium text-forvis-blue-600 hover:text-forvis-blue-700 focus-within:outline-none"
                >
                  <span>Upload a file</span>
                  <input
                    id="file-upload"
                    ref={fileInputRef}
                    type="file"
                    className="sr-only"
                    onChange={handleFileSelect}
                    disabled={isUploading}
                  />
                </label>
                <p className="pl-1">or drag and drop</p>
              </div>
              <p className="text-xs text-forvis-gray-500">
                Office documents, PDFs, images up to 100MB
              </p>
            </>
          )}
        </div>
      </div>

      {/* Description */}
      <div className="mt-4">
        <label htmlFor="description" className="block text-sm font-medium text-forvis-gray-700 mb-1">
          Description (optional)
        </label>
        <textarea
          id="description"
          rows={3}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Add a description for this file..."
          className="w-full px-3 py-2 border border-forvis-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-forvis-blue-500 focus:border-transparent text-sm"
          disabled={isUploading}
        />
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-3 mt-6">
        {onClose && (
          <Button
            variant="secondary"
            onClick={onClose}
            disabled={isUploading}
          >
            Cancel
          </Button>
        )}
        <Button
          variant="primary"
          onClick={handleUpload}
          disabled={!selectedFile || isUploading}
        >
          {isUploading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Uploading...
            </>
          ) : (
            'Upload File'
          )}
        </Button>
      </div>
    </div>
  );
}

