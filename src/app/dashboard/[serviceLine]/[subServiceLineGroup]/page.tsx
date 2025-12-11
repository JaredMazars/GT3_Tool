'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { 
  Search,
  Building2,
  ChevronRight,
  Folder,
  Clock,
  Users,
  AlertTriangle,
  Calendar,
  LayoutGrid,
} from 'lucide-react';
import { isValidServiceLine, formatServiceLineName, isSharedService, formatTaskType, getTaskTypeColor } from '@/lib/utils/serviceLineUtils';
import { useServiceLine } from '@/components/providers/ServiceLineProvider';
import { ServiceLine } from '@/types';
import { useClients, type Client } from '@/hooks/clients/useClients';
import { useTasks, type TaskListItem } from '@/hooks/tasks/useTasks'; // Updated with GSClientID
import { useSubServiceLineGroups } from '@/hooks/service-lines/useSubServiceLineGroups';
import { useClientGroups } from '@/hooks/clients/useClientGroups';
import { ServiceLineSelector } from '@/components/features/service-lines/ServiceLineSelector';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { formatDate } from '@/lib/utils/taskUtils';
import { Button, LoadingSpinner, Card } from '@/components/ui';
import { MyPlanningView } from '@/components/features/planning';
import { useSubServiceLineUsers } from '@/hooks/service-lines/useSubServiceLineUsers';
import { GanttTimeline } from '@/components/features/tasks/TeamPlanner';
import { TaskRole, ServiceLineRole } from '@/types';

