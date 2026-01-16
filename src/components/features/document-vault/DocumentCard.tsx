'use client';

import { FileText, Download, Calendar, Tag } from 'lucide-react';
import type { VaultDocumentListItemDTO } from '@/types/documentVault';

interface DocumentCardProps {
  document: VaultDocumentListItemDTO;
  onClick?: (documentId: number) => void;
}

export function DocumentCard({ document, onClick }: DocumentCardProps) {
  const handleClick = () => {
    if (onClick) {
      onClick(document.id);
    }
  };

  return (
    <div 
      onClick={handleClick}
      className="rounded-lg border border-forvis-blue-100 p-4 shadow-corporate hover:shadow-corporate-md transition-all duration-200 cursor-pointer h-full"
      style={{ background: 'linear-gradient(135deg, #F0F7FD 0%, #E0EDFB 100%)' }}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleClick();
        }
      }}
    >
        <div className="flex items-start gap-3">
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 transition-transform duration-200 group-hover:scale-110 shadow-sm"
            style={{ background: 'linear-gradient(135deg, #5B93D7 0%, #2E5AAC 100%)' }}
          >
            <FileText className="h-5 w-5 text-white" />
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <h3 className="text-base font-semibold text-forvis-gray-900 line-clamp-2">
                {document.title}
              </h3>
            </div>
            
            <div className="flex flex-wrap gap-2 mt-2">
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-forvis-blue-100 text-forvis-blue-800">
                {document.documentType}
              </span>
              <span 
                className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium text-white"
                style={{ backgroundColor: document.category.color || '#2E5AAC' }}
              >
                {document.category.name}
              </span>
              {document.scope === 'GLOBAL' ? (
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gradient-to-r from-purple-100 to-purple-200 text-purple-800 border border-purple-300">
                  Global
                </span>
              ) : (
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-forvis-gray-100 text-forvis-gray-700">
                  {document.serviceLine}
                </span>
              )}
            </div>

            {document.aiSummary && (
              <p className="text-sm text-forvis-gray-600 mt-3 line-clamp-2">
                {document.aiSummary}
              </p>
            )}

            {document.tags && document.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {document.tags.slice(0, 3).map((tag, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center text-xs px-1.5 py-0.5 rounded bg-white text-forvis-gray-600"
                  >
                    <Tag className="h-3 w-3 mr-1" />
                    {tag}
                  </span>
                ))}
                {document.tags.length > 3 && (
                  <span className="text-xs text-forvis-gray-500">
                    +{document.tags.length - 3} more
                  </span>
                )}
              </div>
            )}

            <div className="flex items-center justify-between mt-3 text-xs text-forvis-gray-500">
              <div className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {document.publishedAt ? new Date(document.publishedAt).toLocaleDateString() : 'Draft'}
              </div>
              <div className="flex items-center gap-1">
                v{document.version} • {(document.fileSize / 1024).toFixed(1)} KB
              </div>
            </div>
          </div>
        </div>
    </div>
  );
}
