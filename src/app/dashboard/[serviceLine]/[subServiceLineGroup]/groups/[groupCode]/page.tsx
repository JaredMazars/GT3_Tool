'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { 
  ChevronRight,
  Building2,
  Search,
  FileText,
  BarChart3,
  Users,
  Presentation,
} from 'lucide-react';
import { formatServiceLineName, isValidServiceLine, isSharedService } from '@/lib/utils/serviceLineUtils';
import { ServiceLine } from '@/types';
import { GroupHeader } from '@/components/features/clients/GroupHeader';
import { ClientListItem } from '@/components/features/clients/ClientListItem';
import { useClientGroup } from '@/hooks/clients/useClientGroup';
import { useSubServiceLineGroups } from '@/hooks/service-lines/useSubServiceLineGroups';
import { useServiceLine } from '@/components/providers/ServiceLineProvider';
import { groupGraphDataKeys } from '@/hooks/groups/useGroupGraphData';
import { groupWipKeys } from '@/hooks/groups/useGroupWip';
import { groupDebtorsKeys } from '@/hooks/groups/useGroupDebtors';

export default function GroupDetailPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const groupCode = decodeURIComponent(params.groupCode as string);
  const serviceLine = (params.serviceLine as string)?.toUpperCase();
  const subServiceLineGroup = params.subServiceLineGroup as string;
  const { setCurrentServiceLine } = useServiceLine();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(20);

  // Fetch sub-service line groups to get the description
  const { data: subGroups } = useSubServiceLineGroups({
    serviceLine: serviceLine || '',
    enabled: !!serviceLine && isValidServiceLine(serviceLine),
  });
  
  const currentSubGroup = subGroups?.find(sg => sg.code === subServiceLineGroup);
  const subServiceLineGroupDescription = currentSubGroup?.description || subServiceLineGroup;

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setCurrentPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Fetch group with clients
  const { data: clientsData, isLoading: isLoadingClients, isFetching: isFetchingClients } = useClientGroup(groupCode, {
    search: debouncedSearch,
    page: currentPage,
    limit: itemsPerPage,
    type: 'clients',
    enabled: true,
  });

  const isLoading = isLoadingClients;
  const isFetching = isFetchingClients;

  // Extract data before any conditional returns
  const clients = clientsData?.clients || [];
  const totalClients = clientsData?.pagination?.total || 0;

  // Get pagination for current view
  const pagination = clientsData?.pagination;

  // Validate service line
  useEffect(() => {
    if (!isValidServiceLine(serviceLine)) {
      router.push('/dashboard');
    } else {
      setCurrentServiceLine(serviceLine as ServiceLine);
    }
  }, [serviceLine, router, setCurrentServiceLine]);

  if (!isValidServiceLine(serviceLine)) {
    return null;
  }

  // Show selector for shared services
  if (isSharedService(serviceLine)) {
    router.push('/dashboard');
    return null;
  }

  // Show skeleton loader on initial load
  if (isLoadingClients && !clientsData) {
    return (
      <div className="min-h-screen bg-forvis-gray-50">
        <div className="w-full px-4 sm:px-6 lg:px-8 py-8">
          {/* Breadcrumb skeleton */}
          <div className="flex items-center space-x-2 mb-6">
            <div className="h-4 w-20 bg-forvis-gray-200 rounded animate-pulse"></div>
            <div className="h-4 w-4 bg-forvis-gray-200 rounded animate-pulse"></div>
            <div className="h-4 w-24 bg-forvis-gray-200 rounded animate-pulse"></div>
            <div className="h-4 w-4 bg-forvis-gray-200 rounded animate-pulse"></div>
            <div className="h-4 w-32 bg-forvis-gray-200 rounded animate-pulse"></div>
          </div>

          {/* Header skeleton */}
          <div className="card mb-6">
            <div className="px-6 py-4">
              <div className="h-8 w-64 bg-forvis-gray-200 rounded animate-pulse mb-2"></div>
              <div className="h-4 w-48 bg-forvis-gray-200 rounded animate-pulse"></div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1">
              <div className="card h-full">
                <div className="px-4 py-3 border-b border-forvis-gray-200">
                  <div className="h-5 w-40 bg-forvis-gray-200 rounded animate-pulse"></div>
                </div>
                <div className="px-4 py-3 space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="space-y-2">
                      <div className="h-3 w-24 bg-forvis-gray-200 rounded animate-pulse"></div>
                      <div className="h-4 w-full bg-forvis-gray-200 rounded animate-pulse"></div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="lg:col-span-2">
              <div className="card" style={{ height: '600px' }}>
                <div className="px-4 py-3 border-b border-forvis-gray-200">
                  <div className="h-5 w-32 bg-forvis-gray-200 rounded animate-pulse"></div>
                </div>
                <div className="p-4 space-y-3">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="h-20 bg-forvis-gray-200 rounded animate-pulse"></div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!clientsData && !isLoadingClients) {
    return (
      <div className="min-h-screen bg-forvis-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900">Group Not Found</h2>
          <p className="mt-2 text-gray-600">The group you're looking for doesn't exist.</p>
          <Link 
            href={`/dashboard/${serviceLine.toLowerCase()}/${subServiceLineGroup}`}
            className="mt-4 inline-block text-blue-600 hover:text-blue-700"
          >
            Back to Workspace
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-forvis-gray-50">
      <div className="w-full px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumb */}
        <nav className="flex items-center space-x-2 text-sm text-forvis-gray-600 mb-6">
          <Link href="/dashboard" className="hover:text-forvis-gray-900 transition-colors">
            Home
          </Link>
          <ChevronRight className="h-4 w-4" />
          <Link 
            href={`/dashboard/${serviceLine.toLowerCase()}`} 
            className="hover:text-forvis-gray-900 transition-colors"
          >
            {formatServiceLineName(serviceLine)}
          </Link>
          <ChevronRight className="h-4 w-4" />
          <Link 
            href={`/dashboard/${serviceLine.toLowerCase()}/${subServiceLineGroup}`} 
            className="hover:text-forvis-gray-900 transition-colors"
          >
            {subServiceLineGroupDescription}
          </Link>
          <ChevronRight className="h-4 w-4" />
          <span className="text-forvis-gray-900 font-medium">{clientsData?.groupDesc || ''}</span>
        </nav>

        {/* Group Header */}
        <GroupHeader 
          groupCode={clientsData?.groupCode || groupCode}
          groupDesc={clientsData?.groupDesc || ''}
          clientCount={totalClients}
        />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:items-stretch">
          {/* Left Column - Group Information */}
          <div className="lg:col-span-1 self-stretch">
            <div className="card h-full flex flex-col">
              <div className="px-4 py-3 border-b border-forvis-gray-200 flex-shrink-0">
                <h2 className="text-base font-semibold text-forvis-gray-900">Group Information</h2>
              </div>
              <div className="px-4 py-3 flex-1">
                <dl className="space-y-3">
                  <div>
                    <dt className="text-xs font-semibold text-forvis-gray-700 uppercase tracking-wider mb-2">Details</dt>
                    <div className="space-y-2 ml-2">
                      <div>
                        <dt className="text-xs font-medium text-forvis-gray-500">Group Code</dt>
                        <dd className="mt-0.5 text-sm text-forvis-gray-900">{clientsData?.groupCode || groupCode}</dd>
                      </div>
                      <div>
                        <dt className="text-xs font-medium text-forvis-gray-500">Group Name</dt>
                        <dd className="mt-0.5 text-sm text-forvis-gray-900">{clientsData?.groupDesc || ''}</dd>
                      </div>
                      <div>
                        <dt className="text-xs font-medium text-forvis-gray-500">Total Clients</dt>
                        <dd className="mt-0.5 text-sm text-forvis-gray-900">{totalClients}</dd>
                      </div>
                    </div>
                  </div>
                </dl>
              </div>
            </div>
          </div>

          {/* Right Column - Clients List and 4-Card Grid */}
          <div className="lg:col-span-2 space-y-6 flex flex-col">
            {/* Clients Section with Fixed Height */}
            <div className="card flex-shrink-0" style={{ height: '600px', display: 'flex', flexDirection: 'column' }}>
              <div className="px-4 py-3 border-b border-forvis-gray-200 flex items-center justify-between flex-shrink-0">
                <h2 className="text-base font-semibold text-forvis-gray-900">
                  Clients ({totalClients})
                </h2>
              </div>

              {/* Search Bar */}
              <div className="px-4 pt-4 flex-shrink-0">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-forvis-gray-400" />
                  <input
                    type="text"
                    placeholder="Search clients by name, code, or partner..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 pr-4 py-2 w-full border border-forvis-gray-300 rounded-lg focus:ring-2 focus:ring-forvis-blue-500 focus:border-transparent text-sm"
                  />
                </div>
                {searchTerm && pagination && (
                  <div className="mt-2 text-sm text-forvis-gray-600">
                    Found <span className="font-medium">{pagination.total}</span>{' '}
                    client{pagination.total !== 1 ? 's' : ''} matching "{searchTerm}"
                  </div>
                )}
              </div>

              {/* Scrollable Content - Clients */}
              <div className="p-4 overflow-y-auto flex-1">
                {isFetchingClients && !isLoadingClients ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-forvis-blue-600 mx-auto"></div>
                    <p className="mt-2 text-sm text-forvis-gray-600">Loading clients...</p>
                  </div>
                ) : clients.length === 0 ? (
                  <div className="text-center py-8">
                    <Building2 className="mx-auto h-12 w-12 text-forvis-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-forvis-gray-900">
                      {searchTerm ? 'No clients found' : 'No clients in this group'}
                    </h3>
                    <p className="mt-1 text-sm text-forvis-gray-600">
                      {searchTerm 
                        ? `No clients match your search "${searchTerm}".`
                        : 'This group doesn\'t have any clients yet.'}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {clients.map((client: any) => (
                      <ClientListItem
                        key={client.id}
                        client={client}
                        serviceLine={serviceLine}
                        subServiceLineGroup={subServiceLineGroup}
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* Pagination */}
              {pagination && pagination.totalPages > 1 && (
                <div className="px-4 pb-4 flex-shrink-0">
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-forvis-gray-700">
                      Page {currentPage} of {pagination.totalPages}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        className="px-3 py-1.5 text-sm font-medium text-forvis-gray-700 bg-white border border-forvis-gray-300 rounded-md hover:bg-forvis-gray-50 disabled:bg-forvis-gray-100 disabled:text-forvis-gray-400 disabled:cursor-not-allowed transition-colors"
                      >
                        Previous
                      </button>
                      <button
                        onClick={() => setCurrentPage(p => Math.min(pagination.totalPages, p + 1))}
                        disabled={currentPage >= pagination.totalPages}
                        className="px-3 py-1.5 text-sm font-medium text-forvis-gray-700 bg-white border border-forvis-gray-300 rounded-md hover:bg-forvis-gray-50 disabled:bg-forvis-gray-100 disabled:text-forvis-gray-400 disabled:cursor-not-allowed transition-colors"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* 4-Card Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-shrink-0">
              {/* Documents Card */}
              <div className="card opacity-60">
                <div className="p-4 text-center">
                  <FileText className="mx-auto h-10 w-10 text-forvis-gray-300 mb-2" />
                  <h3 className="text-sm font-semibold text-forvis-gray-900 mb-1">Documents</h3>
                  <p className="text-xs text-forvis-gray-500">Coming Soon</p>
                </div>
              </div>

              {/* Reports Card */}
              <div className="card opacity-60">
                <div className="p-4 text-center">
                  <BarChart3 className="mx-auto h-10 w-10 text-forvis-gray-300 mb-2" />
                  <h3 className="text-sm font-semibold text-forvis-gray-900 mb-1">Reports</h3>
                  <p className="text-xs text-forvis-gray-500">Coming Soon</p>
                </div>
              </div>

              {/* Analytics Card */}
              <Link
                href={`/dashboard/${serviceLine.toLowerCase()}/${subServiceLineGroup}/groups/${encodeURIComponent(groupCode)}/analytics`}
                className="card hover:shadow-lg transition-shadow cursor-pointer"
                onMouseEnter={() => {
                  // Prefetch all analytics data on hover for instant tab switches
                  
                  // Prefetch WIP data for Profitability tab
                  queryClient.prefetchQuery({
                    queryKey: groupWipKeys.detail(groupCode),
                    queryFn: async () => {
                      const response = await fetch(`/api/groups/${encodeURIComponent(groupCode)}/wip`);
                      if (!response.ok) return null;
                      const result = await response.json();
                      return result.success ? result.data : null;
                    },
                    staleTime: 30 * 60 * 1000, // 30 minutes
                  });
                  
                  // Prefetch Debtors data for Recoverability tab
                  queryClient.prefetchQuery({
                    queryKey: groupDebtorsKeys.detail(groupCode),
                    queryFn: async () => {
                      const response = await fetch(`/api/groups/${encodeURIComponent(groupCode)}/debtors`);
                      if (!response.ok) return null;
                      const result = await response.json();
                      return result.success ? result.data : null;
                    },
                    staleTime: 30 * 60 * 1000, // 30 minutes
                  });
                  
                  // Prefetch Graphs data for Graphs tab
                  queryClient.prefetchQuery({
                    queryKey: groupGraphDataKeys.detail(groupCode),
                    queryFn: async () => {
                      const response = await fetch(`/api/groups/${encodeURIComponent(groupCode)}/analytics/graphs`);
                      if (!response.ok) return null;
                      const result = await response.json();
                      return result.success ? result.data : null;
                    },
                    staleTime: 30 * 60 * 1000, // 30 minutes
                  });
                }}
              >
                <div className="p-4 text-center">
                  <div className="mx-auto h-10 w-10 rounded-lg flex items-center justify-center mb-2" style={{ background: 'linear-gradient(to bottom right, #2E5AAC, #25488A)' }}>
                    <Presentation className="h-6 w-6 text-white" />
                  </div>
                  <h3 className="text-sm font-semibold text-forvis-gray-900 mb-1">Analytics</h3>
                  <p className="text-xs text-forvis-gray-600">View profitability & recoverability</p>
                </div>
              </Link>

              {/* Contacts Card */}
              <div className="card opacity-60">
                <div className="p-4 text-center">
                  <Users className="mx-auto h-10 w-10 text-forvis-gray-300 mb-2" />
                  <h3 className="text-sm font-semibold text-forvis-gray-900 mb-1">Contacts</h3>
                  <p className="text-xs text-forvis-gray-500">Coming Soon</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

