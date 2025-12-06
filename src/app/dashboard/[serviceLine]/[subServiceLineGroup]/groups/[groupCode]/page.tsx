'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { 
  ChevronRightIcon,
  BuildingOfficeIcon,
  MagnifyingGlassIcon,
  ClockIcon,
  DocumentTextIcon,
  ChartBarIcon,
  UserGroupIcon,
  PresentationChartLineIcon,
  FolderIcon,
} from '@heroicons/react/24/outline';
import { formatDate } from '@/lib/utils/taskUtils';
import { formatServiceLineName, isValidServiceLine, isSharedService } from '@/lib/utils/serviceLineUtils';
import { ServiceLine } from '@/types';
import { GroupHeader } from '@/components/features/clients/GroupHeader';
import { useClientGroup } from '@/hooks/clients/useClientGroup';
import { useGroupServiceLines } from '@/hooks/clients/useGroupServiceLines';
import { useSubServiceLineGroups } from '@/hooks/service-lines/useSubServiceLineGroups';
import { useServiceLine } from '@/components/providers/ServiceLineProvider';

export default function GroupDetailPage() {
  const params = useParams();
  const router = useRouter();
  const groupCode = decodeURIComponent(params.groupCode as string);
  const serviceLine = (params.serviceLine as string)?.toUpperCase();
  const subServiceLineGroup = params.subServiceLineGroup as string;
  const { setCurrentServiceLine } = useServiceLine();
  
  const [activeMainTab, setActiveMainTab] = useState<'clients' | 'tasks'>('clients');
  const [activeServiceLineTab, setActiveServiceLineTab] = useState<string>('');
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

  // Reset to first page when tab changes
  useEffect(() => {
    setCurrentPage(1);
  }, [activeMainTab]);

  // Fetch service line tab counts (lightweight query)
  const { data: serviceLineCountsData } = useGroupServiceLines(
    groupCode,
    true // Always enabled to populate tabs
  );

  // Fetch group with clients
  const { data: clientsData, isLoading: isLoadingClients, isFetching: isFetchingClients } = useClientGroup(groupCode, {
    search: debouncedSearch,
    page: currentPage,
    limit: itemsPerPage,
    type: 'clients',
    enabled: activeMainTab === 'clients',
  });

  // Fetch group with tasks ONLY for active service line tab
  const { data: tasksData, isLoading: isLoadingTasks, isFetching: isFetchingTasks } = useClientGroup(groupCode, {
    search: debouncedSearch,
    page: currentPage,
    limit: itemsPerPage,
    type: 'tasks',
    serviceLine: activeServiceLineTab, // Filter by active service line
    enabled: activeMainTab === 'tasks' && !!activeServiceLineTab, // Only fetch when tasks tab is active
  });

  const isLoading = activeMainTab === 'clients' ? isLoadingClients : isLoadingTasks;
  const isFetching = activeMainTab === 'clients' ? isFetchingClients : isFetchingTasks;

  // Extract data before any conditional returns
  const clients = clientsData?.clients || [];
  const tasks = tasksData?.tasks || []; // No need to filter - already filtered server-side
  const totalClients = clientsData?.pagination?.total || 0;

  // Build service line tabs from the lightweight counts query
  const serviceLineTabs = useMemo(() => {
    const serviceLines = serviceLineCountsData?.serviceLines || [];
    return serviceLines.map(sl => ({
      code: sl.code,
      desc: sl.name,
      count: sl.taskCount,
    }));
  }, [serviceLineCountsData]);
  
  // Calculate total tasks from all service line tabs
  const totalTasks = useMemo(() => {
    return serviceLineTabs.reduce((sum, tab) => sum + tab.count, 0);
  }, [serviceLineTabs]);

  // Set initial active service line tab when service line tabs are populated
  useEffect(() => {
    if (serviceLineTabs.length > 0 && !activeServiceLineTab) {
      setActiveServiceLineTab(serviceLineTabs[0]?.code || '');
    }
  }, [serviceLineTabs, activeServiceLineTab]);

  // Reset to first page when service line tab changes
  useEffect(() => {
    setCurrentPage(1);
  }, [activeServiceLineTab]);

  // Get pagination for current view
  const pagination = activeMainTab === 'clients' ? clientsData?.pagination : tasksData?.pagination;

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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumb */}
        <nav className="flex items-center space-x-2 text-sm text-forvis-gray-600 mb-6">
          <Link href="/dashboard" className="hover:text-forvis-gray-900 transition-colors">
            Dashboard
          </Link>
          <ChevronRightIcon className="h-4 w-4" />
          <Link 
            href={`/dashboard/${serviceLine.toLowerCase()}`} 
            className="hover:text-forvis-gray-900 transition-colors"
          >
            {formatServiceLineName(serviceLine)}
          </Link>
          <ChevronRightIcon className="h-4 w-4" />
          <Link 
            href={`/dashboard/${serviceLine.toLowerCase()}/${subServiceLineGroup}`} 
            className="hover:text-forvis-gray-900 transition-colors"
          >
            {subServiceLineGroupDescription}
          </Link>
          <ChevronRightIcon className="h-4 w-4" />
          <Link 
            href={`/dashboard/${serviceLine.toLowerCase()}/${subServiceLineGroup}`} 
            className="hover:text-forvis-gray-900 transition-colors"
          >
            Groups
          </Link>
          <ChevronRightIcon className="h-4 w-4" />
          <span className="text-forvis-gray-900 font-medium">{clientsData?.groupDesc || tasksData?.groupDesc || ''}</span>
        </nav>

        {/* Group Header */}
        <GroupHeader 
          groupCode={clientsData?.groupCode || groupCode}
          groupDesc={clientsData?.groupDesc || tasksData?.groupDesc || ''}
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
                        <dd className="mt-0.5 text-sm text-forvis-gray-900">{clientsData?.groupDesc || tasksData?.groupDesc || ''}</dd>
                      </div>
                      <div>
                        <dt className="text-xs font-medium text-forvis-gray-500">Total Clients</dt>
                        <dd className="mt-0.5 text-sm text-forvis-gray-900">{totalClients}</dd>
                      </div>
                      <div>
                        <dt className="text-xs font-medium text-forvis-gray-500">Total Tasks</dt>
                        <dd className="mt-0.5 text-sm text-forvis-gray-900">{totalTasks}</dd>
                      </div>
                    </div>
                  </div>
                </dl>
              </div>
            </div>
          </div>

          {/* Right Column - Clients/Tasks List and 4-Card Grid */}
          <div className="lg:col-span-2 space-y-6 flex flex-col">
            {/* Clients/Tasks Section with Fixed Height */}
            <div className="card flex-shrink-0" style={{ height: '600px', display: 'flex', flexDirection: 'column' }}>
              <div className="px-4 py-3 border-b border-forvis-gray-200 flex items-center justify-between flex-shrink-0">
                <h2 className="text-base font-semibold text-forvis-gray-900">
                  {activeMainTab === 'clients' ? (
                    <>Clients ({totalClients})</>
                  ) : (
                    <>
                      Tasks ({totalTasks})
                    </>
                  )}
                </h2>
              </div>

              {/* Main Tabs - Clients and Tasks */}
              <div className="border-b border-forvis-gray-200 flex-shrink-0">
                <nav className="flex -mb-px px-4" aria-label="Main Tabs">
                  <button
                    onClick={() => setActiveMainTab('clients')}
                    className={`flex items-center space-x-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                      activeMainTab === 'clients'
                        ? 'border-forvis-blue-600 text-forvis-blue-600'
                        : 'border-transparent text-forvis-gray-600 hover:text-forvis-gray-900 hover:border-forvis-gray-300'
                    }`}
                  >
                    <BuildingOfficeIcon className="h-5 w-5" />
                    <span>Clients</span>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                      activeMainTab === 'clients'
                        ? 'bg-forvis-blue-100 text-forvis-blue-700'
                        : 'bg-forvis-gray-100 text-forvis-gray-600'
                    }`}>
                      {totalClients}
                    </span>
                  </button>
                  <button
                    onClick={() => setActiveMainTab('tasks')}
                    className={`flex items-center space-x-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                      activeMainTab === 'tasks'
                        ? 'border-forvis-blue-600 text-forvis-blue-600'
                        : 'border-transparent text-forvis-gray-600 hover:text-forvis-gray-900 hover:border-forvis-gray-300'
                    }`}
                  >
                    <FolderIcon className="h-5 w-5" />
                    <span>Tasks</span>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                      activeMainTab === 'tasks'
                        ? 'bg-forvis-blue-100 text-forvis-blue-700'
                        : 'bg-forvis-gray-100 text-forvis-gray-600'
                    }`}>
                      {totalTasks}
                    </span>
                  </button>
                </nav>
              </div>

              {/* Service Line Sub-Tabs - Only shown when Tasks tab is active */}
              {activeMainTab === 'tasks' && serviceLineTabs.length > 0 && (
                <div className="border-b border-forvis-gray-200 flex-shrink-0 bg-forvis-gray-50">
                  <nav className="flex -mb-px px-4 overflow-x-auto" aria-label="Service Line Tabs">
                    {serviceLineTabs.map(({ code, desc, count }) => (
                      <button
                        key={code}
                        onClick={() => setActiveServiceLineTab(code)}
                        className={`flex items-center space-x-2 px-3 py-2 text-xs font-medium border-b-2 transition-colors whitespace-nowrap ${
                          activeServiceLineTab === code
                            ? 'border-forvis-blue-600 text-forvis-blue-600 bg-white'
                            : 'border-transparent text-forvis-gray-600 hover:text-forvis-gray-900 hover:border-forvis-gray-300'
                        }`}
                      >
                        <span>{desc}</span>
                        <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium ${
                          activeServiceLineTab === code
                            ? 'bg-forvis-blue-100 text-forvis-blue-700'
                            : 'bg-forvis-gray-100 text-forvis-gray-600'
                        }`}>
                          {count}
                        </span>
                      </button>
                    ))}
                  </nav>
                </div>
              )}

              {/* Search Bar */}
              <div className="px-4 pt-4 flex-shrink-0">
                <div className="relative">
                  <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-forvis-gray-400" />
                  <input
                    type="text"
                    placeholder={activeMainTab === 'clients' 
                      ? "Search clients by name, code, or partner..." 
                      : "Search projects by name, code, or client..."}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 pr-4 py-2 w-full border border-forvis-gray-300 rounded-lg focus:ring-2 focus:ring-forvis-blue-500 focus:border-transparent text-sm"
                  />
                </div>
                {searchTerm && (
                  <div className="mt-2 text-sm text-forvis-gray-600">
                    {activeMainTab === 'clients' ? (
                      pagination ? (
                        <>
                          Found <span className="font-medium">{pagination.total}</span>{' '}
                          client{pagination.total !== 1 ? 's' : ''} matching "{searchTerm}"
                        </>
                      ) : null
                    ) : (
                      <>
                        Showing <span className="font-medium">{tasks.length}</span>{' '}
                        project{tasks.length !== 1 ? 's' : ''} matching "{searchTerm}"
                        {activeServiceLineTab && serviceLineTabs.find(t => t.code === activeServiceLineTab) && (
                          <> in {serviceLineTabs.find(t => t.code === activeServiceLineTab)?.desc}</>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* Scrollable Content - Clients or Projects */}
              <div className="p-4 overflow-y-auto flex-1">
                {activeMainTab === 'clients' ? (
                  /* Clients List */
                  isFetchingClients && !isLoadingClients ? (
                    <div className="text-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-forvis-blue-600 mx-auto"></div>
                      <p className="mt-2 text-sm text-forvis-gray-600">Loading clients...</p>
                    </div>
                  ) : clients.length === 0 ? (
                    <div className="text-center py-8">
                      <BuildingOfficeIcon className="mx-auto h-12 w-12 text-forvis-gray-400" />
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
                        <Link
                          key={client.id}
                          href={`/dashboard/${serviceLine.toLowerCase()}/${subServiceLineGroup}/clients/${client.ClientID}`}
                          className="block p-3 border border-forvis-gray-200 rounded-lg transition-all hover:border-forvis-blue-500 hover:shadow-sm cursor-pointer"
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center space-x-2 mb-1 flex-wrap">
                                <h3 className="text-sm font-semibold text-forvis-gray-900">
                                  {client.clientNameFull || client.clientCode}
                                </h3>
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700 border border-gray-200">
                                  {client.clientCode}
                                </span>
                                {client.active !== 'Yes' && (
                                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-forvis-gray-200 text-forvis-gray-700">
                                    Inactive
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3 text-xs text-forvis-gray-500">
                              <span title="Partner">
                                Partner: {client.clientPartner}
                              </span>
                              {client.industry && (
                                <span title="Industry">
                                  Industry: {client.industry}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center space-x-2">
                              <span className="inline-flex items-center justify-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-forvis-blue-100 text-forvis-blue-800">
                                {client._count?.Task || 0} tasks
                              </span>
                            </div>
                          </div>
                        </Link>
                      ))}
                    </div>
                  )
                ) : (
                  /* Projects List */
                  isFetchingTasks && !isLoadingTasks ? (
                    <div className="text-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-forvis-blue-600 mx-auto"></div>
                      <p className="mt-2 text-sm text-forvis-gray-600">Loading projects...</p>
                    </div>
                  ) : tasks.length === 0 ? (
                    <div className="text-center py-8">
                      <FolderIcon className="mx-auto h-12 w-12 text-forvis-gray-400" />
                      <h3 className="mt-2 text-sm font-medium text-forvis-gray-900">
                        {searchTerm ? 'No projects found' : 'No projects available'}
                      </h3>
                      <p className="mt-1 text-sm text-forvis-gray-600">
                        {searchTerm 
                          ? `No projects match your search "${searchTerm}".`
                          : activeServiceLineTab && serviceLineTabs.find(t => t.code === activeServiceLineTab)
                            ? `There are no projects for ${serviceLineTabs.find(t => t.code === activeServiceLineTab)?.desc} in this group.`
                            : 'Select a service line to view projects.'}
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {tasks.map((task: any) => (
                        <Link
                          key={task.id}
                          href={`/dashboard/${serviceLine.toLowerCase()}/${subServiceLineGroup}/clients/${task.Client.ClientID}/tasks/${task.id}`}
                          className="block p-3 border border-forvis-gray-200 rounded-lg transition-all hover:border-forvis-blue-500 hover:shadow-sm cursor-pointer"
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center space-x-2 mb-1 flex-wrap">
                                <h3 className="text-sm font-semibold text-forvis-gray-900">
                                  {task.TaskDesc}
                                </h3>
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700 border border-gray-200">
                                  {task.TaskCode}
                                </span>
                                {task.ServLineDesc && (
                                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-forvis-blue-100 text-forvis-blue-700">
                                    {task.ServLineDesc}
                                  </span>
                                )}
                                {task.Active !== 'Yes' && (
                                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-forvis-gray-200 text-forvis-gray-700">
                                    Inactive
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3 text-xs text-forvis-gray-500">
                              <span title="Client">
                                Client: {task.Client.clientNameFull || task.Client.clientCode}
                              </span>
                              <span className="flex items-center">
                                <ClockIcon className="h-3.5 w-3.5 mr-1" />
                                {formatDate(task.updatedAt)}
                              </span>
                            </div>
                          </div>
                        </Link>
                      ))}
                    </div>
                  )
                )}
              </div>

              {/* Pagination - only show for clients tab */}
              {pagination && pagination.totalPages > 1 && activeMainTab === 'clients' && (
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
                  <DocumentTextIcon className="mx-auto h-10 w-10 text-forvis-gray-300 mb-2" />
                  <h3 className="text-sm font-semibold text-forvis-gray-900 mb-1">Documents</h3>
                  <p className="text-xs text-forvis-gray-500">Coming Soon</p>
                </div>
              </div>

              {/* Reports Card */}
              <div className="card opacity-60">
                <div className="p-4 text-center">
                  <ChartBarIcon className="mx-auto h-10 w-10 text-forvis-gray-300 mb-2" />
                  <h3 className="text-sm font-semibold text-forvis-gray-900 mb-1">Reports</h3>
                  <p className="text-xs text-forvis-gray-500">Coming Soon</p>
                </div>
              </div>

              {/* Analytics Card */}
              <Link
                href={`/dashboard/${serviceLine.toLowerCase()}/${subServiceLineGroup}/groups/${encodeURIComponent(groupCode)}/analytics`}
                className="card hover:shadow-lg transition-shadow cursor-pointer"
              >
                <div className="p-4 text-center">
                  <div className="mx-auto h-10 w-10 rounded-lg flex items-center justify-center mb-2" style={{ background: 'linear-gradient(to bottom right, #2E5AAC, #25488A)' }}>
                    <PresentationChartLineIcon className="h-6 w-6 text-white" />
                  </div>
                  <h3 className="text-sm font-semibold text-forvis-gray-900 mb-1">Analytics</h3>
                  <p className="text-xs text-forvis-gray-600">View profitability & recoverability</p>
                </div>
              </Link>

              {/* Contacts Card */}
              <div className="card opacity-60">
                <div className="p-4 text-center">
                  <UserGroupIcon className="mx-auto h-10 w-10 text-forvis-gray-300 mb-2" />
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

