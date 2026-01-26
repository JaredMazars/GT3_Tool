'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { 
  ChevronRight,
  Folder,
  BarChart3,
} from 'lucide-react';
import { LoadingSpinner } from '@/components/ui';
import { isValidServiceLine, formatServiceLineName, isSharedService } from '@/lib/utils/serviceLineUtils';
import { useServiceLine } from '@/components/providers/ServiceLineProvider';
import { ServiceLine } from '@/types';
import { useSubServiceLineGroups } from '@/hooks/service-lines/useSubServiceLineGroups';
import { ServiceLineSelector } from '@/components/features/service-lines/ServiceLineSelector';
import { taskListKeys } from '@/hooks/tasks/useTasks';
import { GRADIENTS } from '@/lib/design-system/gradients';

export default function ServiceLineSubGroupsPage() {
  const router = useRouter();
  const params = useParams();
  const serviceLine = (params.serviceLine as string)?.toUpperCase();
  const { setCurrentServiceLine } = useServiceLine();
  const queryClient = useQueryClient();
  const [navigatingTo, setNavigatingTo] = useState<string | null>(null);

  // Validate service line
  useEffect(() => {
    if (!isValidServiceLine(serviceLine)) {
      router.push('/dashboard');
    } else {
      setCurrentServiceLine(serviceLine as ServiceLine);
    }
  }, [serviceLine, router, setCurrentServiceLine]);

  // Fetch SubServLineGroups
  const { 
    data: subGroups, 
    isLoading,
    error 
  } = useSubServiceLineGroups({
    serviceLine: serviceLine || '',
    enabled: !!serviceLine && isValidServiceLine(serviceLine),
  });

  // Prefetch tasks for a subgroup on hover
  const prefetchTasksForSubGroup = (subGroupCode: string) => {
    // Prefetch all tasks
    queryClient.prefetchQuery({
      queryKey: taskListKeys.list({
        search: '',
        page: 1,
        limit: 50,
        serviceLine,
        subServiceLineGroup: subGroupCode,
        includeArchived: false,
        internalOnly: false,
        clientTasksOnly: false,
        myTasksOnly: false,
        sortBy: 'updatedAt',
        sortOrder: 'desc',
      }),
      queryFn: async () => {
        const searchParams = new URLSearchParams();
        searchParams.set('page', '1');
        searchParams.set('limit', '50');
        searchParams.set('serviceLine', serviceLine);
        searchParams.set('subServiceLineGroup', subGroupCode);
        searchParams.set('includeArchived', 'false');
        searchParams.set('sortBy', 'updatedAt');
        searchParams.set('sortOrder', 'desc');
        
        const response = await fetch(`/api/tasks?${searchParams.toString()}`);
        if (!response.ok) return { tasks: [], pagination: { page: 1, limit: 50, total: 0, totalPages: 0 } };
        const result = await response.json();
        return result.success ? result.data : result;
      },
      staleTime: 5 * 60 * 1000, // 5 minutes
    });

    // Prefetch my tasks
    queryClient.prefetchQuery({
      queryKey: taskListKeys.list({
        search: '',
        page: 1,
        limit: 50,
        serviceLine,
        subServiceLineGroup: subGroupCode,
        includeArchived: false,
        internalOnly: false,
        clientTasksOnly: false,
        myTasksOnly: true,
        sortBy: 'updatedAt',
        sortOrder: 'desc',
      }),
      queryFn: async () => {
        const searchParams = new URLSearchParams();
        searchParams.set('page', '1');
        searchParams.set('limit', '50');
        searchParams.set('serviceLine', serviceLine);
        searchParams.set('subServiceLineGroup', subGroupCode);
        searchParams.set('myTasksOnly', 'true');
        searchParams.set('includeArchived', 'false');
        searchParams.set('sortBy', 'updatedAt');
        searchParams.set('sortOrder', 'desc');
        
        const response = await fetch(`/api/tasks?${searchParams.toString()}`);
        if (!response.ok) return { tasks: [], pagination: { page: 1, limit: 50, total: 0, totalPages: 0 } };
        const result = await response.json();
        return result.success ? result.data : result;
      },
      staleTime: 5 * 60 * 1000, // 5 minutes
    });
  };

  if (!isValidServiceLine(serviceLine)) {
    return null;
  }

  // Show selector for shared services
  if (isSharedService(serviceLine)) {
    return <ServiceLineSelector />;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-forvis-gray-50 flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-forvis-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-forvis-gray-900 mb-2">Error Loading Sub-Groups</h2>
          <p className="text-forvis-gray-600">Failed to load sub-service line groups. Please try again.</p>
        </div>
      </div>
    );
  }

  const totalActiveTasks = subGroups?.reduce((sum, group) => sum + group.activeTasks, 0) || 0;
  const totalTasks = subGroups?.reduce((sum, group) => sum + group.totalTasks, 0) || 0;

  return (
    <div className="min-h-screen bg-forvis-gray-50">
      <div className="w-full px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumb */}
        <nav className="flex items-center space-x-2 text-sm text-forvis-gray-600 mb-6">
          <Link href="/dashboard" className="hover:text-forvis-gray-900 transition-all duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-forvis-blue-500 focus:ring-offset-2 rounded px-1">
            Home
          </Link>
          <ChevronRight className="h-4 w-4" />
          <span className="text-forvis-gray-900 font-medium">
            {formatServiceLineName(serviceLine)}
          </span>
        </nav>

        {/* Gold Container with Header and Cards */}
        <div 
          className="rounded-lg border-2 p-6"
          style={{
            background: GRADIENTS.premium.gold,
            borderColor: '#C9BCAA',
          }}
        >
          {/* Header */}
          <div className="mb-4">
            <h2 className="text-xl font-semibold text-white mb-1">
              {formatServiceLineName(serviceLine)}
            </h2>
            <p className="text-sm text-white opacity-90 mb-3">
              Select a sub-service line group to view clients and projects
            </p>
            <div className="flex gap-6">
              <div>
                <div className="text-2xl font-bold text-white">{totalActiveTasks}</div>
                <div className="text-xs text-white opacity-90">Active Tasks</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-white">{totalTasks}</div>
                <div className="text-xs text-white opacity-90">Total Tasks</div>
              </div>
            </div>
          </div>

          {/* Sub-Service Line Groups Grid */}
          {!subGroups || subGroups.length === 0 ? (
            <div 
              className="bg-gradient-dashboard-card rounded-lg border border-forvis-gray-200 text-center py-8 shadow-sm"
            >
              <Folder className="mx-auto h-10 w-10 text-forvis-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-forvis-gray-900">No Sub-Service Line Groups</h3>
              <p className="mt-1 text-xs text-forvis-gray-600">
                No sub-service line groups are configured for {formatServiceLineName(serviceLine)}.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {subGroups.map((group) => (
                <Link
                  key={group.code}
                  href={`/dashboard/${serviceLine.toLowerCase()}/${group.code}`}
                  onClick={(e) => {
                    e.preventDefault();
                    setNavigatingTo(group.code);
                    router.push(`/dashboard/${serviceLine.toLowerCase()}/${group.code}`);
                  }}
                  onMouseEnter={() => prefetchTasksForSubGroup(group.code)}
                  className="bg-gradient-dashboard-card group block rounded-lg border border-forvis-gray-200 shadow-sm hover:shadow-md transition-all duration-200 relative overflow-hidden"
                >
                  {/* Hover gradient overlay */}
                  <div 
                    className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                    style={{
                      background: GRADIENTS.dashboard.hover,
                    }}
                  />
                  
                  {/* Loading overlay */}
                  {navigatingTo === group.code && (
                    <div className="absolute inset-0 bg-white bg-opacity-90 rounded-lg flex items-center justify-center z-10">
                      <LoadingSpinner size="md" />
                    </div>
                  )}
                  
                  <div className="p-4 relative z-[1]">
                    {/* Icon and Arrow */}
                    <div className="flex items-center justify-between mb-3">
                      <div 
                        className="w-10 h-10 rounded-lg flex items-center justify-center transition-transform duration-200 group-hover:scale-110 shadow-sm"
                        style={{ background: GRADIENTS.icon.standard }}
                      >
                        <BarChart3 className="h-5 w-5 text-white" />
                      </div>
                      <ChevronRight className="h-4 w-4 text-forvis-gray-400 group-hover:text-forvis-blue-600 transition-colors flex-shrink-0" />
                    </div>

                    {/* Content */}
                    <div>
                      <h3 className="text-sm font-bold text-forvis-gray-900 mb-1 group-hover:text-forvis-blue-600 transition-colors line-clamp-1">
                        {group.description || 'No description available'}
                      </h3>
                      <p className="text-xs text-forvis-gray-600 mb-3 line-clamp-1">
                        {group.code}
                      </p>

                      {/* Stats */}
                      <div className="grid grid-cols-2 gap-3 pt-3 border-t border-forvis-gray-100">
                        <div>
                          <div className="text-xs font-medium text-forvis-gray-500 uppercase tracking-wider mb-1">
                            Active
                          </div>
                          <div className="text-lg font-bold text-forvis-blue-600">
                            {group.activeTasks}
                          </div>
                        </div>
                        <div>
                          <div className="text-xs font-medium text-forvis-gray-500 uppercase tracking-wider mb-1">
                            Total
                          </div>
                          <div className="text-lg font-bold text-forvis-gray-900">
                            {group.totalTasks}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