export default function SubServiceLineWorkspacePage() {
  const router = useRouter();
  const params = useParams();
  const serviceLine = (params.serviceLine as string)?.toUpperCase();
  const subServiceLineGroup = params.subServiceLineGroup as string;
  const { setCurrentServiceLine } = useServiceLine();
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [currentUserSubGroupRole, setCurrentUserSubGroupRole] = useState<string>('VIEWER');
  
  const [activeTab, setActiveTab] = useState<'groups' | 'clients' | 'tasks' | 'planner' | 'my-tasks' | 'my-planning'>('groups');
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(50);
  
  // Planner filters
  const [plannerSearchTerm, setPlannerSearchTerm] = useState('');
  const [jobGradingFilter, setJobGradingFilter] = useState<string>('');
  const [officeFilter, setOfficeFilter] = useState<string>('');

  // Fetch sub-service line groups to get the description
  const { data: subGroups } = useSubServiceLineGroups({
    serviceLine: serviceLine || '',
    enabled: !!serviceLine && isValidServiceLine(serviceLine),
  });
  
  // Find the current sub-service line group to get its description
  const currentSubGroup = subGroups?.find(sg => sg.code === subServiceLineGroup);
  const subServiceLineGroupDescription = currentSubGroup?.description || subServiceLineGroup;

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setCurrentPage(1); // Reset to first page on search
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Fetch ALL clients (not filtered by SubServiceLineGroup)
  // Prefetch immediately for faster tab switching
  const shouldFetchClients = !isSharedService(serviceLine);
  const { 
    data: clientsData, 
    isLoading: isLoadingClients,
  } = useClients({
    search: debouncedSearch,
    page: currentPage,
    limit: itemsPerPage,
    // Note: NOT passing subServiceLineGroup - we want ALL clients
    enabled: shouldFetchClients, // Prefetch regardless of active tab
  });
  const clients = clientsData?.clients || [];
  const clientsPagination = clientsData?.pagination;

  // Fetch all tasks for the Tasks tab
  const { 
    data: tasksData,
    isLoading: isLoadingTasks,
    isFetching: isFetchingTasks
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
    enabled: !!serviceLine && !!subServiceLineGroup,
  });
  const tasks = tasksData?.tasks || [];
  const tasksPagination = tasksData?.pagination;

  // Fetch my tasks (team member only) for the My Tasks tab
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
    enabled: !!serviceLine && !!subServiceLineGroup,
  });
  const myTasks = myTasksData?.tasks || [];
  const myTasksPagination = myTasksData?.pagination;

  // Fetch sub-service line users for the Planner tab
  const { 
    data: plannerUsers = [],
    isLoading: isLoadingPlannerUsers,
    refetch: refetchPlannerUsers
  } = useSubServiceLineUsers({
    serviceLine,
    subServiceLineGroup,
    enabled: activeTab === 'planner' && !!subServiceLineGroup && !!serviceLine
  });
 
  // Fetch groups for the Groups tab
  const {
    data: groupsData,
    isLoading: isLoadingGroups,
    isFetching: isFetchingGroups
  } = useClientGroups({
    search: debouncedSearch,
    page: currentPage,
    limit: itemsPerPage,
    enabled: true, // Always fetch for faster tab switching
  });
  const groups = groupsData?.groups || [];
  const groupsPagination = groupsData?.pagination;
  
  const isLoading = activeTab === 'clients' ? isLoadingClients : activeTab === 'tasks' ? isLoadingTasks : activeTab === 'my-tasks' ? isLoadingMyTasks : activeTab === 'groups' ? isLoadingGroups : activeTab === 'planner' ? isLoadingPlannerUsers : false;
  const isFetching = activeTab === 'clients' ? false : activeTab === 'tasks' ? isFetchingTasks : activeTab === 'my-tasks' ? isFetchingMyTasks : activeTab === 'groups' ? isFetchingGroups : false;
  
  // Map ServiceLineRole to TaskRole for GanttTimeline display
  const mapServiceLineRoleToTaskRole = (serviceLineRole: string): TaskRole => {
    switch (serviceLineRole) {
      case 'ADMINISTRATOR':
        return TaskRole.ADMIN;
      case 'PARTNER':
        return TaskRole.REVIEWER;
      case 'MANAGER':
      case 'SUPERVISOR':
        return TaskRole.EDITOR;
      case 'USER':
      case 'VIEWER':
      default:
        return TaskRole.VIEWER;
    }
  };

  // Use the current user's role from state (default to VIEWER)
  const currentUserServiceLineRole = currentUserSubGroupRole;

  // Filter planner users based on search and filters
  const filteredPlannerUsers = useMemo(() => {
    let filtered = plannerUsers;

    // Search filter (name or email)
    if (plannerSearchTerm) {
      const searchLower = plannerSearchTerm.toLowerCase();
      filtered = filtered.filter(u => 
        u.user.name?.toLowerCase().includes(searchLower) ||
        u.user.email.toLowerCase().includes(searchLower)
      );
    }

    // Job Grading filter
    if (jobGradingFilter) {
      filtered = filtered.filter(u => u.user.jobTitle === jobGradingFilter);
    }

    // Office filter
    if (officeFilter) {
      filtered = filtered.filter(u => u.user.officeLocation?.trim() === officeFilter.trim());
    }

    return filtered;
  }, [plannerUsers, plannerSearchTerm, jobGradingFilter, officeFilter]);

  // Get unique job gradings for filter dropdown
  const uniqueJobGradings = useMemo(() => {
    const jobGradings = new Set(
      plannerUsers
        .map(u => u.user.jobTitle)
        .filter((jt): jt is string => !!jt)
    );
    return Array.from(jobGradings).sort();
  }, [plannerUsers]);

  // Get unique offices for filter dropdown
  const uniqueOffices = useMemo(() => {
    const offices = new Set(
      plannerUsers
        .map(u => u.user.officeLocation?.trim())
        .filter((office): office is string => !!office)
    );
    return Array.from(offices).sort();
  }, [plannerUsers]);

  // Transform users to match GanttTimeline's expected format
  const transformedPlannerUsers = useMemo(() => {
    const transformed = filteredPlannerUsers.map(user => ({
      userId: user.user.id, // Use user.user.id which is never null (fallback for employees without accounts)
      User: {
        ...user.user,
        jobGradeCode: user.user.jobGradeCode
      },
      role: mapServiceLineRoleToTaskRole(user.serviceLineRole),
      allocations: user.allocations.map(alloc => ({
        ...alloc,
        startDate: new Date(alloc.startDate),
        endDate: new Date(alloc.endDate)
      }))
    }));
    return transformed;
  }, [filteredPlannerUsers]);

  // Validate service line
  useEffect(() => {
    if (!isValidServiceLine(serviceLine)) {
      router.push('/dashboard');
    } else {
      setCurrentServiceLine(serviceLine as ServiceLine);
    }
  }, [serviceLine, router, setCurrentServiceLine]);

  // Check if user has access to this sub-service-line group and get current user info
  useEffect(() => {
    async function checkAccess() {
      if (!subServiceLineGroup) {
        setHasAccess(false);
        return;
      }

      try {
        const response = await fetch('/api/service-lines');
        if (!response.ok) {
          setHasAccess(false);
          return;
        }

        const result = await response.json();
        const serviceLines = result.data;

        // Check if user has access to this specific sub-service-line group
        // Roles are assigned at SERVICE LINE level, not sub-group level
        const hasSubGroupAccess = serviceLines.some((sl: any) => {
          const matchingSubGroup = sl.subGroups?.find((sg: any) => sg.code === subServiceLineGroup);
          if (matchingSubGroup) {
            // Use the service line's role (not subgroup role - subgroups don't have individual roles)
            setCurrentUserSubGroupRole(sl.role || 'VIEWER');
          }
          return !!matchingSubGroup;
        });

        setHasAccess(hasSubGroupAccess);

        if (!hasSubGroupAccess) {
          // Redirect to dashboard if no access
          setTimeout(() => router.push('/dashboard'), 2000);
        }
      } catch (error) {
        console.error('Error checking sub-service-line group access:', error);
        setHasAccess(false);
      }
    }

    checkAccess();
  }, [subServiceLineGroup, router]);

  // Fetch current user ID
  useEffect(() => {
    async function fetchCurrentUser() {
      try {
        const response = await fetch('/api/auth/session');
        if (response.ok) {
          const data = await response.json();
          if (data.user?.id) {
            setCurrentUserId(data.user.id);
          }
        }
      } catch (error) {
        console.error('Error fetching current user:', error);
      }
    }

    fetchCurrentUser();
  }, []);

  // Reset to first page when tab changes
  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab]);

  // Show loading while checking access
  if (hasAccess === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-forvis-gray-50">
        <div className="text-center">
          <LoadingSpinner size="lg" className="mx-auto mb-4" />
          <p className="text-sm text-forvis-gray-600">Verifying access...</p>
        </div>
      </div>
    );
  }

  // Show access denied message if user doesn't have access
  if (hasAccess === false) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-forvis-gray-50">
        <div className="text-center max-w-md px-4">
          <AlertTriangle className="mx-auto h-12 w-12 text-yellow-500 mb-4" />
          <h1 className="text-2xl font-bold text-forvis-gray-900 mb-2">Access Denied</h1>
          <p className="text-forvis-gray-600 mb-4">
            You don't have access to this sub-service-line group. Redirecting to dashboard...
          </p>
        </div>
      </div>
    );
  }

  if (!isValidServiceLine(serviceLine)) {
    return null;
  }

  // Show selector for shared services
  if (isSharedService(serviceLine)) {
    return <ServiceLineSelector />;
  }

  // Only show full page loader on initial load
  if (isLoading && !isFetching) {
    return (
      <div className="min-h-screen bg-forvis-gray-50 flex items-center justify-center">
        <div className="text-center">
          <LoadingSpinner size="lg" className="mx-auto" />
          <p className="mt-4 text-sm font-normal text-forvis-gray-600">Loading workspace...</p>
        </div>
      </div>
    );
  }

  const currentData = activeTab === 'groups' ? groups : activeTab === 'clients' ? clients : activeTab === 'tasks' ? tasks : activeTab === 'my-tasks' ? myTasks : [];
  const pagination = activeTab === 'groups' ? groupsPagination : activeTab === 'clients' ? clientsPagination : activeTab === 'tasks' ? tasksPagination : activeTab === 'my-tasks' ? myTasksPagination : undefined;
  const totalCount = isFetching && !pagination ? '...' : (pagination?.total ?? 0);

  return (
    <div className="min-h-screen bg-forvis-gray-50 relative">
      {/* Loading overlay for tab switches */}
      {isFetching && !isLoading && (
        <div className="fixed inset-0 bg-white bg-opacity-90 z-50 flex items-center justify-center">
          <div className="bg-white rounded-lg p-6 shadow-corporate-lg">
            <LoadingSpinner size="lg" className="mx-auto" />
            <p className="mt-4 text-sm text-forvis-gray-700 font-medium">Loading...</p>
          </div>
        </div>
      )}
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumb */}
        <nav className="flex items-center space-x-2 text-sm text-forvis-gray-600 mb-6">
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
          <span className="text-forvis-gray-900 font-medium">
            {subServiceLineGroupDescription}
          </span>
        </nav>

        {/* Main Container with Header and Content */}
        <div className="bg-white rounded-lg shadow-corporate p-6">
          {/* Header */}
          <div className="mb-4">
            <h2 className="text-2xl font-semibold text-forvis-gray-900 mb-1">
              {subServiceLineGroupDescription}
            </h2>
            <p className="text-sm font-normal text-forvis-gray-600 mb-3">
              {activeTab === 'groups'
                ? 'Client groups across the organization'
                : activeTab === 'clients' 
                ? 'All clients across the organization'
                : activeTab === 'tasks'
                ? `Tasks in ${subServiceLineGroupDescription}`
                : activeTab === 'planner'
                ? 'Team resource planning and allocation'
                : activeTab === 'my-tasks'
                ? `Your tasks in ${subServiceLineGroupDescription}`
                : 'Your personal planning and schedule'}
            </p>
            <div className="flex gap-6">
              <div>
                <div className="text-2xl font-bold text-forvis-gray-900">{totalCount}</div>
                <div className="text-sm font-normal text-forvis-gray-600">
                  Total {activeTab === 'groups' ? 'Groups' : activeTab === 'clients' ? 'Clients' : activeTab === 'tasks' ? 'Tasks' : activeTab === 'my-tasks' ? 'My Tasks' : '-'}
                </div>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="mb-4 border-b border-forvis-gray-300">
            <nav className="flex -mb-px space-x-8">
              <button
                onClick={() => setActiveTab('groups')}
                className={`pb-4 px-1 border-b-2 font-medium text-sm transition-all duration-200 ease-in-out focus:outline-none ${
                  activeTab === 'groups'
                    ? 'border-forvis-blue-600 text-forvis-blue-600'
                    : 'border-transparent text-forvis-gray-600 hover:text-forvis-gray-900 hover:border-forvis-gray-300'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <Users className="h-5 w-5" />
                  <span>Groups</span>
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium transition-all duration-200 ease-in-out ${
                      activeTab === 'groups'
                        ? 'bg-forvis-blue-100 text-forvis-blue-700'
                        : 'bg-forvis-gray-100 text-forvis-gray-600'
                    }`}
                  >
                    {isLoadingGroups && !groupsPagination ? '...' : (groupsPagination?.total ?? 0)}
                  </span>
                </div>
              </button>
              <button
                onClick={() => setActiveTab('clients')}
                className={`pb-4 px-1 border-b-2 font-medium text-sm transition-all duration-200 ease-in-out focus:outline-none ${
                  activeTab === 'clients'
                    ? 'border-forvis-blue-600 text-forvis-blue-600'
                    : 'border-transparent text-forvis-gray-600 hover:text-forvis-gray-900 hover:border-forvis-gray-300'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <Building2 className="h-5 w-5" />
                  <span>Clients</span>
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium transition-all duration-200 ease-in-out ${
                      activeTab === 'clients'
                        ? 'bg-forvis-blue-100 text-forvis-blue-700'
                        : 'bg-forvis-gray-100 text-forvis-gray-600'
                    }`}
                  >
                    {isLoadingClients && !clientsPagination ? '...' : (clientsPagination?.total ?? 0)}
                  </span>
                </div>
              </button>
              <button
                onClick={() => setActiveTab('tasks')}
                className={`pb-4 px-1 border-b-2 font-medium text-sm transition-all duration-200 ease-in-out focus:outline-none ${
                  activeTab === 'tasks'
                    ? 'border-forvis-blue-600 text-forvis-blue-600'
                    : 'border-transparent text-forvis-gray-600 hover:text-forvis-gray-900 hover:border-forvis-gray-300'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <Folder className="h-5 w-5" />
                  <span>Tasks</span>
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium transition-all duration-200 ease-in-out ${
                      activeTab === 'tasks'
                        ? 'bg-forvis-blue-100 text-forvis-blue-700'
                        : 'bg-forvis-gray-100 text-forvis-gray-600'
                    }`}
                  >
                    {isLoadingTasks && !tasksPagination ? '...' : (tasksPagination?.total ?? 0)}
                  </span>
                </div>
              </button>
              <button
                onClick={() => setActiveTab('planner')}
                className={`pb-4 px-1 border-b-2 font-medium text-sm transition-all duration-200 ease-in-out focus:outline-none ${
                  activeTab === 'planner'
                    ? 'border-forvis-blue-600 text-forvis-blue-600'
                    : 'border-transparent text-forvis-gray-600 hover:text-forvis-gray-900 hover:border-forvis-gray-300'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <LayoutGrid className="h-5 w-5" />
                  <span>Planner</span>
                </div>
              </button>
              <button
                onClick={() => setActiveTab('my-tasks')}
                className={`pb-4 px-1 border-b-2 font-medium text-sm transition-all duration-200 ease-in-out focus:outline-none ${
                  activeTab === 'my-tasks'
                    ? 'border-forvis-blue-600 text-forvis-blue-600'
                    : 'border-transparent text-forvis-gray-600 hover:text-forvis-gray-900 hover:border-forvis-gray-300'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <Users className="h-5 w-5" />
                  <span>My Tasks</span>
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium transition-all duration-200 ease-in-out ${
                      activeTab === 'my-tasks'
                        ? 'bg-forvis-blue-100 text-forvis-blue-700'
                        : 'bg-forvis-gray-100 text-forvis-gray-600'
                    }`}
                  >
                    {isLoadingMyTasks && !myTasksPagination ? '...' : (myTasksPagination?.total ?? 0)}
                  </span>
                </div>
              </button>
              <button
                onClick={() => setActiveTab('my-planning')}
                className={`pb-4 px-1 border-b-2 font-medium text-sm transition-all duration-200 ease-in-out focus:outline-none ${
                  activeTab === 'my-planning'
                    ? 'border-forvis-blue-600 text-forvis-blue-600'
                    : 'border-transparent text-forvis-gray-600 hover:text-forvis-gray-900 hover:border-forvis-gray-300'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <Calendar className="h-5 w-5" />
                  <span>My Planning</span>
                </div>
              </button>
            </nav>
          </div>

          {/* Search and Filter Bar - Only show for searchable tabs */}
          {activeTab !== 'planner' && activeTab !== 'my-planning' && (
            <div className="mb-4 flex gap-4 items-center">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-forvis-gray-400" />
                <input
                  type="text"
                  placeholder={
                    activeTab === 'groups'
                      ? 'Search by group name or code...'
                      : activeTab === 'clients'
                      ? 'Search by name, code, group, or industry...'
                      : (activeTab === 'tasks' || activeTab === 'my-tasks')
                      ? 'Search by task name, client, or service line...'
                      : 'Search...'
                  }
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 w-full border border-forvis-gray-300 rounded-lg bg-white transition-all duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-forvis-blue-500 focus:ring-offset-2 focus:border-transparent"
                />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-forvis-gray-700">Show:</label>
                <select
                  value={itemsPerPage}
                  onChange={(e) => {
                    setItemsPerPage(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="border border-forvis-gray-300 rounded-md px-3 py-2 text-sm bg-white transition-all duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-forvis-blue-500 focus:ring-offset-2 focus:border-transparent"
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>
            </div>
          )}

          {/* Results count */}
          {debouncedSearch && pagination && (activeTab === 'groups' || activeTab === 'clients' || activeTab === 'tasks' || activeTab === 'my-tasks') && (
            <div className="mb-4 text-sm font-normal text-forvis-gray-800">
              Found <span className="font-medium">{pagination.total}</span>{' '}
              {activeTab === 'groups' ? 'group' : activeTab === 'clients' ? 'client' : 'task'}{pagination.total !== 1 ? 's' : ''} matching "{debouncedSearch}"
            </div>
          )}

          {/* Content - Groups, Clients, Tasks, Planner, My Tasks, or My Planning */}
          {activeTab === 'planner' ? (
            /* Team Planner */
            <div className="p-6 bg-forvis-gray-50">
              <div className="max-w-full mx-auto">
                {/* Header Card */}
                <Card variant="standard" className="p-6 mb-6">
                  <div className="flex justify-between items-center mb-4">
                    <div>
                      <h2 className="text-2xl font-semibold text-forvis-gray-900">Team Planner</h2>
                      <p className="text-sm font-normal text-forvis-gray-600 mt-1">
                        View all team members and their task allocations in {subServiceLineGroupDescription}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-forvis-blue-600">
                        {filteredPlannerUsers.length}
                      </div>
                      <div className="text-sm text-forvis-gray-600">
                        Team {filteredPlannerUsers.length === 1 ? 'Member' : 'Members'}
                      </div>
                    </div>
                  </div>
                  
                  {/* Search and Filters */}
                  <div className="flex gap-4 items-center">
                    <div className="relative flex-1 max-w-md">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-forvis-gray-400" />
                      <input
                        type="text"
                        placeholder="Search by name or email..."
                        value={plannerSearchTerm}
                        onChange={(e) => setPlannerSearchTerm(e.target.value)}
                        className="pl-10 pr-4 py-2 w-full border border-forvis-gray-300 rounded-lg bg-white transition-all duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-forvis-blue-500 focus:ring-offset-2 focus:border-transparent"
                      />
                    </div>
                    
                    <select
                      value={jobGradingFilter}
                      onChange={(e) => setJobGradingFilter(e.target.value)}
                      className="border border-forvis-gray-300 rounded-md px-3 py-2 text-sm bg-white transition-all duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-forvis-blue-500 focus:ring-offset-2 focus:border-transparent"
                    >
                      <option value="">All Job Grades</option>
                      {uniqueJobGradings.map(jg => (
                        <option key={jg} value={jg}>{jg}</option>
                      ))}
                    </select>
                    
                    {uniqueOffices.length > 0 && (
                      <select
                        value={officeFilter}
                        onChange={(e) => setOfficeFilter(e.target.value)}
                        className="border border-forvis-gray-300 rounded-md px-3 py-2 text-sm bg-white transition-all duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-forvis-blue-500 focus:ring-offset-2 focus:border-transparent"
                      >
                        <option value="">All Offices</option>
                        {uniqueOffices.map(office => (
                          <option key={office} value={office}>{office}</option>
                        ))}
                      </select>
                    )}
                    
                    {(plannerSearchTerm || jobGradingFilter || officeFilter) && (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => {
                          setPlannerSearchTerm('');
                          setJobGradingFilter('');
                          setOfficeFilter('');
                        }}
                      >
                        Clear Filters
                      </Button>
                    )}
                  </div>
                </Card>

                {/* GanttTimeline */}
                {isLoadingPlannerUsers ? (
                  <div className="animate-pulse space-y-4">
                    <div className="h-20 bg-forvis-gray-200 rounded-lg"></div>
                    <div className="h-20 bg-forvis-gray-200 rounded-lg"></div>
                    <div className="h-20 bg-forvis-gray-200 rounded-lg"></div>
                  </div>
                ) : filteredPlannerUsers.length === 0 ? (
                  <Card variant="standard" className="text-center py-12">
                    <Users className="mx-auto h-12 w-12 text-forvis-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-forvis-gray-900">
                      {plannerSearchTerm || jobGradingFilter || officeFilter ? 'No matching team members' : 'No team members'}
                    </h3>
                    <p className="mt-1 text-sm text-forvis-gray-600">
                      {plannerSearchTerm || jobGradingFilter || officeFilter
                        ? 'Try adjusting your search or filters.'
                        : 'No users are currently assigned to this sub-service line group.'}
                    </p>
                  </Card>
                ) : (
                  <GanttTimeline
                    taskId={0}
                    teamMembers={transformedPlannerUsers}
                    currentUserRole={mapServiceLineRoleToTaskRole(currentUserServiceLineRole)}
                    onAllocationUpdate={refetchPlannerUsers}
                    serviceLine={serviceLine}
                    subServiceLineGroup={subServiceLineGroup}
                  />
                )}
              </div>
            </div>
          ) : activeTab === 'my-planning' ? (
            /* My Planning View */
            <MyPlanningView />
          ) : activeTab === 'groups' ? (
            /* Groups List */
            <div className="bg-forvis-gray-50 rounded-lg border border-forvis-gray-200 shadow-sm p-4">
              {groups.length === 0 ? (
                <div className="bg-white rounded-lg border border-forvis-gray-200 shadow-corporate text-center py-12">
                  <Users className="mx-auto h-12 w-12 text-forvis-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-forvis-gray-900">No groups</h3>
                  <p className="mt-1 text-sm text-forvis-gray-600">
                    {searchTerm ? 'No groups match your search.' : 'No client groups available in the system.'}
                  </p>
                </div>
              ) : (
                <>
                  <div className="bg-white rounded-lg border border-forvis-gray-200 shadow-corporate overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full" style={{ tableLayout: 'fixed' }}>
                    <colgroup>
                      <col style={{ width: '45%' }} />
                      <col style={{ width: '25%' }} />
                      <col style={{ width: '20%' }} />
                      <col style={{ width: '10%' }} />
                    </colgroup>
                    <thead>
                      <tr style={{ background: 'linear-gradient(to right, #2E5AAC, #25488A)' }}>
                        <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                          Group Name
                        </th>
                        <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                          Group Code
                        </th>
                        <th scope="col" className="px-3 py-3 text-center text-xs font-medium text-white uppercase tracking-wider">
                          Clients
                        </th>
                        <th scope="col" className="px-3 py-3 text-center text-xs font-medium text-white uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-forvis-gray-200">
                      {groups.map((group, index) => (
                        <tr key={group.groupCode} className={`hover:bg-forvis-blue-50 transition-all duration-200 ease-in-out ${index % 2 === 0 ? 'bg-white' : 'bg-forvis-gray-50'}`}>
                          <td className="px-3 py-3 truncate">
                            <div className="flex items-center space-x-2 min-w-0">
                              <div className="w-8 h-8 rounded-lg bg-forvis-blue-100 flex items-center justify-center flex-shrink-0">
                                <Users className="h-4 w-4 text-forvis-blue-600" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="text-sm font-medium text-forvis-gray-900 truncate" title={group.groupDesc}>
                                  {group.groupDesc}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-3 py-3">
                            <div className="text-sm font-normal text-forvis-gray-800 truncate" title={group.groupCode}>
                              {group.groupCode}
                            </div>
                          </td>
                          <td className="px-3 py-3 text-center">
                            <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-full text-xs font-medium bg-forvis-blue-100 text-forvis-blue-800">
                              {group.clientCount}
                            </span>
                          </td>
                          <td className="px-3 py-3 text-center">
                            <Link
                              href={`/dashboard/${serviceLine.toLowerCase()}/${subServiceLineGroup}/groups/${encodeURIComponent(group.groupCode)}`}
                              className="text-forvis-blue-600 hover:text-forvis-blue-900 text-sm font-medium transition-all duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-forvis-blue-500 focus:ring-offset-2 rounded px-2 py-1"
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
              {pagination && (
                <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="text-sm font-normal text-forvis-gray-800">
                    Showing <span className="font-medium">{pagination.total === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1}</span> to{' '}
                    <span className="font-medium">
                      {Math.min(currentPage * itemsPerPage, pagination.total)}
                    </span>{' '}
                    of <span className="font-medium">{pagination.total}</span> {debouncedSearch ? 'filtered ' : ''}group{pagination.total !== 1 ? 's' : ''}
                  </div>
                  
                  {pagination.totalPages > 1 && (
                    <div className="flex gap-2">
                      <Button
                        variant="secondary"
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        className="px-3 py-1.5 text-sm"
                      >
                        Previous
                      </Button>
                      <div className="flex items-center gap-1">
                        {Array.from({ length: pagination.totalPages }, (_, i) => i + 1)
                          .filter(page => {
                            return (
                              page === 1 ||
                              page === pagination.totalPages ||
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
                                  className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-forvis-blue-500 focus:ring-offset-2 ${
                                    currentPage === page
                                      ? 'bg-forvis-blue-600 text-white shadow-sm'
                                      : 'text-forvis-gray-700 bg-white border border-forvis-gray-300 hover:bg-forvis-gray-50'
                                  }`}
                                >
                                  {page}
                                </button>
                              </div>
                            );
                          })}
                      </div>
                      <Button
                        variant="secondary"
                        onClick={() => setCurrentPage(p => Math.min(pagination.totalPages, p + 1))}
                        disabled={currentPage >= pagination.totalPages}
                        className="px-3 py-1.5 text-sm"
                      >
                        Next
                      </Button>
                    </div>
                  )}
                </div>
              )}
                </>
              )}
            </div>
          ) : activeTab === 'clients' ? (
            /* Clients List */
            <div className="bg-forvis-gray-50 rounded-lg border border-forvis-gray-200 shadow-sm p-4">
              {clients.length === 0 ? (
                <div className="bg-white rounded-lg border border-forvis-gray-200 shadow-corporate text-center py-12">
                  <Building2 className="mx-auto h-12 w-12 text-forvis-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-forvis-gray-900">No clients</h3>
                  <p className="mt-1 text-sm text-forvis-gray-600">
                    {searchTerm ? 'No clients match your search.' : 'No clients available in the system.'}
                  </p>
                </div>
              ) : (
                <>
                  <div className="bg-white rounded-lg border border-forvis-gray-200 shadow-corporate overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full" style={{ tableLayout: 'fixed' }}>
                  <colgroup>
                    <col style={{ width: '30%' }} />
                    <col style={{ width: '20%' }} />
                    <col style={{ width: '18%' }} />
                    <col style={{ width: '14%' }} />
                    <col style={{ width: '8%' }} />
                    <col style={{ width: '10%' }} />
                  </colgroup>
                  <thead>
                    <tr style={{ background: 'linear-gradient(to right, #2E5AAC, #25488A)' }}>
                      <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                        Client
                      </th>
                      <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                        Group
                      </th>
                      <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                        Industry
                      </th>
                      <th scope="col" className="px-3 py-3 text-center text-xs font-medium text-white uppercase tracking-wider">
                        Partner
                      </th>
                      <th scope="col" className="px-3 py-3 text-center text-xs font-medium text-white uppercase tracking-wider">
                        Tasks
                      </th>
                      <th scope="col" className="px-3 py-3 text-center text-xs font-medium text-white uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-forvis-gray-200">
                    {clients.map((client, index) => (
                        <tr key={client.id} className={`hover:bg-forvis-blue-50 transition-all duration-200 ease-in-out ${index % 2 === 0 ? 'bg-white' : 'bg-forvis-gray-50'}`}>
                          <td className="px-3 py-3 truncate">
                            <div className="flex items-center space-x-2 min-w-0">
                              <div className="w-8 h-8 rounded-lg bg-forvis-blue-100 flex items-center justify-center flex-shrink-0">
                                <Building2 className="h-4 w-4 text-forvis-blue-600" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="text-sm font-medium text-forvis-gray-900 truncate">
                                  {client.clientNameFull || client.clientCode}
                                </div>
                                <div className="text-xs text-forvis-gray-500 truncate">{client.clientCode}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-3 py-3">
                            <div className="text-sm font-normal text-forvis-gray-800 truncate" title={client.groupDesc}>
                              {client.groupDesc}
                            </div>
                          </td>
                          <td className="px-3 py-3">
                            <div className="text-sm font-normal text-forvis-gray-800 truncate" title={client.industry || client.sector || '-'}>
                              {client.industry || client.sector || '-'}
                            </div>
                          </td>
                          <td className="px-3 py-3">
                            <div className="text-sm font-normal text-forvis-gray-800 text-center truncate" title={client.clientPartner}>
                              {client.clientPartner}
                            </div>
                          </td>
                          <td className="px-3 py-3 text-center">
                            <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-full text-xs font-medium bg-forvis-blue-100 text-forvis-blue-800">
                              {client._count.Task || 0}
                            </span>
                          </td>
                          <td className="px-3 py-3 text-center">
                            <Link
                              href={`/dashboard/${serviceLine.toLowerCase()}/${subServiceLineGroup}/clients/${client.GSClientID}`}
                              className="text-forvis-blue-600 hover:text-forvis-blue-900 text-sm font-medium transition-all duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-forvis-blue-500 focus:ring-offset-2 rounded px-2 py-1"
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
            {pagination && (
              <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="text-sm font-normal text-forvis-gray-800">
                  Showing <span className="font-medium">{pagination.total === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1}</span> to{' '}
                  <span className="font-medium">
                    {Math.min(currentPage * itemsPerPage, pagination.total)}
                  </span>{' '}
                  of <span className="font-medium">{pagination.total}</span> {debouncedSearch ? 'filtered ' : ''}
                  client{pagination.total !== 1 ? 's' : ''}
                </div>
              
              {pagination.totalPages > 1 && (
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-1.5 text-sm"
                  >
                    Previous
                  </Button>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: pagination.totalPages }, (_, i) => i + 1)
                      .filter(page => {
                        // Show first page, last page, current page, and 1 page on each side
                        return (
                          page === 1 ||
                          page === pagination.totalPages ||
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
                              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-forvis-blue-500 focus:ring-offset-2 ${
                                currentPage === page
                                  ? 'bg-forvis-blue-600 text-white shadow-sm'
                                  : 'text-forvis-gray-700 bg-white border border-forvis-gray-300 hover:bg-forvis-gray-50'
                              }`}
                            >
                              {page}
                            </button>
                          </div>
                        );
                      })}
                  </div>
                  <Button
                    variant="secondary"
                    onClick={() => setCurrentPage(p => Math.min(pagination.totalPages, p + 1))}
                    disabled={currentPage >= pagination.totalPages}
                    className="px-3 py-1.5 text-sm"
                  >
                    Next
                  </Button>
                </div>
              )}
            </div>
              )}
                </>
              )}
            </div>
          ) : (
            /* Tasks List */
            <div className="bg-forvis-gray-50 rounded-lg border border-forvis-gray-200 shadow-sm p-4">
              {(activeTab === 'tasks' ? tasks : myTasks).length === 0 ? (
                <div className="bg-white rounded-lg border border-forvis-gray-200 shadow-corporate text-center py-12">
                  <Folder className="mx-auto h-12 w-12 text-forvis-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-forvis-gray-900">No tasks</h3>
                  <p className="mt-1 text-sm text-forvis-gray-600">
                    {searchTerm 
                      ? 'No tasks match your search.' 
                      : activeTab === 'my-tasks'
                      ? `You are not a team member on any tasks in ${subServiceLineGroupDescription}.`
                      : `No tasks available in ${subServiceLineGroupDescription}.`}
                  </p>
                </div>
              ) : (
                <>
                  <div className="bg-white rounded-lg border border-forvis-gray-200 shadow-corporate overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full" style={{ tableLayout: 'fixed' }}>
                    <colgroup>
                      <col style={{ width: '30%' }} />
                      <col style={{ width: '20%' }} />
                      <col style={{ width: '15%' }} />
                      <col style={{ width: '13%' }} />
                      <col style={{ width: '12%' }} />
                      <col style={{ width: '10%' }} />
                    </colgroup>
                    <thead>
                      <tr style={{ background: 'linear-gradient(to right, #2E5AAC, #25488A)' }}>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                          Task Name
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                          Client
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                          Type
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                          Status
                        </th>
                        <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-white uppercase tracking-wider">
                          Updated
                        </th>
                        <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-white uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-forvis-gray-200">
                      {(activeTab === 'tasks' ? tasks : myTasks).map((task, index) => {
                        return (
                          <tr key={task.id} className={`hover:bg-forvis-blue-50 transition-all duration-200 ease-in-out ${index % 2 === 0 ? 'bg-white' : 'bg-forvis-gray-50'}`}>
                            <td className="px-6 py-4">
                              <div className="flex items-center space-x-3">
                                <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 bg-forvis-blue-100">
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
                              {task.client && (
                                <Link
                                  href={`/dashboard/${serviceLine.toLowerCase()}/${subServiceLineGroup}/clients/${task.client.GSClientID}`}
                                  className="block group focus:outline-none focus:ring-2 focus:ring-forvis-blue-500 focus:ring-offset-2 rounded px-2 py-1 -mx-2 -my-1"
                                >
                                  <div className="text-sm font-medium text-forvis-blue-600 group-hover:text-forvis-blue-900 transition-all duration-200 ease-in-out">
                                    {task.client.clientNameFull || task.client.clientCode}
                                  </div>
                                  <div className="text-xs text-forvis-gray-500">{task.client.clientCode}</div>
                                </Link>
                              )}
                            </td>
                            <td className="px-6 py-4">
                              <span className="text-sm font-normal text-forvis-gray-800">
                                {task.projectType || task.serviceLine}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <StatusBadge status={task.status} />
                            </td>
                            <td className="px-6 py-4 text-center">
                              <div className="flex items-center justify-center text-sm font-normal text-forvis-gray-800">
                                <Clock className="h-4 w-4 mr-1 text-forvis-gray-500" />
                                {formatDate(task.updatedAt)}
                              </div>
                            </td>
                            <td className="px-6 py-4 text-center">
                              <Link
                                href={task.client?.GSClientID 
                                  ? `/dashboard/${serviceLine.toLowerCase()}/${subServiceLineGroup}/clients/${task.client.GSClientID}/tasks/${task.id}`
                                  : `/dashboard/tasks/${task.id}`}
                                className="text-forvis-blue-600 hover:text-forvis-blue-900 text-sm font-medium transition-all duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-forvis-blue-500 focus:ring-offset-2 rounded px-2 py-1"
                              >
                                View
                              </Link>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Pagination */}
              {pagination && (
              <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="text-sm font-normal text-forvis-gray-800">
                  Showing <span className="font-medium">{pagination.total === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1}</span> to{' '}
                  <span className="font-medium">
                    {Math.min(currentPage * itemsPerPage, pagination.total)}
                  </span>{' '}
                  of <span className="font-medium">{pagination.total}</span> {debouncedSearch ? 'filtered ' : ''}task{pagination.total !== 1 ? 's' : ''}
                </div>
                
                {pagination.totalPages > 1 && (
                  <div className="flex gap-2">
                    <Button
                      variant="secondary"
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="px-3 py-1.5 text-sm"
                    >
                      Previous
                    </Button>
                    <div className="flex items-center gap-1">
                      {Array.from({ length: pagination.totalPages }, (_, i) => i + 1)
                        .filter(page => {
                          return (
                            page === 1 ||
                            page === pagination.totalPages ||
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
                                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-forvis-blue-500 focus:ring-offset-2 ${
                                  currentPage === page
                                    ? 'bg-forvis-blue-600 text-white shadow-sm'
                                    : 'text-forvis-gray-700 bg-white border border-forvis-gray-300 hover:bg-forvis-gray-50'
                                }`}
                              >
                                {page}
                              </button>
                            </div>
                          );
                        })}
                    </div>
                    <Button
                      variant="secondary"
                      onClick={() => setCurrentPage(p => Math.min(pagination.totalPages, p + 1))}
                      disabled={currentPage >= pagination.totalPages}
                      className="px-3 py-1.5 text-sm"
                    >
                      Next
                    </Button>
                  </div>
                )}
              </div>
                )}
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
