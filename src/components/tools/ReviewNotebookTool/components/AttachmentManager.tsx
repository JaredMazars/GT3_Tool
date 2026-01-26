/**
 * Attachment Manager Component
 * Handles clipboard paste, file uploads, and attachment previews for review notes
 */

'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Upload, X, FileText, Image as ImageIcon, File, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui';

interface AttachmentFile {
  id: string;
  file: File;
  preview?: string;
  status: 'pending' | 'uploading' | 'uploaded' | 'error';
  error?: string;
}

interface AttachmentManagerProps {
  maxFiles?: number;
  maxFileSize?: number; // in bytes
  onAttachmentsChange?: (files: File[]) => void;
  disabled?: boolean;
  showUploadButton?: boolean;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
  'text/csv',
];

export function AttachmentManager({
  maxFiles = 10,
  maxFileSize = MAX_FILE_SIZE,
  onAttachmentsChange,
  disabled = false,
  showUploadButton = true,
}: AttachmentManagerProps) {
  const [attachments, setAttachments] = useState<AttachmentFile[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Notify parent of changes
  useEffect(() => {
    if (onAttachmentsChange) {
      const files = attachments.map(a => a.file);
      onAttachmentsChange(files);
    }
  }, [attachments, onAttachmentsChange]);

  // Handle clipboard paste
  const handlePaste = useCallback((e: ClipboardEvent) => {
    if (disabled) return;
    
    const items = e.clipboardData?.items;
    if (!items) {
      return;
    }

    const files: File[] = [];
    
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      
      if (!item) continue;
      
      // Check if it's an image
      if (item.type.startsWith('image/')) {
        const file = item.getAsFile();
        if (file) {
          files.push(file);
        }
      }
    }

    if (files.length > 0) {
      e.preventDefault();
      handleFiles(files);
    }
  }, [disabled]);

  // Set up paste listener on document level to catch paste events regardless of focus
  useEffect(() => {
    // Listen on document for paste events
    document.addEventListener('paste', handlePaste as EventListener);
    
    return () => {
      document.removeEventListener('paste', handlePaste as EventListener);
    };
  }, [handlePaste]);

  // Validate file
  const validateFile = (file: File): string | null => {
    if (file.size > maxFileSize) {
      return `File size exceeds ${formatFileSize(maxFileSize)} limit`;
    }

    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return 'File type not allowed';
    }

    return null;
  };

  // Handle files (from paste, drop, or file picker)
  const handleFiles = (fileList: File[] | FileList) => {
    setError(null);
    const files = Array.from(fileList);

    // Check max files limit
    if (attachments.length + files.length > maxFiles) {
      setError(`Maximum ${maxFiles} files allowed`);
      return;
    }

    const newAttachments: AttachmentFile[] = [];

    for (const file of files) {
      const validationError = validateFile(file);
      
      if (validationError) {
        setError(validationError);
        continue;
      }

      const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const attachment: AttachmentFile = {
        id,
        file,
        status: 'pending',
      };

      // Create preview for images
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => {
          setAttachments(prev => 
            prev.map(a => a.id === id ? { ...a, preview: e.target?.result as string } : a)
          );
        };
        reader.readAsDataURL(file);
      }

      newAttachments.push(attachment);
    }

    if (newAttachments.length > 0) {
      setAttachments(prev => [...prev, ...newAttachments]);
    }
  };

  // Handle file input change
  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(e.target.files);
    }
    // Reset input so the same file can be selected again
    e.target.value = '';
  };

  // Handle drag events
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (disabled) return;

    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  // Handle drop
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (disabled) return;

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  };

  // Remove attachment
  const removeAttachment = (id: string) => {
    setAttachments(prev => prev.filter(a => a.id !== id));
    setError(null);
  };

  // Format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Get file icon
  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith('image/')) return ImageIcon;
    if (fileType.includes('pdf')) return FileText;
    if (fileType.includes('word') || fileType.includes('document')) return FileText;
    if (fileType.includes('excel') || fileType.includes('sheet')) return FileText;
    return File;
  };

  return (
    <div ref={containerRef} className="space-y-3">
      {/* Error message */}
      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-800">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Upload area */}
      {showUploadButton && (
        <div
          className={`border-2 border-dashed rounded-lg p-4 text-center transition-colors ${
            dragActive
              ? 'border-forvis-blue-500 bg-forvis-blue-50'
              : 'border-forvis-gray-300 bg-forvis-gray-50'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => !disabled && fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept={ALLOWED_MIME_TYPES.join(',')}
            onChange={handleFileInput}
            className="hidden"
            disabled={disabled}
          />
          
          <Upload className="w-8 h-8 mx-auto mb-2 text-forvis-gray-600" />
          <p className="text-sm text-forvis-gray-700 font-medium mb-1">
            Click to upload or drag and drop
          </p>
          <p className="text-xs text-forvis-gray-600">
            Or paste from clipboard (Ctrl/Cmd+V)
          </p>
          <p className="text-xs text-forvis-gray-500 mt-2">
            Max {maxFiles} files, {formatFileSize(maxFileSize)} each
          </p>
        </div>
      )}

      {/* Attachment previews */}
      {attachments.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-forvis-gray-700">
              Attachments ({attachments.length}/{maxFiles})
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {attachments.map((attachment) => {
              const FileIcon = getFileIcon(attachment.file.type);
              
              return (
                <div
                  key={attachment.id}
                  className="relative border border-forvis-gray-200 rounded-lg p-3 bg-white"
                >
                  {/* Remove button */}
                  {attachment.status !== 'uploading' && (
                    <button
                      onClick={() => removeAttachment(attachment.id)}
                      className="absolute top-2 right-2 p-1 bg-white rounded-full shadow-sm hover:bg-forvis-gray-100 transition-colors z-10"
                      disabled={disabled}
                    >
                      <X className="w-3 h-3 text-forvis-gray-600" />
                    </button>
                  )}

                  {/* Preview */}
                  <div className="mb-2">
                    {attachment.preview ? (
                      <img
                        src={attachment.preview}
                        alt={attachment.file.name}
                        className="w-full h-24 object-cover rounded"
                      />
                    ) : (
                      <div className="w-full h-24 flex items-center justify-center bg-forvis-gray-100 rounded">
                        <FileIcon className="w-8 h-8 text-forvis-gray-600" />
                      </div>
                    )}
                  </div>

                  {/* File info */}
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-forvis-gray-900 truncate" title={attachment.file.name}>
                      {attachment.file.name}
                    </p>
                    <p className="text-xs text-forvis-gray-600">
                      {formatFileSize(attachment.file.size)}
                    </p>

                    {/* Status indicator */}
                    {attachment.status === 'uploading' && (
                      <div className="flex items-center gap-1 text-xs text-forvis-blue-600">
                        <Loader2 className="w-3 h-3 animate-spin" />
                        <span>Uploading...</span>
                      </div>
                    )}
                    {attachment.status === 'error' && (
                      <p className="text-xs text-red-600">{attachment.error || 'Upload failed'}</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Helper text */}
      {!showUploadButton && attachments.length === 0 && (
        <p className="text-sm text-forvis-gray-600 text-center py-2">
          Paste images from clipboard (Ctrl/Cmd+V)
        </p>
      )}
    </div>
  );
}

