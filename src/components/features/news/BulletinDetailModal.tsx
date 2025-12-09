'use client';

import { 
  XMarkIcon,
  ExclamationTriangleIcon,
  CalendarIcon,
  UserIcon,
  ArrowTopRightOnSquareIcon,
  ClockIcon,
  DocumentArrowDownIcon,
} from '@heroicons/react/24/outline';
import { MapPinIcon } from '@heroicons/react/24/solid';
import { NewsBulletin, BulletinCategory } from '@/types';
import { formatServiceLineName } from '@/lib/utils/serviceLineUtils';

interface BulletinDetailModalProps {
  bulletin: NewsBulletin;
  onClose: () => void;
}

const categoryColors: Record<BulletinCategory, { bg: string; text: string; border: string }> = {
  [BulletinCategory.ANNOUNCEMENT]: { bg: 'bg-blue-100', text: 'text-blue-800', border: 'border-blue-200' },
  [BulletinCategory.POLICY_UPDATE]: { bg: 'bg-purple-100', text: 'text-purple-800', border: 'border-purple-200' },
  [BulletinCategory.EVENT]: { bg: 'bg-pink-100', text: 'text-pink-800', border: 'border-pink-200' },
  [BulletinCategory.ACHIEVEMENT]: { bg: 'bg-green-100', text: 'text-green-800', border: 'border-green-200' },
  [BulletinCategory.REMINDER]: { bg: 'bg-yellow-100', text: 'text-yellow-800', border: 'border-yellow-200' },
  [BulletinCategory.CLIENT_WIN]: { bg: 'bg-teal-100', text: 'text-teal-800', border: 'border-teal-200' },
  [BulletinCategory.MARKET_UPDATE]: { bg: 'bg-indigo-100', text: 'text-indigo-800', border: 'border-indigo-200' },
  [BulletinCategory.INDUSTRY_NEWS]: { bg: 'bg-cyan-100', text: 'text-cyan-800', border: 'border-cyan-200' },
  [BulletinCategory.PARTNERSHIP]: { bg: 'bg-orange-100', text: 'text-orange-800', border: 'border-orange-200' },
  [BulletinCategory.HIRING]: { bg: 'bg-emerald-100', text: 'text-emerald-800', border: 'border-emerald-200' },
};

const categoryLabels: Record<BulletinCategory, string> = {
  [BulletinCategory.ANNOUNCEMENT]: 'Announcement',
  [BulletinCategory.POLICY_UPDATE]: 'Policy Update',
  [BulletinCategory.EVENT]: 'Event',
  [BulletinCategory.ACHIEVEMENT]: 'Achievement',
  [BulletinCategory.REMINDER]: 'Reminder',
  [BulletinCategory.CLIENT_WIN]: 'Client Win',
  [BulletinCategory.MARKET_UPDATE]: 'Market Update',
  [BulletinCategory.INDUSTRY_NEWS]: 'Industry News',
  [BulletinCategory.PARTNERSHIP]: 'Partnership',
  [BulletinCategory.HIRING]: 'Hiring',
};

