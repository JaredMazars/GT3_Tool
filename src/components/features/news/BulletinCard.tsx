'use client';

import { 
  ExclamationTriangleIcon,
  CalendarIcon,
  UserIcon,
  ArrowTopRightOnSquareIcon,
  MapPinIcon as MapPinOutlineIcon,
  DocumentArrowDownIcon,
} from '@heroicons/react/24/outline';
import { MapPinIcon } from '@heroicons/react/24/solid';
import { NewsBulletin, BulletinCategory } from '@/types';
import { formatServiceLineName } from '@/lib/utils/serviceLineUtils';

interface BulletinCardProps {
  bulletin: NewsBulletin;
  onClick?: (bulletin: NewsBulletin) => void;
  onEdit?: (bulletin: NewsBulletin) => void;
  onDelete?: (bulletin: NewsBulletin) => void;
  onTogglePin?: (bulletin: NewsBulletin) => void;
  isAdmin?: boolean;
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
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function BulletinCard({ 
  bulletin, 
  onClick,
  onEdit, 
  onDelete, 
  onTogglePin,
  isAdmin = false 
}: BulletinCardProps) {
  const categoryStyle = categoryColors[bulletin.category] || categoryColors[BulletinCategory.ANNOUNCEMENT];
  const isExpired = bulletin.expiresAt && new Date(bulletin.expiresAt) < new Date();

  const handleCardClick = (e: React.MouseEvent) => {
    // Don't trigger if clicking on admin buttons or CTA link
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('a')) {
      return;
    }
    onClick?.(bulletin);
  };

  return (
    <div 
      onClick={handleCardClick}
      className={`group bg-white rounded-lg shadow-corporate hover:shadow-corporate-md transition-all duration-200 cursor-pointer ${
        bulletin.isPinned ? 'border-2 border-amber-300 ring-1 ring-amber-200' : 'border border-forvis-gray-200 hover:border-forvis-blue-500'
      } ${isExpired ? 'opacity-60' : ''}`}
    >
      <div className="p-5">
        {/* Header Row */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-2 flex-wrap">
            {/* Category Badge */}
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${categoryStyle.bg} ${categoryStyle.text} border ${categoryStyle.border}`}>
              {categoryLabels[bulletin.category]}
            </span>
            
            {/* Service Line Badge */}
            {bulletin.serviceLine ? (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-forvis-gray-100 text-forvis-gray-700 border border-forvis-gray-200">
                {formatServiceLineName(bulletin.serviceLine)}
              </span>
            ) : (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-forvis-blue-50 text-forvis-blue-700 border border-forvis-blue-200">
                All Service Lines
              </span>
            )}

            {/* Pinned Indicator */}
            {bulletin.isPinned && (
              <span className="inline-flex items-center text-amber-600">
                <MapPinIcon className="h-4 w-4" />
              </span>
            )}

            {/* Action Required Indicator */}
            {bulletin.actionRequired && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 border border-red-200">
                <ExclamationTriangleIcon className="h-3.5 w-3.5" />
                Action Required
              </span>
            )}
          </div>

          {/* Admin Actions */}
          {isAdmin && (
            <div className="flex items-center gap-1">
              <button
                onClick={() => onTogglePin?.(bulletin)}
                className="p-1.5 rounded-md text-forvis-gray-500 hover:text-amber-600 hover:bg-amber-50 transition-colors focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-1"
                title={bulletin.isPinned ? 'Unpin' : 'Pin to top'}
              >
                <MapPinOutlineIcon className="h-4 w-4" />
              </button>
              <button
                onClick={() => onEdit?.(bulletin)}
                className="p-1.5 rounded-md text-forvis-gray-500 hover:text-forvis-blue-600 hover:bg-forvis-blue-50 transition-colors focus:outline-none focus:ring-2 focus:ring-forvis-blue-500 focus:ring-offset-1"
                title="Edit"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </button>
              <button
                onClick={() => onDelete?.(bulletin)}
                className="p-1.5 rounded-md text-forvis-gray-500 hover:text-red-600 hover:bg-red-50 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-1"
                title="Delete"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          )}
        </div>

        {/* Title */}
        <h3 className="text-lg font-semibold text-forvis-gray-900 mb-2 group-hover:text-forvis-blue-600 transition-colors">
          {bulletin.title}
        </h3>

        {/* Summary */}
        <p className="text-sm text-forvis-gray-600 mb-4 line-clamp-2">
          {bulletin.summary}
        </p>

        {/* Body Content */}
        <div className="text-sm text-forvis-gray-700 mb-4 whitespace-pre-wrap line-clamp-4">
          {bulletin.body}
        </div>

        {/* Document Link */}
        {bulletin.showDocumentLink && bulletin.documentFileName && (
          <div className="mb-4">
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
              className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-purple-700 bg-purple-50 border border-purple-200 rounded-lg hover:bg-purple-100 hover:border-purple-300 transition-colors"
            >
              <DocumentArrowDownIcon className="h-4 w-4" />
              <span>{bulletin.documentFileName}</span>
              <span className="text-xs text-purple-600">
                ({(bulletin.documentFileSize! / 1024).toFixed(0)} KB)
              </span>
            </a>
          </div>
        )}

        {/* Footer Row */}
        <div className="flex items-center justify-between pt-3 border-t border-forvis-gray-100">
          <div className="flex items-center gap-4 text-xs text-forvis-gray-500">
            {/* Effective Date */}
            <span className="inline-flex items-center gap-1">
              <CalendarIcon className="h-3.5 w-3.5" />
              {formatDate(bulletin.effectiveDate)}
            </span>

            {/* Contact Person */}
            {bulletin.contactPerson && (
              <span className="inline-flex items-center gap-1">
                <UserIcon className="h-3.5 w-3.5" />
                {bulletin.contactPerson}
              </span>
            )}

            {/* Expired Badge */}
            {isExpired && (
              <span className="text-red-600 font-medium">
                Expired
              </span>
            )}
          </div>

          {/* Call to Action */}
          {bulletin.callToActionUrl && (
            <a
              href={bulletin.callToActionUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white rounded-md transition-all"
              style={{ background: 'linear-gradient(135deg, #5B93D7 0%, #2E5AAC 100%)' }}
            >
              {bulletin.callToActionText || 'Learn More'}
              <ArrowTopRightOnSquareIcon className="h-3.5 w-3.5" />
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
