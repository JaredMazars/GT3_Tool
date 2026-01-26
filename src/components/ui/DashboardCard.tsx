import { ReactNode } from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

export interface DashboardCardProps {
  title: string;
  description?: string;
  icon?: ReactNode;
  href: string;
  onClick?: (e: React.MouseEvent) => void;
  stats?: Array<{
    label: string;
    value: string | number;
    primary?: boolean;
  }>;
  loading?: boolean;
  variant?: 'default' | 'compact';
}

export function DashboardCard({
  title,
  description,
  icon,
  href,
  onClick,
  stats,
  loading = false,
  variant = 'default',
}: DashboardCardProps) {
  const isCompact = variant === 'compact';

  return (
    <Link
      href={href}
      onClick={onClick}
      className={`group block rounded-lg border border-forvis-gray-200 ${
        isCompact ? 'shadow-sm hover:shadow-md' : 'shadow-corporate hover:shadow-corporate-md'
      } transition-all duration-200 relative overflow-hidden bg-gradient-dashboard-card`}
    >
      {/* Hover gradient overlay */}
      <div
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-gradient-dashboard-hover"
      />

      {/* Loading overlay */}
      {loading && (
        <div className="absolute inset-0 bg-white bg-opacity-90 rounded-lg flex items-center justify-center z-10">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-forvis-blue-500" />
        </div>
      )}

      {/* Content */}
      <div className={`${isCompact ? 'p-3' : 'p-4'} relative z-[1]`}>
        {isCompact ? (
          // Compact layout (horizontal)
          <div className="flex items-center gap-3">
            {icon && (
              <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 transition-transform duration-200 group-hover:scale-110 shadow-sm bg-gradient-icon-standard">
                {icon}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-bold text-forvis-gray-900 truncate group-hover:text-forvis-blue-600 transition-colors duration-200">
                {title}
              </h3>
            </div>
            <ArrowRight className="h-4 w-4 text-forvis-blue-500 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all duration-200 flex-shrink-0" />
          </div>
        ) : (
          // Default layout (vertical)
          <div className="flex flex-col h-full">
            {/* Icon and Arrow */}
            <div className="flex items-start justify-between mb-4">
              {icon && (
                <div className="w-12 h-12 rounded-lg flex items-center justify-center transition-transform duration-200 group-hover:scale-110 shadow-sm bg-gradient-icon-standard">
                  {icon}
                </div>
              )}
              <ArrowRight className="h-5 w-5 text-forvis-blue-500 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all duration-200" />
            </div>

            {/* Title and Description */}
            <h3 className="text-lg font-bold text-forvis-gray-900 mb-2 group-hover:text-forvis-blue-600 transition-colors duration-200">
              {title}
            </h3>
            {description && (
              <p className="text-xs text-forvis-gray-600 flex-grow leading-relaxed">
                {description}
              </p>
            )}

            {/* Stats Section */}
            {stats && stats.length > 0 && (
              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-forvis-gray-100 mt-4">
                {stats.map((stat, index) => (
                  <div key={index}>
                    <div className="text-xs font-medium text-forvis-gray-500 uppercase tracking-wider mb-1">
                      {stat.label}
                    </div>
                    <div
                      className={`text-xl font-bold ${
                        stat.primary ? 'text-forvis-blue-600' : 'text-forvis-gray-900'
                      }`}
                    >
                      {stat.value}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </Link>
  );
}