function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString('en-ZA', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function formatShortDate(date: Date | string): string {
  return new Date(date).toLocaleDateString('en-ZA', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function BulletinDetailModal({ bulletin, onClose }: BulletinDetailModalProps) {
  const categoryStyle = categoryColors[bulletin.category] || categoryColors[BulletinCategory.ANNOUNCEMENT];
  const isExpired = bulletin.expiresAt && new Date(bulletin.expiresAt) < new Date();

  // Close on escape key
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    }
  };

  // Close on backdrop click
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
      onClick={handleBackdropClick}
      onKeyDown={handleKeyDown}
      role="dialog"
      aria-modal="true"
      aria-labelledby="bulletin-title"
    >
      <div className="bg-white rounded-xl shadow-corporate-lg max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="relative border-b border-forvis-gray-200">
          {/* Gradient Header Bar */}
          <div 
            className="h-2" 
            style={{ background: 'linear-gradient(135deg, #5B93D7 0%, #2E5AAC 100%)' }}
          />
          
          <div className="p-6 pb-4">
            {/* Close Button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 rounded-full text-forvis-gray-500 hover:text-forvis-gray-700 hover:bg-forvis-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-forvis-blue-500 focus:ring-offset-2"
              aria-label="Close"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>

            {/* Badges Row */}
            <div className="flex items-center gap-2 flex-wrap mb-4">
              {/* Category Badge */}
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${categoryStyle.bg} ${categoryStyle.text} border ${categoryStyle.border}`}>
                {categoryLabels[bulletin.category]}
              </span>
              
              {/* Service Line Badge */}
              {bulletin.serviceLine ? (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-forvis-gray-100 text-forvis-gray-700 border border-forvis-gray-200">
                  {formatServiceLineName(bulletin.serviceLine)}
                </span>
              ) : (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-forvis-blue-50 text-forvis-blue-700 border border-forvis-blue-200">
                  All Service Lines
                </span>
              )}

              {/* Pinned Indicator */}
              {bulletin.isPinned && (
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium bg-amber-50 text-amber-700 border border-amber-200">
                  <MapPinIcon className="h-4 w-4" />
                  Pinned
                </span>
              )}

              {/* Action Required Indicator */}
              {bulletin.actionRequired && (
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800 border border-red-200">
                  <ExclamationTriangleIcon className="h-4 w-4" />
                  Action Required
                </span>
              )}

              {/* Expired Badge */}
              {isExpired && (
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium bg-forvis-gray-100 text-forvis-gray-600 border border-forvis-gray-300">
                  <ClockIcon className="h-4 w-4" />
                  Expired
                </span>
              )}
            </div>

            {/* Title */}
            <h2 
              id="bulletin-title" 
              className="text-2xl font-semibold text-forvis-gray-900 pr-8"
            >
              {bulletin.title}
            </h2>

            {/* Summary */}
            <p className="mt-2 text-base text-forvis-gray-600 font-medium">
              {bulletin.summary}
            </p>
          </div>
        </div>

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="prose prose-sm max-w-none text-forvis-gray-700 whitespace-pre-wrap leading-relaxed">
            {bulletin.body}
          </div>

          {/* Document Link */}
          {bulletin.showDocumentLink && bulletin.documentFileName && (
            <div className="mt-6 pt-6 border-t border-forvis-gray-200">
              <h3 className="text-sm font-semibold text-forvis-gray-900 mb-3">Attached Document</h3>
              <a
                href={`/api/news/${bulletin.id}/document`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => {
                  e.stopPropagation();
                  // Fetch the document URL and open it
                  fetch(`/api/news/${bulletin.id}/document`)
                    .then(res => res.json())
                    .then(data => {
                      if (data.data?.url) {
                        window.open(data.data.url, '_blank');
                      }
                    })
                    .catch(err => console.error('Failed to get document URL:', err));
                  e.preventDefault();
                }}
                className="inline-flex items-center gap-2 px-4 py-3 text-sm font-medium text-purple-700 bg-purple-50 border border-purple-200 rounded-lg hover:bg-purple-100 hover:border-purple-300 transition-colors"
              >
                <DocumentArrowDownIcon className="h-5 w-5" />
                <div className="flex flex-col items-start">
                  <span>{bulletin.documentFileName}</span>
                  <span className="text-xs text-purple-600">
                    {(bulletin.documentFileSize! / 1024).toFixed(0)} KB • PDF Document
                  </span>
                </div>
              </a>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-forvis-gray-200 p-6 bg-forvis-gray-50">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            {/* Meta Information */}
            <div className="flex flex-wrap items-center gap-4 text-sm text-forvis-gray-600">
              {/* Effective Date */}
              <span className="inline-flex items-center gap-1.5">
                <CalendarIcon className="h-4 w-4 text-forvis-gray-400" />
                <span className="font-medium">Published:</span>
                {formatDate(bulletin.effectiveDate)}
              </span>

              {/* Expires At */}
              {bulletin.expiresAt && (
                <span className="inline-flex items-center gap-1.5">
                  <ClockIcon className="h-4 w-4 text-forvis-gray-400" />
                  <span className="font-medium">Expires:</span>
                  {formatShortDate(bulletin.expiresAt)}
                </span>
              )}

              {/* Contact Person */}
              {bulletin.contactPerson && (
                <span className="inline-flex items-center gap-1.5">
                  <UserIcon className="h-4 w-4 text-forvis-gray-400" />
                  <span className="font-medium">Contact:</span>
                  {bulletin.contactPerson}
                </span>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3">
              {/* Call to Action */}
              {bulletin.callToActionUrl && (
                <a
                  href={bulletin.callToActionUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-bold text-white rounded-lg shadow-lg hover:shadow-xl transition-all"
                  style={{ background: 'linear-gradient(135deg, #5B93D7 0%, #2E5AAC 100%)' }}
                >
                  {bulletin.callToActionText || 'Learn More'}
                  <ArrowTopRightOnSquareIcon className="h-4 w-4" />
                </a>
              )}

              {/* Close Button */}
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-forvis-gray-700 bg-white border border-forvis-gray-300 rounded-lg hover:bg-forvis-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-forvis-blue-500 focus:ring-offset-2"
              >
                Close
              </button>
            </div>
          </div>

          {/* Posted By */}
          {bulletin.createdBy && (
            <div className="mt-4 pt-4 border-t border-forvis-gray-200 text-xs text-forvis-gray-500">
              Posted by {bulletin.createdBy.name || bulletin.createdBy.email} on {formatShortDate(bulletin.createdAt)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
