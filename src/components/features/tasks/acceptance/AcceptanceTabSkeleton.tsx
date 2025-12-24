'use client';

/**
 * Skeleton loading state for Acceptance Tab
 * Matches the layout of the actual content to prevent layout shifts
 */
export function AcceptanceTabSkeleton() {
  return (
    <div className="p-6 bg-forvis-gray-50 min-h-screen">
      <div className="space-y-6">
        {/* Header Skeleton */}
        <div className="bg-white rounded-lg border-2 border-forvis-gray-200 shadow-corporate p-6 animate-pulse">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="h-8 bg-forvis-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-4 bg-forvis-gray-200 rounded w-full"></div>
            </div>
            <div className="flex items-center space-x-2 px-4 py-2 bg-forvis-gray-100 border-2 border-forvis-gray-300 rounded-lg">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-forvis-blue-500"></div>
              <div className="h-4 bg-forvis-gray-200 rounded w-20"></div>
            </div>
          </div>
        </div>

        {/* Client Information Skeleton */}
        <div className="bg-white rounded-lg border-2 border-forvis-gray-200 shadow-corporate overflow-hidden animate-pulse">
          <div className="px-6 py-4 border-b border-forvis-gray-200 bg-forvis-gray-50">
            <div className="h-6 bg-forvis-gray-200 rounded w-48"></div>
          </div>
          <div className="px-6 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="h-4 bg-forvis-gray-200 rounded w-24 mb-2"></div>
                <div className="h-5 bg-forvis-gray-200 rounded w-40"></div>
              </div>
              <div>
                <div className="h-4 bg-forvis-gray-200 rounded w-24 mb-2"></div>
                <div className="h-5 bg-forvis-gray-200 rounded w-32"></div>
              </div>
              <div>
                <div className="h-4 bg-forvis-gray-200 rounded w-24 mb-2"></div>
                <div className="h-5 bg-forvis-gray-200 rounded w-36"></div>
              </div>
              <div>
                <div className="h-4 bg-forvis-gray-200 rounded w-24 mb-2"></div>
                <div className="h-5 bg-forvis-gray-200 rounded w-36"></div>
              </div>
            </div>
          </div>
        </div>

        {/* Content Skeleton */}
        <div className="bg-white rounded-lg border-2 border-forvis-gray-200 shadow-corporate p-6 animate-pulse">
          <div className="h-6 bg-forvis-gray-200 rounded w-64 mb-4"></div>
          <div className="space-y-3">
            <div className="h-4 bg-forvis-gray-200 rounded w-full"></div>
            <div className="h-4 bg-forvis-gray-200 rounded w-5/6"></div>
            <div className="h-4 bg-forvis-gray-200 rounded w-4/5"></div>
          </div>
          <div className="mt-6">
            <div className="h-10 bg-forvis-gray-200 rounded w-48"></div>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Compact skeleton for when tab is already loaded but refetching
 */
export function AcceptanceTabRefetchSkeleton() {
  return (
    <div className="p-6 bg-forvis-gray-50">
      <div>
        <div className="bg-white rounded-lg border-2 border-forvis-gray-200 shadow-corporate p-6">
          <div className="flex items-center space-x-2 text-sm text-forvis-gray-600">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-forvis-blue-500"></div>
            <span>Updating...</span>
          </div>
        </div>
      </div>
    </div>
  );
}
















