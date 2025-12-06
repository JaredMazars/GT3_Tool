'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { 
  ChevronRightIcon,
  FolderIcon,
  ChartBarIcon,
} from '@heroicons/react/24/outline';
import { isValidServiceLine, formatServiceLineName, isSharedService } from '@/lib/utils/serviceLineUtils';
import { useServiceLine } from '@/components/providers/ServiceLineProvider';
import { ServiceLine } from '@/types';
import { useSubServiceLineGroups } from '@/hooks/service-lines/useSubServiceLineGroups';
import { ServiceLineSelector } from '@/components/features/service-lines/ServiceLineSelector';
import { taskListKeys } from '@/hooks/tasks/useTasks';

export default function ServiceLineSubGroupsPage() {
  const router = useRouter();
  const params = useParams();
  const serviceLine = (params.serviceLine as string)?.toUpperCase();
  const { setCurrentServiceLine } = useServiceLine();
  const queryClient = useQueryClient();

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
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-forvis-blue-600"></div>
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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumb */}
        <nav className="flex items-center space-x-2 text-sm text-forvis-gray-600 mb-6">
          <Link href="/dashboard" className="hover:text-forvis-gray-900 transition-colors">
            Dashboard
          </Link>
          <ChevronRightIcon className="h-4 w-4" />
          <span className="text-forvis-gray-900 font-medium">
            {formatServiceLineName(serviceLine)}
          </span>
        </nav>

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-forvis-gray-900 mb-2">
            {formatServiceLineName(serviceLine)}
          </h1>
          <p className="text-forvis-gray-600">
            Select a sub-service line group to view clients and projects
          </p>
          <div className="mt-4 flex gap-6">
            <div>
              <div className="text-2xl font-bold text-forvis-blue-600">{totalActiveTasks}</div>
              <div className="text-sm text-forvis-gray-600">Active Tasks</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-forvis-gray-900">{totalTasks}</div>
              <div className="text-sm text-forvis-gray-600">Total Tasks</div>
            </div>
          </div>
        </div>

        {/* Sub-Service Line Groups Grid */}
        {!subGroups || subGroups.length === 0 ? (
          <div className="card text-center py-12">
            <FolderIcon className="mx-auto h-12 w-12 text-forvis-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-forvis-gray-900">No Sub-Service Line Groups</h3>
            <p className="mt-1 text-sm text-forvis-gray-600">
              No sub-service line groups are configured for {formatServiceLineName(serviceLine)}.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {subGroups.map((group) => (
              <Link
                key={group.code}
                href={`/dashboard/${serviceLine.toLowerCase()}/${group.code}`}
                onMouseEnter={() => prefetchTasksForSubGroup(group.code)}
                className="group block bg-white rounded-lg border-2 border-forvis-gray-200 shadow-corporate hover:shadow-corporate-md transition-all duration-200 hover:border-forvis-blue-500"
              >
                <div className="p-6">
                  {/* Icon */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 rounded-lg bg-forvis-blue-100 flex items-center justify-center group-hover:bg-forvis-blue-200 transition-colors">
                      <ChartBarIcon className="h-6 w-6 text-forvis-blue-600" />
                    </div>
                    <ChevronRightIcon className="h-5 w-5 text-forvis-gray-400 group-hover:text-forvis-blue-600 transition-colors" />
                  </div>

                  {/* Content */}
                  <div>
                    <h3 className="text-lg font-bold text-forvis-gray-900 mb-1 group-hover:text-forvis-blue-600 transition-colors">
                      {group.description || 'No description available'}
                    </h3>
                    <p className="text-sm text-forvis-gray-600 mb-4 line-clamp-2">
                      {group.code}
                    </p>

                    {/* Stats */}
                    <div className="grid grid-cols-2 gap-4 pt-4 border-t border-forvis-gray-100">
                      <div>
                        <div className="text-xs font-medium text-forvis-gray-500 uppercase tracking-wider mb-1">
                          Active Tasks
                        </div>
                        <div className="text-xl font-bold text-forvis-blue-600">
                          {group.activeTasks}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs font-medium text-forvis-gray-500 uppercase tracking-wider mb-1">
                          Total Tasks
                        </div>
                        <div className="text-xl font-bold text-forvis-gray-900">
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
  );
}
