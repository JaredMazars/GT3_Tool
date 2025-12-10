'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { 
  Folder, 
  Building2,
  ArrowLeft,
  BarChart3,
  Newspaper,
  ArrowRight,
  ChevronRight,
} from 'lucide-react';
import { formatServiceLineName, isSharedService } from '@/lib/utils/serviceLineUtils';

export function ServiceLineSelector() {
  const params = useParams();
  const serviceLine = (params.serviceLine as string)?.toLowerCase();
  const isShared = isSharedService(serviceLine.toUpperCase());

  // Determine grid columns based on cards shown
  const getGridCols = () => {
    if (serviceLine === 'business_dev') {
      return 'md:grid-cols-2 lg:grid-cols-3'; // BD Pipeline + Company News + Client Tasks
    }
    if (isShared) {
      return 'md:grid-cols-1'; // Only Client Tasks for other shared services
    }
    return 'md:grid-cols-2'; // Internal Tasks + Client Tasks for main service lines
  };

  return (
    <div className="min-h-screen bg-forvis-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumb */}
        <nav className="flex items-center space-x-2 text-sm text-forvis-gray-600 mb-6">
          <Link href="/dashboard" className="hover:text-forvis-gray-900 transition-colors">
            Home
          </Link>
          <ChevronRight className="h-4 w-4" />
          <span className="text-forvis-gray-900 font-medium">
            {formatServiceLineName(serviceLine.toUpperCase())}
          </span>
        </nav>

        {/* Gold Container with Header and Cards */}
        <div 
          className="rounded-lg border-2 p-6"
          style={{
            background: 'linear-gradient(135deg, #D9CBA8 0%, #B0A488 100%)',
            borderColor: '#C9BCAA',
          }}
        >
          {/* Header */}
          <div className="mb-4">
            <h2 className="text-xl font-semibold text-white mb-1">
              {formatServiceLineName(serviceLine.toUpperCase())}
            </h2>
            <p className="text-sm text-white opacity-90">
              {serviceLine === 'business_dev' 
                ? 'Track opportunities, view company news, and manage client tasks'
                : 'Choose the type of tasks you want to view'}
            </p>
          </div>

          {/* Selection Cards */}
          <div className={`grid grid-cols-1 gap-3 ${getGridCols()}`}>
            {/* BD Pipeline Card - Only show for Business Development service line */}
            {serviceLine === 'business_dev' && (
              <Link
                href={`/dashboard/${serviceLine}/bd`}
                className="group block rounded-lg border border-forvis-gray-200 shadow-sm hover:shadow-md transition-all duration-200 relative overflow-hidden"
                style={{
                  background: 'linear-gradient(135deg, #F0F7FD 0%, #E0EDFB 100%)',
                }}
              >
                {/* Hover gradient overlay */}
                <div 
                  className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                  style={{
                    background: 'linear-gradient(135deg, rgba(91, 147, 215, 0.06) 0%, rgba(46, 90, 172, 0.08) 100%)',
                  }}
                />

                <div className="p-4 relative z-[1]">
                  <div className="flex items-center gap-3 mb-3">
                    {/* Icon */}
                    <div 
                      className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 transition-transform duration-200 group-hover:scale-110 shadow-sm"
                      style={{ background: 'linear-gradient(135deg, #5B93D7 0%, #2E5AAC 100%)' }}
                    >
                      <BarChart3 className="h-6 w-6 text-white" />
                    </div>

                    {/* Title and Arrow */}
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-bold text-forvis-gray-900 truncate group-hover:text-forvis-blue-600 transition-colors duration-200">
                        BD Pipeline
                      </h3>
                    </div>

                    <ArrowRight className="h-4 w-4 text-forvis-blue-500 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all duration-200 flex-shrink-0" />
                  </div>

                  {/* Description */}
                  <p className="text-xs text-forvis-gray-600 line-clamp-2 leading-relaxed">
                    Track opportunities, prospects, and manage your sales pipeline
                  </p>
                </div>
              </Link>
            )}

            {/* Company News Card - Only show for Business Development service line */}
            {serviceLine === 'business_dev' && (
              <Link
                href={`/dashboard/${serviceLine}/news`}
                className="group block rounded-lg border border-forvis-gray-200 shadow-sm hover:shadow-md transition-all duration-200 relative overflow-hidden"
                style={{
                  background: 'linear-gradient(135deg, #F0F7FD 0%, #E0EDFB 100%)',
                }}
              >
                {/* Hover gradient overlay */}
                <div 
                  className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                  style={{
                    background: 'linear-gradient(135deg, rgba(91, 147, 215, 0.06) 0%, rgba(46, 90, 172, 0.08) 100%)',
                  }}
                />

                <div className="p-4 relative z-[1]">
                  <div className="flex items-center gap-3 mb-3">
                    {/* Icon */}
                    <div 
                      className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 transition-transform duration-200 group-hover:scale-110 shadow-sm"
                      style={{ background: 'linear-gradient(135deg, #5B93D7 0%, #2E5AAC 100%)' }}
                    >
                      <Newspaper className="h-6 w-6 text-white" />
                    </div>

                    {/* Title and Arrow */}
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-bold text-forvis-gray-900 truncate group-hover:text-forvis-blue-600 transition-colors duration-200">
                        Company News
                      </h3>
                    </div>

                    <ArrowRight className="h-4 w-4 text-forvis-blue-500 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all duration-200 flex-shrink-0" />
                  </div>

                  {/* Description */}
                  <p className="text-xs text-forvis-gray-600 line-clamp-2 leading-relaxed">
                    View company announcements, updates, and important bulletins
                  </p>
                </div>
              </Link>
            )}

            {/* Internal Tasks Card - Only show for non-shared service lines */}
            {!isShared && (
              <Link
                href={`/dashboard/${serviceLine}/internal`}
                className="group block rounded-lg border border-forvis-gray-200 shadow-sm hover:shadow-md transition-all duration-200 relative overflow-hidden"
                style={{
                  background: 'linear-gradient(135deg, #F0F7FD 0%, #E0EDFB 100%)',
                }}
              >
                {/* Hover gradient overlay */}
                <div 
                  className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                  style={{
                    background: 'linear-gradient(135deg, rgba(91, 147, 215, 0.06) 0%, rgba(46, 90, 172, 0.08) 100%)',
                  }}
                />

                <div className="p-4 relative z-[1]">
                  <div className="flex items-center gap-3 mb-3">
                    {/* Icon */}
                    <div 
                      className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 transition-transform duration-200 group-hover:scale-110 shadow-sm"
                      style={{ background: 'linear-gradient(135deg, #5B93D7 0%, #2E5AAC 100%)' }}
                    >
                      <Folder className="h-6 w-6 text-white" />
                    </div>

                    {/* Title and Arrow */}
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-bold text-forvis-gray-900 truncate group-hover:text-forvis-blue-600 transition-colors duration-200">
                        Internal Tasks
                      </h3>
                    </div>

                    <ArrowRight className="h-4 w-4 text-forvis-blue-500 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all duration-200 flex-shrink-0" />
                  </div>

                  {/* Description */}
                  <p className="text-xs text-forvis-gray-600 line-clamp-2 leading-relaxed">
                    View and manage internal tasks for {formatServiceLineName(serviceLine.toUpperCase())}
                  </p>
                </div>
              </Link>
            )}

            {/* Client Tasks Card */}
            <Link
              href={`/dashboard/${serviceLine}/clients`}
              className="group block rounded-lg border border-forvis-gray-200 shadow-sm hover:shadow-md transition-all duration-200 relative overflow-hidden"
              style={{
                background: 'linear-gradient(135deg, #F0F7FD 0%, #E0EDFB 100%)',
              }}
            >
              {/* Hover gradient overlay */}
              <div 
                className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                style={{
                  background: 'linear-gradient(135deg, rgba(91, 147, 215, 0.06) 0%, rgba(46, 90, 172, 0.08) 100%)',
                }}
              />

              <div className="p-3 relative z-[1]">
                <div className="flex items-center gap-3 mb-3">
                  {/* Icon */}
                  <div 
                    className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 transition-transform duration-200 group-hover:scale-110 shadow-sm"
                    style={{ background: 'linear-gradient(135deg, #5B93D7 0%, #2E5AAC 100%)' }}
                  >
                    <Building2 className="h-6 w-6 text-white" />
                  </div>

                  {/* Title and Arrow */}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-bold text-forvis-gray-900 truncate group-hover:text-forvis-blue-600 transition-colors duration-200">
                      Client Tasks
                    </h3>
                  </div>

                  <ArrowRight className="h-4 w-4 text-forvis-blue-500 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all duration-200 flex-shrink-0" />
                </div>

                {/* Description */}
                <p className="text-xs text-forvis-gray-600 line-clamp-2 leading-relaxed">
                  Select a client to view their {formatServiceLineName(serviceLine.toUpperCase())} tasks
                </p>
              </div>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

