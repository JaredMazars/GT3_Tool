'use client';

import { FileText, FileSpreadsheet, Presentation, Image, File, Download, Eye, Trash2, MoreVertical } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { formatDistanceToNow } from 'date-fns';

interface WorkspaceFile {
  id: number;
  name: string;
  fileType: string;
  fileSize: number | string;
  thumbnailUrl: string | null;
  uploadedBy: string;
  createdAt: string;
  lastModifiedAt: string | null;
  webUrl: string;
}

interface FileGridProps {
  files: WorkspaceFile[];
  onView?: (file: WorkspaceFile) => void;
  onDownload?: (file: WorkspaceFile) => void;
  onDelete?: (file: WorkspaceFile) => void;
  viewMode?: 'grid' | 'list';
}

function getFileIcon(fileType: string) {
  const type = fileType.toLowerCase();
  
  if (type === 'docx' || type === 'doc') {
    return <FileText className="w-8 h-8 text-blue-600" />;
  }
  if (type === 'xlsx' || type === 'xls' || type === 'csv') {
    return <FileSpreadsheet className="w-8 h-8 text-green-600" />;
  }
  if (type === 'pptx' || type === 'ppt') {
    return <Presentation className="w-8 h-8 text-orange-600" />;
  }
  if (type === 'png' || type === 'jpg' || type === 'jpeg' || type === 'gif') {
    return <Image className="w-8 h-8 text-purple-600" />;
  }
  
  return <File className="w-8 h-8 text-forvis-gray-500" />;
}

function formatFileSize(size: number | string): string {
  const sizeNum = typeof size === 'string' ? parseInt(size, 10) : size;
  
  if (sizeNum < 1024) return `${sizeNum} B`;
  if (sizeNum < 1024 * 1024) return `${(sizeNum / 1024).toFixed(1)} KB`;
  return `${(sizeNum / (1024 * 1024)).toFixed(1)} MB`;
}

function FileActions({ file, onView, onDownload, onDelete }: {
  file: WorkspaceFile;
  onView?: (file: WorkspaceFile) => void;
  onDownload?: (file: WorkspaceFile) => void;
  onDelete?: (file: WorkspaceFile) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
    
    return undefined;
  }, [isOpen]);

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-1 hover:bg-forvis-gray-100 rounded transition-colors"
      >
        <MoreVertical className="w-4 h-4 text-forvis-gray-600" />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-1 w-40 bg-white rounded-lg shadow-corporate-lg border border-forvis-gray-200 z-10">
          {onView && (
            <button
              onClick={() => {
                onView(file);
                setIsOpen(false);
              }}
              className="w-full flex items-center gap-2 px-4 py-2 text-sm text-forvis-gray-700 hover:bg-forvis-blue-50 first:rounded-t-lg"
            >
              <Eye className="w-4 h-4" />
              Open
            </button>
          )}
          {onDownload && (
            <button
              onClick={() => {
                onDownload(file);
                setIsOpen(false);
              }}
              className="w-full flex items-center gap-2 px-4 py-2 text-sm text-forvis-gray-700 hover:bg-forvis-blue-50"
            >
              <Download className="w-4 h-4" />
              Download
            </button>
          )}
          {onDelete && (
            <button
              onClick={() => {
                onDelete(file);
                setIsOpen(false);
              }}
              className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 last:rounded-b-lg"
            >
              <Trash2 className="w-4 h-4" />
              Delete
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export function FileGrid({ files, onView, onDownload, onDelete, viewMode = 'grid' }: FileGridProps) {
  if (files.length === 0) {
    return (
      <div className="text-center py-12">
        <File className="w-12 h-12 text-forvis-gray-400 mx-auto mb-3" />
        <p className="text-forvis-gray-600 font-medium">No files yet</p>
        <p className="text-sm text-forvis-gray-500 mt-1">Upload a file to get started</p>
      </div>
    );
  }

  if (viewMode === 'list') {
    return (
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-forvis-gray-50 border-b border-forvis-gray-200">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-forvis-gray-600 uppercase">Name</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-forvis-gray-600 uppercase">Size</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-forvis-gray-600 uppercase">Modified</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-forvis-gray-600 uppercase">Uploaded By</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-forvis-gray-600 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-forvis-gray-200">
            {files.map((file) => (
              <tr key={file.id} className="hover:bg-forvis-gray-50 transition-colors">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    {getFileIcon(file.fileType)}
                    <span className="text-sm font-medium text-forvis-gray-900">{file.name}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-sm text-forvis-gray-600">
                  {formatFileSize(file.fileSize)}
                </td>
                <td className="px-4 py-3 text-sm text-forvis-gray-600">
                  {formatDistanceToNow(new Date(file.lastModifiedAt || file.createdAt), { addSuffix: true })}
                </td>
                <td className="px-4 py-3 text-sm text-forvis-gray-600">
                  {file.uploadedBy}
                </td>
                <td className="px-4 py-3 text-right">
                  <FileActions
                    file={file}
                    onView={onView}
                    onDownload={onDownload}
                    onDelete={onDelete}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {files.map((file) => (
        <div
          key={file.id}
          className="bg-white rounded-lg border border-forvis-gray-200 shadow-sm hover:shadow-corporate transition-all cursor-pointer group"
        >
          {/* Thumbnail or icon */}
          <div
            className="h-32 rounded-t-lg flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #F0F7FD 0%, #E0EDFB 100%)' }}
          >
            {file.thumbnailUrl ? (
              <img
                src={file.thumbnailUrl}
                alt={file.name}
                className="w-full h-full object-cover rounded-t-lg"
              />
            ) : (
              getFileIcon(file.fileType)
            )}
          </div>

          {/* File info */}
          <div className="p-3">
            <div className="flex items-start justify-between gap-2 mb-2">
              <h3 className="text-sm font-medium text-forvis-gray-900 truncate flex-1" title={file.name}>
                {file.name}
              </h3>
              <FileActions
                file={file}
                onView={onView}
                onDownload={onDownload}
                onDelete={onDelete}
              />
            </div>
            
            <div className="space-y-1">
              <p className="text-xs text-forvis-gray-600">
                {formatFileSize(file.fileSize)}
              </p>
              <p className="text-xs text-forvis-gray-500">
                {formatDistanceToNow(new Date(file.lastModifiedAt || file.createdAt), { addSuffix: true })}
              </p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}


