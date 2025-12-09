'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { 
  FolderIcon, 
  BuildingOfficeIcon,
  ArrowLeftIcon,
  ChartBarIcon,
  NewspaperIcon,
  ArrowRightIcon,
  ChevronRightIcon,
} from '@heroicons/react/24/outline';
import { formatServiceLineName, isSharedService } from '@/lib/utils/serviceLineUtils';

export function ServiceLineSelector() {
  const params = useParams();
  const serviceLine = (params.serviceLine as string)?.toLowerCase();
  const isShared = isSharedService(serviceLine.toUpperCase());

  // Determine grid columns based on cards shown
  const getGridCols = () => {
    if (serviceLine === 'business_dev') {
      return 'md:grid-cols-3'; // BD Pipeline + Company News + Client Tasks
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
          <ChevronRightIcon className="h-4 w-4" />
          <span className="text-forvis-gray-900 font-medium">
            {formatServiceLineName(serviceLine.toUpperCase())}
          </span>
        </nav>

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-forvis-gray-900 mb-2">
            {formatServiceLineName(serviceLine.toUpperCase())}
          </h1>
          <p className="text-forvis-gray-600">
            {serviceLine === 'business_dev' 
              ? 'Track opportunities, view company news, and manage client tasks'
              : 'Choose the type of tasks you want to view'}
          </p>
        </div>

        {/* Selection Cards */}
        <div className={`grid grid-cols-1 gap-6 max-w-6xl ${getGridCols()}`}>
          {/* BD Pipeline Card - Only show for Business Development service line */}
          {serviceLine === 'business_dev' && (
            <Link
              href={`/dashboard/${serviceLine}/bd`}
              className="group block rounded-lg border border-forvis-gray-200 shadow-corporate hover:shadow-corporate-md transition-all duration-200 relative overflow-hidden"
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

              <div className="flex flex-col items-center text-center p-8 relative z-[1]">
                <div className="w-16 h-16 rounded-lg bg-teal-100 border-2 border-teal-200 flex items-center justify-center mb-6 transition-transform duration-200 group-hover:scale-110">
                  <ChartBarIcon className="h-8 w-8 text-teal-600" />
                </div>
                <h2 className="text-2xl font-bold text-forvis-gray-900 mb-3 group-hover:text-forvis-blue-600 transition-colors duration-200">
                  BD Pipeline
                </h2>
                <p className="text-sm text-forvis-gray-600 mb-4">
                  Track opportunities, prospects, and manage your sales pipeline
                </p>
                <ArrowRightIcon className="h-5 w-5 text-forvis-blue-500 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all duration-200" />
              </div>
            </Link>
          )}

          {/* Company News Card - Only show for Business Development service line */}
          {serviceLine === 'business_dev' && (
            <Link
              href={`/dashboard/${serviceLine}/news`}
              className="group block rounded-lg border border-forvis-gray-200 shadow-corporate hover:shadow-corporate-md transition-all duration-200 relative overflow-hidden"
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

              <div className="flex flex-col items-center text-center p-8 relative z-[1]">
                <div className="w-16 h-16 rounded-lg bg-amber-100 border-2 border-amber-200 flex items-center justify-center mb-6 transition-transform duration-200 group-hover:scale-110">
                  <NewspaperIcon className="h-8 w-8 text-amber-600" />
                </div>
                <h2 className="text-2xl font-bold text-forvis-gray-900 mb-3 group-hover:text-forvis-blue-600 transition-colors duration-200">
                  Company News
                </h2>
                <p className="text-sm text-forvis-gray-600 mb-4">
                  View company announcements, updates, and important bulletins
                </p>
                <ArrowRightIcon className="h-5 w-5 text-forvis-blue-500 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all duration-200" />
              </div>
            </Link>
          )}

          {/* Internal Tasks Card - Only show for non-shared service lines */}
          {!isShared && (
            <Link
              href={`/dashboard/${serviceLine}/internal`}
              className="group block rounded-lg border border-forvis-gray-200 shadow-corporate hover:shadow-corporate-md transition-all duration-200 relative overflow-hidden"
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

              <div className="flex flex-col items-center text-center p-8 relative z-[1]">
                <div className="w-16 h-16 rounded-lg bg-forvis-blue-100 border-2 border-forvis-blue-200 flex items-center justify-center mb-6 transition-transform duration-200 group-hover:scale-110">
                  <FolderIcon className="h-8 w-8 text-forvis-blue-600" />
                </div>
                <h2 className="text-2xl font-bold text-forvis-gray-900 mb-3 group-hover:text-forvis-blue-600 transition-colors duration-200">
                  Internal Tasks
                </h2>
                <p className="text-sm text-forvis-gray-600 mb-4">
                  View and manage internal tasks for {formatServiceLineName(serviceLine.toUpperCase())}
                </p>
                <ArrowRightIcon className="h-5 w-5 text-forvis-blue-500 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all duration-200" />
              </div>
            </Link>
          )}

          {/* Client Tasks Card */}
          <Link
            href={`/dashboard/${serviceLine}/clients`}
            className="group block rounded-lg border border-forvis-gray-200 shadow-corporate hover:shadow-corporate-md transition-all duration-200 relative overflow-hidden"
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

            <div className="flex flex-col items-center text-center p-8 relative z-[1]">
              <div className="w-16 h-16 rounded-lg bg-green-100 border-2 border-green-200 flex items-center justify-center mb-6 transition-transform duration-200 group-hover:scale-110">
                <BuildingOfficeIcon className="h-8 w-8 text-green-600" />
              </div>
              <h2 className="text-2xl font-bold text-forvis-gray-900 mb-3 group-hover:text-forvis-blue-600 transition-colors duration-200">
                Client Tasks
              </h2>
              <p className="text-sm text-forvis-gray-600 mb-4">
                Select a client to view their {formatServiceLineName(serviceLine.toUpperCase())} tasks
              </p>
              <ArrowRightIcon className="h-5 w-5 text-forvis-blue-500 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all duration-200" />
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}

