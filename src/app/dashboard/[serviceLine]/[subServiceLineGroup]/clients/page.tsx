'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { 
  Search,
  Building2,
  ChevronRight,
  Folder,
  Clock,
} from 'lucide-react';
import { isValidServiceLine, formatServiceLineName, isSharedService, formatTaskType, getTaskTypeColor } from '@/lib/utils/serviceLineUtils';
import { useServiceLine } from '@/components/providers/ServiceLineProvider';
import { ServiceLine } from '@/types';
import { useClients, type Client, clientKeys } from '@/hooks/clients/useClients';
import { useTasks, type TaskListItem, taskListKeys } from '@/hooks/tasks/useTasks';
import { useSubServiceLineGroups } from '@/hooks/service-lines/useSubServiceLineGroups';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { formatDate } from '@/lib/utils/taskUtils';
import { LoadingSpinner } from '@/components/ui';

export default function ServiceLineClientsPage() {
  const router = useRouter();
  const params = useParams();
  const queryClient = useQueryClient();
  const serviceLine = (params.serviceLine as string)?.toUpperCase();
  const subServiceLineGroup = params.subServiceLineGroup as string;
  const { setCurrentServiceLine } = useServiceLine();
  
  const [activeTab, setActiveTab] = useState<'clients' | 'all-tasks' | 'my-tasks'>('clients');
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(50);

  // Fetch sub-service line groups to get the description
  const { data: subGroups } = useSubServiceLineGroups({
    serviceLine: serviceLine || '',
    enabled: !!serviceLine && isValidServiceLine(serviceLine),
  });
  
  // Find the current sub-service line group to get its description
  const currentSubGroup = subGroups?.find(sg => sg.code === subServiceLineGroup);
  const subServiceLineGroupDescription = currentSubGroup?.description || subServiceLineGroup;

  // Prefetch client details on hover for faster navigation
  const prefetchClient = (GSClientID: string) => {
    queryClient.prefetchQuery({
      queryKey: clientKeys.detail(GSClientID, {
        taskPage: 1,
        taskLimit: 20,
        serviceLine,
      }),
      queryFn: async () => {
        const searchParams = new URLSearchParams();
        searchParams.set('taskPage', '1');
        searchParams.set('taskLimit', '20');
        if (serviceLine) searchParams.set('serviceLine', serviceLine);
        
        const response = await fetch(`/api/clients/${GSClientID}?${searchParams.toString()}`);
        if (!response.ok) throw new Error('Failed to fetch client');
        
        const result = await response.json();
        return result.success ? result.data : result;
      },
      staleTime: 5 * 60 * 1000, // 5 minutes
    });
  };

  // Prefetch task details on hover
  const prefetchTask = (taskId: number) => {
    queryClient.prefetchQuery({
      queryKey: ['tasks', taskId.toString()],
      queryFn: async () => {
        const response = await fetch(`/api/tasks/${taskId}`);
        if (!response.ok) throw new Error('Failed to fetch task');
        
        const result = await response.json();
        return result.success ? result.data : result;
      },
      staleTime: 5 * 60 * 1000, // 5 minutes
    });
  };

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setCurrentPage(1); // Reset to first page on search
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Fetch clients using React Query hook with server-side search
  const { 
    data: clientsData, 
    isLoading: isLoadingClients,
    isFetching: isFetchingClients,
    error: clientsError 
  } = useClients({
    search: debouncedSearch,
    page: currentPage,
    limit: itemsPerPage,
    subServiceLineGroup,
    enabled: activeTab === 'clients',
  });
  const clients = clientsData?.clients || [];
  const clientsPagination = clientsData?.pagination;

  // Fetch all tasks for the All Tasks tab with server-side search
  const { 
    data: allTasksData, 
    isLoading: isLoadingAllTasks,
    isFetching: isFetchingAllTasks
  } = useTasks({
    search: debouncedSearch,
    page: currentPage,
    limit: itemsPerPage,
    serviceLine,
    subServiceLineGroup,
    includeArchived: false,
    internalOnly: false,
    clientTasksOnly: false,
    myTasksOnly: false,
    enabled: activeTab === 'all-tasks',
  });
  const allTasks = allTasksData?.tasks || [];
  const allTasksPagination = allTasksData?.pagination;

  // Fetch user's tasks for the My Tasks tab with server-side search
  const { 
    data: myTasksData, 
    isLoading: isLoadingMyTasks,
    isFetching: isFetchingMyTasks
  } = useTasks({
    search: debouncedSearch,
    page: currentPage,
    limit: itemsPerPage,
    serviceLine,
    subServiceLineGroup,
    includeArchived: false,
    internalOnly: false,
    clientTasksOnly: false,
    myTasksOnly: true,
    enabled: activeTab === 'my-tasks',
  });
  const myTasks = myTasksData?.tasks || [];
  const myTasksPagination = myTasksData?.pagination;
  
  const isLoading = activeTab === 'clients' 
    ? isLoadingClients 
    : activeTab === 'all-tasks' 
      ? isLoadingAllTasks 
      : isLoadingMyTasks;
  const isFetching = activeTab === 'clients' 
    ? isFetchingClients 
    : activeTab === 'all-tasks' 
      ? isFetchingAllTasks 
      : isFetchingMyTasks;

  // Validate service line
  useEffect(() => {
    if (!isValidServiceLine(serviceLine)) {
      router.push('/dashboard');
    } else {
      setCurrentServiceLine(serviceLine as ServiceLine);
    }
  }, [serviceLine, router, setCurrentServiceLine]);

  // Server-side search and pagination handles filtering
  // No need for client-side filtering

  // Reset to first page when search or tab changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, activeTab]);

  if (!isValidServiceLine(serviceLine)) {
    return null;
  }

  // Only show full page loader on initial load
  if (isLoading && !isFetching) {
    return (
      <div className="min-h-screen bg-forvis-gray-50 flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  const currentData = activeTab === 'clients' 
    ? clients 
    : activeTab === 'all-tasks' 
      ? allTasks 
      : myTasks;
  const pagination = activeTab === 'clients' 
    ? clientsPagination 
    : activeTab === 'all-tasks' 
      ? allTasksPagination 
      : myTasksPagination;
  const totalCount = pagination?.total ?? currentData.length;

  return (
    <div className="min-h-screen bg-forvis-gray-50 relative">
      {/* Loading overlay for tab switches */}
      {isFetching && !isLoading && (
        <div className="fixed inset-0 bg-white bg-opacity-90 z-50 flex items-center justify-center">
          <div className="bg-white rounded-lg p-6 shadow-corporate-lg">
            <LoadingSpinner size="lg" className="mx-auto" />
            <p className="mt-4 text-sm font-normal text-forvis-gray-600">Loading...</p>
          </div>
        </div>
      )}
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Breadcrumb */}
        <nav className="flex items-center space-x-2 text-sm text-forvis-gray-600 py-4 mb-2">
          <Link href="/dashboard" className="hover:text-forvis-gray-900 transition-all duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-forvis-blue-500 focus:ring-offset-2 rounded px-1">
            Home
          </Link>
          <ChevronRight className="h-4 w-4" />
          <Link 
            href={`/dashboard/${serviceLine.toLowerCase()}`} 
            className="hover:text-forvis-gray-900 transition-all duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-forvis-blue-500 focus:ring-offset-2 rounded px-1"
          >
            {formatServiceLineName(serviceLine)}
          </Link>
          <ChevronRight className="h-4 w-4" />
          <Link 
            href={`/dashboard/${serviceLine.toLowerCase()}/${subServiceLineGroup}`} 
            className="hover:text-forvis-gray-900 transition-all duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-forvis-blue-500 focus:ring-offset-2 rounded px-1"
          >
            {subServiceLineGroupDescription}
          </Link>
          <ChevronRight className="h-4 w-4" />
          <span className="text-forvis-gray-900 font-medium">
            {activeTab === 'clients' ? 'Clients' : activeTab === 'all-tasks' ? 'All Tasks' : 'My Tasks'}
          </span>
        </nav>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 space-y-4 sm:space-y-0">
          <div>
            <h1 className="text-3xl font-semibold text-forvis-gray-900">
              {formatServiceLineName(serviceLine)} - {subServiceLineGroupDescription}
            </h1>
            <p className="mt-1 text-sm font-normal text-forvis-gray-600">
              {activeTab === 'clients' 
                ? 'Select a client to view their tasks and details'
                : activeTab === 'all-tasks'
                  ? 'View and manage all tasks in this sub-service line'
                  : 'View and manage your assigned tasks'}
            </p>
          </div>
          
          <div className="text-right">
            <div className="text-2xl font-bold text-forvis-blue-600">
              {totalCount}
            </div>
            <div className="text-sm text-forvis-gray-600">
              Total {activeTab === 'clients' ? 'Clients' : 'Tasks'}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-6 border-b border-forvis-gray-200">
          <nav className="flex -mb-px space-x-8">
            <button
              onClick={() => setActiveTab('clients')}
              className={`pb-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'clients'
                  ? 'border-forvis-blue-600 text-forvis-blue-600'
                  : 'border-transparent text-forvis-gray-600 hover:text-forvis-gray-900 hover:border-forvis-gray-300'
              }`}
            >
              <div className="flex items-center space-x-2">
                <Building2 className="h-5 w-5" />
                <span>Clients</span>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  activeTab === 'clients'
                    ? 'bg-forvis-blue-100 text-forvis-blue-700'
                    : 'bg-forvis-gray-100 text-forvis-gray-600'
                }`}>
                  {clientsPagination?.total ?? clients.length}
                </span>
              </div>
            </button>
            <button
              onClick={() => setActiveTab('all-tasks')}
              className={`pb-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'all-tasks'
                  ? 'border-forvis-blue-600 text-forvis-blue-600'
                  : 'border-transparent text-forvis-gray-600 hover:text-forvis-gray-900 hover:border-forvis-gray-300'
              }`}
            >
              <div className="flex items-center space-x-2">
                <Folder className="h-5 w-5" />
                <span>All Tasks</span>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  activeTab === 'all-tasks'
                    ? 'bg-forvis-blue-100 text-forvis-blue-700'
                    : 'bg-forvis-gray-100 text-forvis-gray-600'
                }`}>
                  {isFetchingAllTasks && !allTasksPagination ? '...' : (allTasksPagination?.total ?? 0)}
                </span>
              </div>
            </button>
            <button
              onClick={() => setActiveTab('my-tasks')}
              className={`pb-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'my-tasks'
                  ? 'border-forvis-blue-600 text-forvis-blue-600'
                  : 'border-transparent text-forvis-gray-600 hover:text-forvis-gray-900 hover:border-forvis-gray-300'
              }`}
            >
              <div className="flex items-center space-x-2">
                <Clock className="h-5 w-5" />
                <span>My Tasks</span>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  activeTab === 'my-tasks'
                    ? 'bg-forvis-blue-100 text-forvis-blue-700'
                    : 'bg-forvis-gray-100 text-forvis-gray-600'
                }`}>
                  {isFetchingMyTasks && !myTasksPagination ? '...' : (myTasksPagination?.total ?? 0)}
                </span>
              </div>
            </button>
          </nav>
        </div>

        {/* Search and Filter Bar */}
        <div className="mb-6 flex gap-4 items-center">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-forvis-gray-400" />
            <input
              type="text"
              placeholder={
                activeTab === 'clients'
                  ? 'Search by name, code, group, or industry...'
                  : 'Search by task name, client, or task code...'
              }
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 w-full border border-forvis-gray-300 rounded-lg transition-all duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-forvis-blue-500 focus:ring-offset-2 focus:border-transparent"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm text-forvis-gray-700">Show:</label>
            <select
              value={itemsPerPage}
                onChange={(e) => {
                  setItemsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="border border-forvis-gray-300 rounded-md px-3 py-2 text-sm transition-all duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-forvis-blue-500 focus:ring-offset-2 focus:border-transparent"
              >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
        </div>

        {/* Results count */}
        {searchTerm && (
          <div className="mb-4 text-sm text-forvis-gray-600">
            Found <span className="font-medium">{currentData.length}</span>{' '}
            {activeTab === 'clients' ? 'client' : 'task'}{currentData.length !== 1 ? 's' : ''} matching "{searchTerm}"
          </div>
        )}

        {/* Content - Clients or Tasks */}
        {activeTab === 'clients' ? (
          /* Clients List */
          clients.length === 0 ? (
            <div className="card text-center py-12">
              <Building2 className="mx-auto h-12 w-12 text-forvis-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-forvis-gray-900">No clients</h3>
              <p className="mt-1 text-sm text-forvis-gray-600">
                {searchTerm ? 'No clients match your search.' : 'No clients available for this service line.'}
              </p>
            </div>
          ) : (
          <>
            <div className="card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full divide-y divide-forvis-gray-200" style={{ tableLayout: 'fixed' }}>
                  <colgroup>
                    <col style={{ width: '32%' }} />
                    <col style={{ width: '22%' }} />
                    <col style={{ width: '20%' }} />
                    <col style={{ width: '12%' }} />
                    <col style={{ width: '8%' }} />
                    <col style={{ width: '6%' }} />
                  </colgroup>
                  <thead className="bg-forvis-gray-50">
                    <tr>
                      <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-forvis-gray-500 uppercase tracking-wider">
                        Client
                      </th>
                      <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-forvis-gray-500 uppercase tracking-wider">
                        Group
                      </th>
                      <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-forvis-gray-500 uppercase tracking-wider">
                        Industry
                      </th>
                      <th scope="col" className="px-3 py-2 text-center text-xs font-medium text-forvis-gray-500 uppercase tracking-wider">
                        Partner
                      </th>
                      <th scope="col" className="px-3 py-2 text-center text-xs font-medium text-forvis-gray-500 uppercase tracking-wider">
                        Tasks
                      </th>
                      <th scope="col" className="px-3 py-2 text-center text-xs font-medium text-forvis-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-forvis-gray-200">
                    {clients.map((client) => (
                        <tr key={client.id} className="hover:bg-forvis-gray-50 transition-colors">
                          <td className="px-3 py-2 truncate">
                            <div className="flex items-center space-x-2 min-w-0">
                              <div className="w-7 h-7 rounded-lg bg-forvis-blue-100 flex items-center justify-center flex-shrink-0">
                                <Building2 className="h-3.5 w-3.5 text-forvis-blue-600" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="text-sm font-medium text-forvis-gray-900 truncate">
                                  {client.clientNameFull || client.clientCode}
                                </div>
                                <div className="text-xs text-forvis-gray-500 truncate">{client.clientCode}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-3 py-2">
                            <div className="text-sm text-forvis-gray-600 truncate" title={client.groupDesc}>
                              {client.groupDesc}
                            </div>
                          </td>
                          <td className="px-3 py-2">
                            <div className="text-sm text-forvis-gray-600 truncate" title={client.industry || client.sector || '-'}>
                              {client.industry || client.sector || '-'}
                            </div>
                          </td>
                          <td className="px-3 py-2">
                            <div className="text-sm text-forvis-gray-600 text-center truncate" title={client.clientPartnerName || client.clientPartner}>
                              {client.clientPartnerName || client.clientPartner}
                            </div>
                          </td>
                          <td className="px-3 py-2 text-center">
                            <span className="inline-flex items-center justify-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-forvis-blue-100 text-forvis-blue-800">
                              {client._count.Task || 0}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-center">
                            <Link
                              href={`/dashboard/${serviceLine.toLowerCase()}/${subServiceLineGroup}/clients/${client.GSClientID}`}
                              className="text-forvis-blue-600 hover:text-forvis-blue-900 text-xs font-medium"
                              onMouseEnter={() => prefetchClient(client.GSClientID)}
                            >
                              View
                            </Link>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Pagination */}
            <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-sm text-forvis-gray-700">
                Showing <span className="font-medium">{totalCount === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1}</span> to{' '}
                <span className="font-medium">
                  {Math.min(currentPage * itemsPerPage, totalCount)}
                </span>{' '}
                of <span className="font-medium">{totalCount}</span> {debouncedSearch ? 'filtered ' : ''}client{totalCount !== 1 ? 's' : ''}
              </div>
              
              {(pagination?.totalPages ?? 1) > 1 && (
                <div className="flex gap-2">
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-1.5 text-sm font-medium text-forvis-gray-700 bg-white border border-forvis-gray-300 rounded-md hover:bg-forvis-gray-50 disabled:bg-forvis-gray-100 disabled:text-forvis-gray-400 disabled:cursor-not-allowed transition-colors"
                  >
                    Previous
                  </button>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: pagination?.totalPages ?? 1 }, (_, i) => i + 1)
                      .filter(page => {
                        // Show first page, last page, current page, and 1 page on each side
                        const totalPages = pagination?.totalPages ?? 1;
                        return (
                          page === 1 ||
                          page === totalPages ||
                          (page >= currentPage - 1 && page <= currentPage + 1)
                        );
                      })
                      .map((page, index, array) => {
                        // Add ellipsis if there's a gap
                        const prevPage = array[index - 1];
                        const showEllipsis = prevPage && page - prevPage > 1;
                        
                        return (
                          <div key={page} className="flex items-center">
                            {showEllipsis && <span className="px-2 text-forvis-gray-500">...</span>}
                            <button
                              onClick={() => setCurrentPage(page)}
                              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                                currentPage === page
                                  ? 'bg-forvis-blue-600 text-white'
                                  : 'text-forvis-gray-700 bg-white border border-forvis-gray-300 hover:bg-forvis-gray-50'
                              }`}
                            >
                              {page}
                            </button>
                          </div>
                        );
                      })}
                  </div>
                  <button
                    onClick={() => setCurrentPage(p => Math.min(pagination?.totalPages ?? 1, p + 1))}
                    disabled={currentPage >= (pagination?.totalPages ?? 1)}
                    className="px-3 py-1.5 text-sm font-medium text-forvis-gray-700 bg-white border border-forvis-gray-300 rounded-md hover:bg-forvis-gray-50 disabled:bg-forvis-gray-100 disabled:text-forvis-gray-400 disabled:cursor-not-allowed transition-colors"
                  >
                    Next
                  </button>
                </div>
              )}
            </div>
          </>
        )
        ) : (
          /* Tasks List (All Tasks or My Tasks) */
          currentData.length === 0 ? (
            <div className="card text-center py-12">
              <Folder className="mx-auto h-12 w-12 text-forvis-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-forvis-gray-900">No tasks</h3>
              <p className="mt-1 text-sm text-forvis-gray-600">
                {searchTerm 
                  ? 'No tasks match your search.' 
                  : activeTab === 'all-tasks'
                    ? 'No tasks available in this sub-service line group.'
                    : 'You have no assigned tasks in this sub-service line group.'}
              </p>
            </div>
          ) : (
            <>
              <div className="card overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full divide-y divide-forvis-gray-200">
                    <thead className="bg-forvis-gray-50">
                      <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-forvis-gray-500 uppercase tracking-wider">
                          Task Name
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-forvis-gray-500 uppercase tracking-wider">
                          Client
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-forvis-gray-500 uppercase tracking-wider">
                          Service Line
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-forvis-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-forvis-gray-500 uppercase tracking-wider">
                          Updated
                        </th>
                        <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-forvis-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-forvis-gray-200">
                      {(currentData as typeof allTasks).map((task) => (
                          <tr key={task.id} className="hover:bg-forvis-gray-50 transition-colors">
                            <td className="px-6 py-4">
                              <div className="flex items-center space-x-3">
                                <div className="w-8 h-8 rounded-lg bg-forvis-blue-100 flex items-center justify-center flex-shrink-0">
                                  <Folder className="h-4 w-4 text-forvis-blue-600" />
                                </div>
                                <div>
                                  <div className="text-sm font-medium text-forvis-gray-900">
                                    {task.name}
                                  </div>
                                  {task.description && (
                                    <div className="text-xs text-forvis-gray-500 line-clamp-1">
                                      {task.description}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              {task.client ? (
                                <Link
                                  href={`/dashboard/${serviceLine.toLowerCase()}/${subServiceLineGroup}/clients/${task.client.GSClientID}`}
                                  className="block"
                                >
                                  <div className="text-sm font-medium text-forvis-blue-600 hover:text-forvis-blue-900">
                                    {task.client.clientNameFull || task.client.clientCode}
                                  </div>
                                  <div className="text-xs text-forvis-gray-500">{task.client.clientCode}</div>
                                </Link>
                              ) : (
                                <span className="text-sm text-forvis-gray-500 italic">Internal</span>
                              )}
                            </td>
                            <td className="px-6 py-4">
                              <span className="text-sm text-forvis-gray-600">
                                {task.projectType || task.serviceLine}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <StatusBadge status={task.status} />
                            </td>
                            <td className="px-6 py-4 text-center">
                              <div className="flex items-center justify-center text-sm text-forvis-gray-600">
                                <Clock className="h-4 w-4 mr-1" />
                                {formatDate(task.updatedAt)}
                              </div>
                            </td>
                            <td className="px-6 py-4 text-center">
                              <Link
                                href={task.client?.GSClientID 
                                  ? `/dashboard/${serviceLine.toLowerCase()}/${subServiceLineGroup}/clients/${task.client.GSClientID}/tasks/${task.id}`
                                  : `/dashboard/tasks/${task.id}`}
                                className="text-forvis-blue-600 hover:text-forvis-blue-900 text-sm font-medium"
                                onMouseEnter={() => prefetchTask(task.id)}
                              >
                                View
                              </Link>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Pagination */}
              <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="text-sm text-forvis-gray-700">
                  Showing <span className="font-medium">{totalCount === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1}</span> to{' '}
                  <span className="font-medium">
                    {Math.min(currentPage * itemsPerPage, totalCount)}
                  </span>{' '}
                  of <span className="font-medium">{totalCount}</span> {debouncedSearch ? 'filtered ' : ''}task{totalCount !== 1 ? 's' : ''}
                </div>
                
                {(pagination?.totalPages ?? 1) > 1 && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="px-3 py-1.5 text-sm font-medium text-forvis-gray-700 bg-white border border-forvis-gray-300 rounded-md hover:bg-forvis-gray-50 disabled:bg-forvis-gray-100 disabled:text-forvis-gray-400 disabled:cursor-not-allowed transition-colors"
                    >
                      Previous
                    </button>
                    <div className="flex items-center gap-1">
                      {Array.from({ length: pagination?.totalPages ?? 1 }, (_, i) => i + 1)
                        .filter(page => {
                          const totalPages = pagination?.totalPages ?? 1;
                          return (
                            page === 1 ||
                            page === totalPages ||
                            (page >= currentPage - 1 && page <= currentPage + 1)
                          );
                        })
                        .map((page, index, array) => {
                          const prevPage = array[index - 1];
                          const showEllipsis = prevPage && page - prevPage > 1;
                          
                          return (
                            <div key={page} className="flex items-center">
                              {showEllipsis && <span className="px-2 text-forvis-gray-500">...</span>}
                              <button
                                onClick={() => setCurrentPage(page)}
                                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                                  currentPage === page
                                    ? 'bg-forvis-blue-600 text-white'
                                    : 'text-forvis-gray-700 bg-white border border-forvis-gray-300 hover:bg-forvis-gray-50'
                                }`}
                              >
                                {page}
                              </button>
                            </div>
                          );
                        })}
                    </div>
                    <button
                      onClick={() => setCurrentPage(p => Math.min(pagination?.totalPages ?? 1, p + 1))}
                      disabled={currentPage >= (pagination?.totalPages ?? 1)}
                      className="px-3 py-1.5 text-sm font-medium text-forvis-gray-700 bg-white border border-forvis-gray-300 rounded-md hover:bg-forvis-gray-50 disabled:bg-forvis-gray-100 disabled:text-forvis-gray-400 disabled:cursor-not-allowed transition-colors"
                    >
                      Next
                    </button>
                  </div>
                )}
              </div>
            </>
          )
        )}
      </div>
    </div>
  );
}

