'use client';

/**
 * Loading skeleton for analytics tabs
 * Provides visual feedback while tab components are lazy loaded
 */
export function TabLoadingSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Tab Navigation Skeleton */}
      <div className="card overflow-hidden">
        <div className="px-6 py-4 bg-gradient-to-br from-forvis-blue-100 to-forvis-blue-50">
          <div className="flex gap-3">
            <div className="h-10 w-24 bg-white/40 rounded-lg"></div>
            <div className="h-10 w-24 bg-white/20 rounded-lg"></div>
            <div className="h-10 w-24 bg-white/20 rounded-lg"></div>
          </div>
        </div>
      </div>

      {/* Summary Cards Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className="card p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-forvis-gray-200"></div>
              <div className="h-5 w-32 bg-forvis-gray-200 rounded"></div>
            </div>
            <div className="h-8 w-40 bg-forvis-gray-200 rounded mb-2"></div>
            <div className="h-3 w-24 bg-forvis-gray-200 rounded"></div>
          </div>
        ))}
      </div>

      {/* Detailed Metrics Skeleton */}
      <div className="card">
        <div className="px-6 py-4 border-b border-forvis-gray-200">
          <div className="h-6 w-48 bg-forvis-gray-200 rounded"></div>
        </div>
        
        <div className="p-6 space-y-8">
          {/* Metric Rows */}
          {[1, 2, 3].map((i) => (
            <div key={i}>
              <div className="h-5 w-32 bg-forvis-gray-200 rounded mb-4"></div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {[1, 2, 3, 4].map((j) => (
                  <div key={j} className="p-4 rounded-lg bg-forvis-gray-50 border border-forvis-gray-200">
                    <div className="h-4 w-24 bg-forvis-gray-200 rounded mb-2"></div>
                    <div className="h-6 w-32 bg-forvis-gray-200 rounded"></div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * Loading skeleton specifically for chart/graph components
 * Provides visual feedback while chart libraries are loaded
 */
export function ChartSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Tab Navigation Skeleton */}
      <div className="card overflow-hidden">
        <div className="px-6 py-4 bg-gradient-to-br from-forvis-blue-100 to-forvis-blue-50">
          <div className="flex gap-3">
            <div className="h-10 w-24 bg-white/40 rounded-lg"></div>
            <div className="h-10 w-24 bg-white/20 rounded-lg"></div>
            <div className="h-10 w-24 bg-white/20 rounded-lg"></div>
          </div>
        </div>
      </div>

      {/* Summary Cards Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div 
            key={i} 
            className="rounded-lg p-4 shadow-corporate border border-forvis-blue-100"
            style={{ background: 'linear-gradient(135deg, #F0F7FD 0%, #E0EDFB 100%)' }}
          >
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="h-3 w-20 bg-forvis-gray-200 rounded mb-2"></div>
                <div className="h-7 w-24 bg-forvis-gray-200 rounded"></div>
              </div>
              <div className="rounded-full p-2.5 bg-forvis-blue-200 w-10 h-10"></div>
            </div>
          </div>
        ))}
      </div>

      {/* Chart Container Skeleton */}
      <div className="rounded-lg bg-white shadow-corporate border border-forvis-gray-200 p-6">
        <div className="mb-6">
          <div className="h-6 w-64 bg-forvis-gray-200 rounded mb-2"></div>
          <div className="h-4 w-96 bg-forvis-gray-200 rounded"></div>
        </div>

        {/* Chart Area */}
        <div className="relative" style={{ height: '500px' }}>
          {/* Y-axis labels */}
          <div className="absolute left-0 top-0 bottom-0 w-24 flex flex-col justify-between py-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-3 w-20 bg-forvis-gray-200 rounded"></div>
            ))}
          </div>

          {/* Chart grid lines */}
          <div className="absolute left-24 right-0 top-0 bottom-12 flex flex-col justify-between">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-px bg-forvis-gray-200"></div>
            ))}
          </div>

          {/* Simulated line paths */}
          <div className="absolute left-24 right-0 top-1/4 bottom-1/4">
            <svg className="w-full h-full opacity-20">
              <path
                d="M 0 50 Q 100 30, 200 40 T 400 35 T 600 45 T 800 30"
                stroke="#2E5AAC"
                strokeWidth="3"
                fill="none"
              />
              <path
                d="M 0 70 Q 100 60, 200 65 T 400 55 T 600 60 T 800 50"
                stroke="#F97316"
                strokeWidth="3"
                fill="none"
              />
            </svg>
          </div>

          {/* X-axis labels */}
          <div className="absolute left-24 right-0 bottom-0 flex justify-between h-8">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <div key={i} className="h-3 w-12 bg-forvis-gray-200 rounded"></div>
            ))}
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-4 justify-center mt-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="flex items-center gap-2">
              <div className="w-8 h-0.5 bg-forvis-gray-200 rounded"></div>
              <div className="h-3 w-16 bg-forvis-gray-200 rounded"></div>
            </div>
          ))}
        </div>
      </div>

      {/* Info Box Skeleton */}
      <div className="rounded-lg bg-forvis-blue-50 border border-forvis-blue-100 p-4">
        <div className="flex items-start gap-3">
          <div className="w-5 h-5 bg-forvis-blue-200 rounded mt-0.5"></div>
          <div className="flex-1 space-y-2">
            <div className="h-4 w-48 bg-forvis-blue-200 rounded"></div>
            <div className="h-3 w-full bg-forvis-blue-200 rounded"></div>
            <div className="h-3 w-5/6 bg-forvis-blue-200 rounded"></div>
          </div>
        </div>
      </div>
    </div>
  );
}


