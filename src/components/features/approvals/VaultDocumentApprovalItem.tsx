'use client';

import { FileText, FolderOpen, Calendar, Tag } from 'lucide-react';
import { GRADIENTS } from '@/lib/design-system/gradients';

interface VaultDocumentApprovalItemProps {
  workflowData: any;
}

export function VaultDocumentApprovalItem({ workflowData }: VaultDocumentApprovalItemProps) {
  const document = workflowData as any;

  return (
    <div className="space-y-4">
      {/* Document Info */}
      <div className="space-y-2">
        <div className="flex items-start gap-3">
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: GRADIENTS.icon.standard }}
          >
            <FileText className="h-5 w-5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-forvis-gray-900 break-words">
              {document?.title || 'Unknown Document'}
            </h3>
            <div className="flex items-center gap-2 mt-1 text-sm text-forvis-gray-600">
              <FolderOpen className="h-4 w-4" />
              <span>{document?.VaultDocumentCategory?.name || 'Uncategorized'}</span>
            </div>
          </div>
        </div>

        {document?.description && (
          <p className="text-sm text-forvis-gray-700 mt-2">
            {document.description}
          </p>
        )}
      </div>

      {/* Document Details Grid */}
      <div className="grid grid-cols-2 gap-4 pt-4 border-t border-forvis-gray-200">
        <div>
          <div className="text-xs font-medium text-forvis-gray-600 uppercase tracking-wider mb-1">
            Document Type
          </div>
          <div className="text-sm font-medium text-forvis-gray-900">
            {document?.documentType || 'Unknown'}
          </div>
        </div>

        <div>
          <div className="text-xs font-medium text-forvis-gray-600 uppercase tracking-wider mb-1">
            Scope
          </div>
          <div className="text-sm font-medium text-forvis-gray-900">
            {document?.scope === 'GLOBAL' ? 'Global' : document?.serviceLine || 'Service Line'}
          </div>
        </div>

        <div>
          <div className="text-xs font-medium text-forvis-gray-600 uppercase tracking-wider mb-1">
            File Name
          </div>
          <div className="text-sm font-medium text-forvis-gray-900 truncate">
            {document?.fileName || 'N/A'}
          </div>
        </div>

        <div>
          <div className="text-xs font-medium text-forvis-gray-600 uppercase tracking-wider mb-1">
            File Size
          </div>
          <div className="text-sm font-medium text-forvis-gray-900">
            {document?.fileSize ? `${(document.fileSize / 1024).toFixed(1)} KB` : 'N/A'}
          </div>
        </div>
      </div>

      {/* Dates */}
      {(document?.effectiveDate || document?.expiryDate) && (
        <div className="flex items-center gap-4 pt-4 border-t border-forvis-gray-200">
          {document?.effectiveDate && (
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4 text-forvis-gray-600" />
              <span className="text-forvis-gray-600">Effective:</span>
              <span className="font-medium text-forvis-gray-900">
                {new Date(document.effectiveDate).toLocaleDateString()}
              </span>
            </div>
          )}
          {document?.expiryDate && (
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4 text-forvis-gray-600" />
              <span className="text-forvis-gray-600">Expires:</span>
              <span className="font-medium text-forvis-gray-900">
                {new Date(document.expiryDate).toLocaleDateString()}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Tags */}
      {document?.tags && JSON.parse(document.tags).length > 0 && (
        <div className="pt-4 border-t border-forvis-gray-200">
          <div className="flex items-center gap-2 mb-2">
            <Tag className="h-4 w-4 text-forvis-gray-600" />
            <span className="text-xs font-medium text-forvis-gray-600 uppercase tracking-wider">
              Tags
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {JSON.parse(document.tags).map((tag: string, index: number) => (
              <span
                key={index}
                className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-forvis-blue-50 text-forvis-blue-700"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Uploader Info */}
      <div className="flex items-center gap-2 pt-4 border-t border-forvis-gray-200 text-sm text-forvis-gray-600">
        <span>Uploaded by:</span>
        <span className="font-medium text-forvis-gray-900">
          {document?.User?.name || document?.User?.email || 'Unknown'}
        </span>
      </div>
    </div>
  );
}
