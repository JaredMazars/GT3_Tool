'use client';

import { 
  AlertTriangle,
  Calendar,
  User,
  ExternalLink,
  MapPin,
  FileDown,
} from 'lucide-react';
import { NewsBulletin, BulletinCategory } from '@/types';
import { Badge, BadgeVariant } from '@/components/ui';
import { formatServiceLineName } from '@/lib/utils/serviceLineUtils';

interface BulletinCardProps {
  bulletin: NewsBulletin;
  onClick?: (bulletin: NewsBulletin) => void;
  onEdit?: (bulletin: NewsBulletin) => void;
  onDelete?: (bulletin: NewsBulletin) => void;
  onTogglePin?: (bulletin: NewsBulletin) => void;
  isAdmin?: boolean;
}

const categoryVariants: Record<BulletinCategory, BadgeVariant> = {
  [BulletinCategory.ANNOUNCEMENT]: 'blue',
  [BulletinCategory.POLICY_UPDATE]: 'purple',
  [BulletinCategory.EVENT]: 'pink',
  [BulletinCategory.ACHIEVEMENT]: 'green',
  [BulletinCategory.REMINDER]: 'yellow',
  [BulletinCategory.CLIENT_WIN]: 'teal',
  [BulletinCategory.MARKET_UPDATE]: 'indigo',
  [BulletinCategory.INDUSTRY_NEWS]: 'cyan',
  [BulletinCategory.PARTNERSHIP]: 'orange',
  [BulletinCategory.HIRING]: 'emerald',
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
  const categoryVariant = categoryVariants[bulletin.category] || 'blue';
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
      className={`group overflow-hidden rounded-lg shadow-corporate hover:shadow-corporate-md transition-all duration-200 cursor-pointer ${
        bulletin.isPinned ? 'ring-2 ring-amber-400' : ''
      } ${isExpired ? 'opacity-60' : ''}`}
    >
      {/* Premium Gold Header */}
      <div 
        className="px-5 pt-4 pb-3 border-2"
        style={{ 
          background: 'linear-gradient(135deg, #D9CBA8 0%, #B0A488 100%)', 
          borderColor: '#C9BCAA'
        }}
      >
        {/* Header Row */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-2 flex-wrap">
            {/* Category Badge */}
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-white/90 text-forvis-gray-900 border border-white shadow-sm">
              {categoryLabels[bulletin.category]}
            </span>
            
            {/* Service Line Badge */}
            {bulletin.serviceLine ? (
              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-white/90 text-forvis-gray-900 border border-white shadow-sm">
                {formatServiceLineName(bulletin.serviceLine)}
              </span>
            ) : (
              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-white/90 text-forvis-gray-900 border border-white shadow-sm">
                All Service Lines
              </span>
            )}

            {/* Pinned Indicator */}
            {bulletin.isPinned && (
              <span className="inline-flex items-center px-2.5 py-1 gap-1 rounded-full text-xs font-medium bg-white/90 text-amber-700 border border-white shadow-sm">
                <MapPin className="h-3.5 w-3.5" />
                Pinned
              </span>
            )}

            {/* Action Required Indicator */}
            {bulletin.actionRequired && (
              <span className="inline-flex items-center px-2.5 py-1 gap-1 rounded-full text-xs font-medium bg-white/90 text-red-700 border border-white shadow-sm">
                <AlertTriangle className="h-3.5 w-3.5" />
                Action Required
              </span>
            )}
          </div>

          {/* Admin Actions */}
          {isAdmin && (
            <div className="flex items-center gap-1">
              <button
                onClick={() => onTogglePin?.(bulletin)}
                className="p-1.5 rounded-md text-white hover:bg-white/20 transition-colors focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-1"
                title={bulletin.isPinned ? 'Unpin' : 'Pin to top'}
              >
                <MapPin className="h-4 w-4" />
              </button>
              <button
                onClick={() => onEdit?.(bulletin)}
                className="p-1.5 rounded-md text-white hover:bg-white/20 transition-colors focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-1"
                title="Edit"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </button>
              <button
                onClick={() => onDelete?.(bulletin)}
                className="p-1.5 rounded-md text-white hover:bg-white/20 transition-colors focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-1"
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
        <h3 className="text-lg font-semibold text-white mb-2">
          {bulletin.title}
        </h3>

        {/* Summary */}
        <p className="text-sm text-white/95 line-clamp-2">
          {bulletin.summary}
        </p>
      </div>

      {/* White Content Area */}
      <div className="bg-white p-5 pt-4">

        {/* Body Content */}
        <div className="text-sm text-forvis-gray-600 mb-4 whitespace-pre-wrap line-clamp-4">
          {bulletin.body}
        </div>

        {/* Document Link */}
        {bulletin.showDocumentLink && bulletin.documentFileName && bulletin.documentFileSize && (
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
                className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-forvis-blue-700 bg-forvis-blue-50 border border-forvis-blue-200 rounded-lg hover:bg-forvis-blue-100 hover:border-forvis-blue-300 transition-colors"
              >
                <FileDown className="h-4 w-4" />
                <span>{bulletin.documentFileName}</span>
                <span className="text-xs text-forvis-blue-600">
                  ({(bulletin.documentFileSize / 1024).toFixed(0)} KB)
                </span>
              </a>
          </div>
        )}

        {/* Footer Row */}
        <div className="flex items-center justify-between pt-3 border-t border-forvis-gray-100">
          <div className="flex items-center gap-4 text-xs text-forvis-gray-500">
            {/* Effective Date */}
            <span className="inline-flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" />
              {formatDate(bulletin.effectiveDate)}
            </span>

            {/* Contact Person */}
            {bulletin.contactPerson && (
              <span className="inline-flex items-center gap-1">
                <User className="h-3.5 w-3.5" />
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
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
