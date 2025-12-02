'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { 
  FolderIcon, 
  BuildingOfficeIcon,
  ArrowLeftIcon,
  ChartBarIcon,
} from '@heroicons/react/24/outline';
import { formatServiceLineName } from '@/lib/utils/serviceLineUtils';

export function ServiceLineSelector() {
  const params = useParams();
  const serviceLine = (params.serviceLine as string)?.toLowerCase();

  return (
    <div className="min-h-screen bg-forvis-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back to Service Lines */}
        <div className="mb-6">
          <Link
            href="/dashboard"
            className="inline-flex items-center text-sm text-forvis-gray-600 hover:text-forvis-gray-900"
          >
            <ArrowLeftIcon className="h-4 w-4 mr-2" />
            Back to Service Lines
          </Link>
        </div>

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-forvis-gray-900">
            {formatServiceLineName(serviceLine.toUpperCase())}
          </h1>
          <p className="mt-2 text-sm text-forvis-gray-700">
            {serviceLine === 'business_dev' 
              ? 'Track opportunities and manage internal or client projects'
              : 'Choose the type of projects you want to view'}
          </p>
        </div>

        {/* Selection Cards */}
        <div className={`grid grid-cols-1 gap-6 max-w-6xl ${serviceLine === 'business_dev' ? 'md:grid-cols-3' : 'md:grid-cols-2'}`}>
          {/* BD Pipeline Card - Only show for Business Development service line */}
          {serviceLine === 'business_dev' && (
            <Link
              href={`/dashboard/${serviceLine}/bd`}
              className="group block"
            >
              <div className="card hover:shadow-lg transition-all duration-200 border-2 border-transparent hover:border-forvis-blue-500 cursor-pointer h-full">
                <div className="flex flex-col items-center text-center p-8">
                  <div className="w-20 h-20 rounded-full bg-teal-100 flex items-center justify-center mb-6 group-hover:bg-teal-200 transition-colors">
                    <ChartBarIcon className="h-10 w-10 text-teal-600" />
                  </div>
                  <h2 className="text-2xl font-bold text-forvis-gray-900 mb-3">
                    BD Pipeline
                  </h2>
                  <p className="text-forvis-gray-600">
                    Track opportunities, prospects, and manage your sales pipeline
                  </p>
                </div>
              </div>
            </Link>
          )}

          {/* Internal Projects Card */}
          <Link
            href={`/dashboard/${serviceLine}/internal`}
            className="group block"
          >
            <div className="card hover:shadow-lg transition-all duration-200 border-2 border-transparent hover:border-forvis-blue-500 cursor-pointer h-full">
              <div className="flex flex-col items-center text-center p-8">
                <div className="w-20 h-20 rounded-full bg-forvis-blue-100 flex items-center justify-center mb-6 group-hover:bg-forvis-blue-200 transition-colors">
                  <FolderIcon className="h-10 w-10 text-forvis-blue-600" />
                </div>
                <h2 className="text-2xl font-bold text-forvis-gray-900 mb-3">
                  Internal Projects
                </h2>
                <p className="text-forvis-gray-600">
                  View and manage internal projects for {formatServiceLineName(serviceLine.toUpperCase())}
                </p>
              </div>
            </div>
          </Link>

          {/* Client Projects Card */}
          <Link
            href={`/dashboard/${serviceLine}/clients`}
            className="group block"
          >
            <div className="card hover:shadow-lg transition-all duration-200 border-2 border-transparent hover:border-forvis-blue-500 cursor-pointer h-full">
              <div className="flex flex-col items-center text-center p-8">
                <div className="w-20 h-20 rounded-full bg-forvis-green-100 flex items-center justify-center mb-6 group-hover:bg-forvis-green-200 transition-colors">
                  <BuildingOfficeIcon className="h-10 w-10 text-forvis-green-600" />
                </div>
                <h2 className="text-2xl font-bold text-forvis-gray-900 mb-3">
                  Client Projects
                </h2>
                <p className="text-forvis-gray-600">
                  Select a client to view their {formatServiceLineName(serviceLine.toUpperCase())} projects
                </p>
              </div>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}

