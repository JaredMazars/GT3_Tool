'use client';

import { useNewsBulletins } from '@/hooks/news/useNewsBulletins';
import { BulletinCategory } from '@/types';
import { useRouter } from 'next/navigation';
import { Newspaper } from 'lucide-react';

const categoryColors: Record<BulletinCategory, { bg: string; text: string }> = {
  [BulletinCategory.ANNOUNCEMENT]: { bg: 'bg-blue-500', text: 'text-blue-50' },
  [BulletinCategory.POLICY_UPDATE]: { bg: 'bg-purple-500', text: 'text-purple-50' },
  [BulletinCategory.EVENT]: { bg: 'bg-pink-500', text: 'text-pink-50' },
  [BulletinCategory.ACHIEVEMENT]: { bg: 'bg-green-500', text: 'text-green-50' },
  [BulletinCategory.REMINDER]: { bg: 'bg-yellow-500', text: 'text-yellow-50' },
  [BulletinCategory.CLIENT_WIN]: { bg: 'bg-teal-500', text: 'text-teal-50' },
  [BulletinCategory.MARKET_UPDATE]: { bg: 'bg-indigo-500', text: 'text-indigo-50' },
  [BulletinCategory.INDUSTRY_NEWS]: { bg: 'bg-cyan-500', text: 'text-cyan-50' },
  [BulletinCategory.PARTNERSHIP]: { bg: 'bg-orange-500', text: 'text-orange-50' },
  [BulletinCategory.HIRING]: { bg: 'bg-emerald-500', text: 'text-emerald-50' },
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

export function NewsTicker() {
  const router = useRouter();
  
  // Fetch latest active bulletins (pinned first)
  const { data: bulletinsData, isLoading } = useNewsBulletins({
    isActive: true,
    includeExpired: false,
    pageSize: 10,
  });

  const bulletins = bulletinsData?.bulletins || [];

  // Don't render if loading or no bulletins
  if (isLoading || bulletins.length === 0) {
    return null;
  }

  const handleTickerClick = (bulletinId?: number) => {
    if (bulletinId) {
      router.push(`/dashboard/business_dev/news?bulletinId=${bulletinId}`);
    } else {
      router.push('/dashboard/business_dev/news');
    }
  };

  // Duplicate bulletins for seamless loop
  const duplicatedBulletins = [...bulletins, ...bulletins];

  return (
    <div 
      className="w-full overflow-hidden relative"
      style={{ 
        background: 'linear-gradient(135deg, #5B93D7 0%, #3d6bb8 100%)',
        minHeight: '36px'
      }}
    >
      <div className="relative flex items-center h-9">
        {/* Left fade for ticker items disappearing - extended and more gradual */}
        <div className="absolute left-0 z-10 h-full w-64 pl-4 sm:pl-6 lg:pl-8" style={{ background: 'linear-gradient(to right, rgba(91, 147, 215, 1) 0%, rgba(91, 147, 215, 1) 50%, rgba(91, 147, 215, 0.95) 65%, rgba(91, 147, 215, 0.85) 80%, rgba(91, 147, 215, 0.6) 90%, transparent 100%)', pointerEvents: 'none' }}></div>
        
        {/* News icon and label */}
        <div className="absolute left-0 z-20 flex items-center pl-4 sm:pl-6 lg:pl-8 pr-8 h-full">
          <Newspaper className="h-4 w-4 text-white mr-2" />
          <span className="text-xs font-bold text-white uppercase tracking-wide">Latest News</span>
        </div>

        {/* Right fade for ticker items appearing */}
        <div className="absolute right-0 z-10 h-full w-24" style={{ background: 'linear-gradient(to left, rgba(61, 107, 184, 1), rgba(61, 107, 184, 0.9), rgba(61, 107, 184, 0.6), transparent)', pointerEvents: 'none' }}></div>

        {/* Scrolling content */}
        <div className="ticker-wrapper ml-40">
          <div className="ticker-content">
            {duplicatedBulletins.map((bulletin, index) => (
              <div 
                key={`${bulletin.id}-${index}`} 
                className="ticker-item cursor-pointer hover:opacity-90 transition-opacity"
                onClick={(e) => {
                  e.stopPropagation();
                  handleTickerClick(bulletin.id);
                }}
              >
                <span className="ticker-separator text-white/50">•</span>
                <span 
                  className={`ticker-badge ${categoryColors[bulletin.category].bg} ${categoryColors[bulletin.category].text}`}
                >
                  {categoryLabels[bulletin.category]}
                </span>
                <span className="ticker-title text-white font-medium">
                  {bulletin.title}
                </span>
              </div>
            ))}
            
            {/* View All link at the end */}
            <div 
              className="ticker-item cursor-pointer hover:opacity-90 transition-opacity"
              onClick={(e) => {
                e.stopPropagation();
                handleTickerClick();
              }}
            >
              <span className="ticker-separator text-white/50">•</span>
              <span className="ticker-view-all text-white font-bold uppercase tracking-wide">
                View All Company News →
              </span>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .ticker-wrapper {
          width: 100%;
          overflow: hidden;
          position: relative;
        }

        .ticker-content {
          display: flex;
          align-items: center;
          animation: scroll 40s linear infinite;
          will-change: transform;
        }

        .ticker-wrapper:hover .ticker-content {
          animation-play-state: paused;
        }

        .ticker-item {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          white-space: nowrap;
          flex-shrink: 0;
        }

        .ticker-separator {
          font-size: 0.875rem;
          line-height: 1.25rem;
        }

        .ticker-badge {
          padding: 0.125rem 0.5rem;
          border-radius: 9999px;
          font-size: 0.625rem;
          line-height: 1rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
        }

        .ticker-title {
          font-size: 0.8125rem;
          line-height: 1.25rem;
        }

        .ticker-view-all {
          font-size: 0.6875rem;
          line-height: 1rem;
        }

        @keyframes scroll {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-50%);
          }
        }
      `}</style>
    </div>
  );
}
