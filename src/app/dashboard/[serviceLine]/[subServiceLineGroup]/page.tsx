'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { 
  Search,
  Building2,
  ChevronRight,
  Folder,
  Users,
  AlertTriangle,
  Calendar,
  LayoutGrid,
  List,
  Kanban,
  Minimize2,
  Maximize2,
  Filter,
} from 'lucide-react';
import { isValidServiceLine, formatServiceLineName, isSharedService, formatTaskType, getTaskTypeColor } from '@/lib/utils/serviceLineUtils';
import { useServiceLine } from '@/components/providers/ServiceLineProvider';
import { ServiceLine } from '@/types';
import { useClients, type Client } from '@/hooks/clients/useClients';
import { useTasks, type TaskListItem } from '@/hooks/tasks/useTasks'; // Updated with GSClientID
import { useSubServiceLineGroups } from '@/hooks/service-lines/useSubServiceLineGroups';
import { useClientGroups } from '@/hooks/clients/useClientGroups';
import { useWorkspaceCounts } from '@/hooks/workspace/useWorkspaceCounts';
import { ServiceLineSelector } from '@/components/features/service-lines/ServiceLineSelector';
import { Button, LoadingSpinner, Card, MultiSelect } from '@/components/ui';
import { MyPlanningView, PlannerFilters } from '@/components/features/planning';
import { EmployeePlannerList } from '@/components/features/planning/EmployeePlannerList';
import { ClientPlannerList } from '@/components/features/planning/ClientPlannerList';
import type { EmployeePlannerFilters as EmployeePlannerFiltersType, ClientPlannerFilters as ClientPlannerFiltersType } from '@/components/features/planning';
import { useSubServiceLineUsers } from '@/hooks/service-lines/useSubServiceLineUsers';
import { GanttTimeline } from '@/components/features/tasks/TeamPlanner';
import { ClientPlannerTimeline } from '@/components/features/tasks/ClientPlanner';
import { TaskRole, ServiceLineRole, NonClientEventType, NON_CLIENT_EVENT_CONFIG } from '@/types';
import { KanbanBoard } from '@/components/features/tasks/Kanban';
import { useClientPlannerFilters } from '@/hooks/planning/useClientPlannerFilters';
import { GroupsFilters, GroupsFiltersType } from '@/components/features/groups/GroupsFilters';
import { ClientsFilters, ClientsFiltersType } from '@/components/features/clients/ClientsFilters';
import { TasksFilters, TasksFiltersType } from '@/components/features/tasks/TasksFilters';

export default function SubServiceLineWorkspacePage() {
  const router = useRouter();
  const params = useParams();
  const queryClient = useQueryClient();
  const serviceLine = (params.serviceLine as string)?.toUpperCase();
  const subServiceLineGroup = params.subServiceLineGroup as string;
  const { setCurrentServiceLine } = useServiceLine();
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [currentUserSubGroupRole, setCurrentUserSubGroupRole] = useState<string>('VIEWER');
  
  const [activeTab, setActiveTab] = useState<'groups' | 'clients' | 'tasks' | 'planner' | 'my-tasks' | 'my-planning'>('groups');
  const [searchTerm, setSearchTerm] = useState(''); // Only used for tasks tab
  const [debouncedSearch, setDebouncedSearch] = useState(''); // Only used for tasks tab
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(50);
  
  // Task view mode state (list vs kanban)
  const [taskViewMode, setTaskViewMode] = useState<'list' | 'kanban'>('list');
  
  // Kanban display mode state (compact vs detailed)
  const [displayMode, setDisplayMode] = useState<'compact' | 'detailed'>('detailed');

  // Groups filters
  const [groupsFilters, setGroupsFilters] = useState<GroupsFiltersType>({
    groups: [],
  });

  // Clients filters
  const [clientsFilters, setClientsFilters] = useState<ClientsFiltersType>({
    clients: [],
    industries: [],
    groups: [],
  });

  // Task filters (server-side filtering)
  const [taskFilters, setTaskFilters] = useState<TasksFiltersType>({
    clients: [],
    taskNames: [],
    partners: [],
    managers: [],
    serviceLines: [],
    includeArchived: false,
  });
  
  // Planner view mode (employees vs clients)
  const [plannerView, setPlannerView] = useState<'employees' | 'clients'>('employees');
  
  // Planner view type (timeline vs list)
  const [employeePlannerViewMode, setEmployeePlannerViewMode] = useState<'timeline' | 'list'>('timeline');
  const [clientPlannerViewMode, setClientPlannerViewMode] = useState<'timeline' | 'list'>('timeline');
  
  // Employee planner filters (array-based for multiselect)
  const [employeePlannerFilters, setEmployeePlannerFilters] = useState<EmployeePlannerFiltersType>({
    employees: [],
    jobGrades: [],
    offices: [],
    clients: [],
    taskCategories: []
  });
  
  // Client planner filters (array-based for multiselect)
  const [clientPlannerFilters, setClientPlannerFilters] = useState<ClientPlannerFiltersType>({
    clients: [],
    groups: [],
    partners: [],
    tasks: [],
    managers: []
  });

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
  
  // Reset to page 1 when client filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [clientsFilters]);

  // Reset to page 1 when group filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [groupsFilters]);

  // Reset to page 1 when task filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [taskFilters]);

  // Load view mode preference from localStorage
  useEffect(() => {
    if (serviceLine && subServiceLineGroup) {
      const storageKey = `kanban-view-mode-${serviceLine}-${subServiceLineGroup}`;
      const savedMode = localStorage.getItem(storageKey);
      if (savedMode === 'kanban' || savedMode === 'list') {
        setTaskViewMode(savedMode);
      }
    }
  }, [serviceLine, subServiceLineGroup]);

  // Save view mode preference to localStorage
  const handleViewModeChange = (mode: 'list' | 'kanban') => {
    setTaskViewMode(mode);
    if (serviceLine && subServiceLineGroup) {
      const storageKey = `kanban-view-mode-${serviceLine}-${subServiceLineGroup}`;
      localStorage.setItem(storageKey, mode);
    }
  };

  // Invalidate kanban queries when switching between tasks and my-tasks tabs in kanban mode
  useEffect(() => {
    if (taskViewMode === 'kanban' && (activeTab === 'tasks' || activeTab === 'my-tasks')) {
      queryClient.invalidateQueries({ queryKey: ['kanban'] });
    }
  }, [activeTab, taskViewMode, queryClient]);

  // Fetch ALL clients (not filtered by SubServiceLineGroup)
  // Backend now handles filtering by clientCodes, industries, and groups
  const shouldFetchClients = !isSharedService(serviceLine);
  const { 
    data: clientsData, 
    isLoading: isLoadingClients,
  } = useClients({
    search: '', // No text search - use array filters
    page: currentPage,
    limit: itemsPerPage,
    clientCodes: clientsFilters.clients, // Backend filtering by client codes
    industries: clientsFilters.industries, // Backend filtering by industries
    groups: clientsFilters.groups, // Backend filtering by groups
    // Note: NOT passing subServiceLineGroup - we want ALL clients
    enabled: shouldFetchClients && activeTab === 'clients', // Only fetch when on clients tab
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
    includeArchived: taskFilters.includeArchived,
    internalOnly: false,
    clientTasksOnly: false,
    myTasksOnly: false,
    // Array filters
    clientIds: taskFilters.clients,
    taskNames: taskFilters.taskNames,
    partnerCodes: taskFilters.partners,
    managerCodes: taskFilters.managers,
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
    includeArchived: taskFilters.includeArchived,
    internalOnly: false,
    clientTasksOnly: false,
    myTasksOnly: true,
    // Array filters
    clientIds: taskFilters.clients,
    taskNames: taskFilters.taskNames,
    partnerCodes: taskFilters.partners,
    managerCodes: taskFilters.managers,
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

  // Fetch client planner filter options
  const { 
    data: clientPlannerFilterOptions,
    isLoading: isLoadingFilterOptions
  } = useClientPlannerFilters({
    serviceLine,
    subServiceLineGroup,
    enabled: activeTab === 'planner' && plannerView === 'clients' && !!subServiceLineGroup && !!serviceLine
  });

 
  // Fetch groups for the Groups tab with server-side filtering
  const {
    data: groupsData,
    isLoading: isLoadingGroups,
    isFetching: isFetchingGroups
  } = useClientGroups({
    search: '', // No search for groups tab - use filters only
    page: currentPage,
    limit: itemsPerPage,
    groupCodes: groupsFilters.groups, // Server-side filtering
    enabled: activeTab === 'groups', // Only fetch when on groups tab
  });
  const groups: Array<{ groupCode: string; groupDesc: string; clientCount: number }> = groupsData?.groups || [];
  const groupsPagination = groupsData?.pagination;

  // Fetch workspace counts for tab badges (lightweight count-only queries)
  const { 
    data: counts, 
    isLoading: isLoadingCounts 
  } = useWorkspaceCounts({
    serviceLine: serviceLine || '',
    subServiceLineGroup: subServiceLineGroup || '',
    enabled: !!serviceLine && !!subServiceLineGroup,
  });
  
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

  // Filter planner users based on array-based filters with OR logic
  // Optimized with Sets for O(1) lookup and early returns
  const filteredPlannerUsers = useMemo(() => {
    // Early return if no users
    if (!plannerUsers || plannerUsers.length === 0) return [];
    
    // Convert filter arrays to Sets for O(1) lookup performance
    const employeeSet = new Set(employeePlannerFilters.employees);
    const jobGradeSet = new Set(employeePlannerFilters.jobGrades);
    const officeSet = new Set(employeePlannerFilters.offices);
    const clientSet = new Set(employeePlannerFilters.clients);
    const taskCategorySet = new Set(employeePlannerFilters.taskCategories);
    
    let filtered = plannerUsers;

    // Employee filter (by user ID or email)
    if (employeeSet.size > 0) {
      filtered = filtered.filter(u => 
        employeeSet.has(u.user.id) || employeeSet.has(u.user.email)
      );
    }

    // Job Grade filter
    if (jobGradeSet.size > 0) {
      filtered = filtered.filter(u => 
        u.user.jobTitle && jobGradeSet.has(u.user.jobTitle)
      );
    }

    // Office filter
    if (officeSet.size > 0) {
      filtered = filtered.filter(u => 
        u.user.officeLocation && officeSet.has(u.user.officeLocation.trim())
      );
    }

    // Task category filter (client tasks vs specific internal event types)
    if (taskCategorySet.size > 0) {
      const hasNoPlanningFilter = taskCategorySet.has('no_planning');
      const hasClientFilter = taskCategorySet.has('client');
      
      // Special case: if "no_planning" is selected, show users with no allocations
      if (hasNoPlanningFilter) {
        // If ONLY no_planning is selected, show only users with no allocations
        if (taskCategorySet.size === 1) {
          filtered = filtered.filter(u => u.allocations.length === 0);
        } else {
          // If no_planning is selected along with other filters, show users with no allocations OR matching allocations
          filtered = filtered.filter(u =>
            u.allocations.length === 0 ||
            u.allocations.some(alloc => {
              // Check if it's a client task
              if (hasClientFilter && alloc.clientCode !== null) {
                return true;
              }
              // Check if it's a specific internal event type
              if (alloc.isNonClientEvent && alloc.nonClientEventType && 
                  taskCategorySet.has(alloc.nonClientEventType)) {
                return true;
              }
              return false;
            })
          );
        }
      } else {
        // Filter users to only show those with matching task categories
        filtered = filtered.filter(u =>
          u.allocations.some(alloc => {
            // Check if it's a client task
            if (hasClientFilter && alloc.clientCode !== null) {
              return true;
            }
            // Check if it's a specific internal event type
            if (alloc.isNonClientEvent && alloc.nonClientEventType && 
                taskCategorySet.has(alloc.nonClientEventType)) {
              return true;
            }
            return false;
          })
        );
      }
    }

    // NOW filter allocations within each user based on client filter AND task category filter
    // Only map if we have filters that affect allocations
    if (clientSet.size > 0 || taskCategorySet.size > 0) {
      const hasNoPlanningFilter = taskCategorySet.has('no_planning');
      const hasClientFilter = taskCategorySet.has('client');
      
      filtered = filtered.map(u => ({
        ...u,
        allocations: u.allocations.filter(alloc => {
          // Client filter
          if (clientSet.size > 0) {
            if (alloc.clientCode && !clientSet.has(alloc.clientCode)) {
              return false;
            }
          }
          
          // Task category filter - empty array means show all
          if (taskCategorySet.size > 0 && !hasNoPlanningFilter) {
            // Check if it's a client task
            if (hasClientFilter && alloc.clientCode !== null) {
              return true;
            }
            // Check if it's a specific internal event type
            if (alloc.isNonClientEvent && alloc.nonClientEventType && 
                taskCategorySet.has(alloc.nonClientEventType)) {
              return true;
            }
            // If task category filter is active and this doesn't match, exclude it
            return false;
          }
          
          return true;
        })
      }))
      // Remove users who have no allocations left after filtering
      // UNLESS: taskCategories is empty (unfiltered) OR "no_planning" is selected
      .filter(u => 
        u.allocations.length > 0 || 
        taskCategorySet.size === 0 || 
        hasNoPlanningFilter
      );
    }

    return filtered;
  }, [plannerUsers, employeePlannerFilters]);

  // Extract filter options from plannerUsers and tasks
  const employeeFilterOptions = useMemo(() => {
    // Employees (user ID and name)
    const employeeOptions = plannerUsers
      .map(u => ({
        id: u.user.id,
        label: u.user.name ? `${u.user.name} (${u.user.email})` : u.user.email
      }))
      .sort((a, b) => a.label.localeCompare(b.label));

    // Job grades (unique job titles)
    const jobGradeSet = new Set(
      plannerUsers
        .map(u => u.user.jobTitle)
        .filter((jt): jt is string => !!jt)
    );
    const jobGradeOptions = Array.from(jobGradeSet)
      .map(jg => ({ id: jg, label: jg }))
      .sort((a, b) => a.label.localeCompare(b.label));

    // Offices (unique office locations)
    const officeSet = new Set(
      plannerUsers
        .map(u => u.user.officeLocation?.trim())
        .filter((office): office is string => !!office)
    );
    const officeOptions = Array.from(officeSet)
      .map(office => ({ id: office, label: office }))
      .sort((a, b) => a.label.localeCompare(b.label));

    // Clients (ALL clients from ALL tasks, not just those with allocations)
    const clientMap = new Map<string, string>();
    tasks.forEach(task => {
      if (task.client?.clientCode) {
        const clientName = task.client.clientNameFull || task.client.clientCode;
        clientMap.set(task.client.clientCode, `${task.client.clientCode} - ${clientName}`);
      }
    });
    const clientOptions = Array.from(clientMap.entries())
      .map(([id, label]) => ({ id, label }))
      .sort((a, b) => a.label.localeCompare(b.label));

    return {
      employees: employeeOptions,
      jobGrades: jobGradeOptions,
      offices: officeOptions,
      clients: clientOptions
    };
  }, [plannerUsers, tasks]);

  // Transform users to match GanttTimeline's expected format
  const transformedPlannerUsers = useMemo(() => {
    const transformed = filteredPlannerUsers.map(user => ({
      userId: user.user.id, // Use user.user.id which is never null (fallback for employees without accounts)
      employeeId: user.employeeId, // Actual Employee table ID
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

  // Filtering is now done on the backend for clients, groups, and tasks
  const filteredClients = clients;
  const filteredGroups = groups;
  // Tasks are filtered server-side, no client-side filtering needed
  const filteredTasks = tasks;
  const filteredMyTasks = myTasks;

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

  const currentData = activeTab === 'groups' ? filteredGroups : activeTab === 'clients' ? filteredClients : activeTab === 'tasks' ? tasks : activeTab === 'my-tasks' ? myTasks : [];
  const pagination = activeTab === 'groups' ? groupsPagination : activeTab === 'clients' ? clientsPagination : activeTab === 'tasks' ? tasksPagination : activeTab === 'my-tasks' ? myTasksPagination : undefined;
  const totalCount = isFetching && !pagination ? '...' : (pagination?.total ?? 0);

  return (
    <div className="min-h-screen bg-forvis-gray-50 relative">
      {/* Loading overlay for tab switches - don't show in Kanban mode (KanbanBoard handles its own loading) */}
      {isFetching && !isLoading && taskViewMode !== 'kanban' && (
        <div className="fixed inset-0 bg-white bg-opacity-90 z-50 flex items-center justify-center">
          <div className="bg-white rounded-lg p-6 shadow-corporate-lg">
            <LoadingSpinner size="lg" className="mx-auto" />
            <p className="mt-4 text-sm text-forvis-gray-700 font-medium">Loading...</p>
          </div>
        </div>
      )}
      
      <div className="w-full px-4 sm:px-6 lg:px-8 py-8">
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
        <div className="bg-white rounded-lg shadow-corporate overflow-hidden">
          {/* Header with Inline Tab Sections */}
          <div 
            className="px-6 py-4 border-b border-forvis-gray-200 flex flex-col lg:flex-row lg:items-center gap-4"
            style={{ background: 'linear-gradient(to right, #2E5AAC, #25488A)' }}
          >
            {/* Left: Page Title */}
            <div className="lg:flex-shrink-0">
              <h2 className="text-2xl font-semibold text-white mb-1">
                {subServiceLineGroupDescription}
              </h2>
              <p className="text-sm font-normal text-white/90">
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
            </div>

            {/* Right: Tab Sections */}
            <div className="flex-1 flex flex-col sm:flex-row gap-3 lg:justify-end">
              {/* Firm Wide Section - Blue */}
              <div 
                className="rounded-lg border-2 border-white/30 p-3 shadow-sm"
                style={{ background: 'rgba(240, 247, 253, 0.15)' }}
              >
                <h3 className="text-xs font-semibold text-white uppercase tracking-wider mb-2">
                  Firm Wide
                </h3>
                <nav className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setActiveTab('groups')}
                    className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-white/50 focus:ring-offset-2 ${
                      activeTab === 'groups'
                        ? 'bg-white text-forvis-blue-600 shadow-sm'
                        : 'text-white hover:bg-white/20'
                    }`}
                  >
                    <div className="flex items-center space-x-2">
                      <Users className="h-4 w-4" />
                      <span>Groups</span>
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          activeTab === 'groups'
                            ? 'bg-forvis-blue-100 text-forvis-blue-700'
                            : 'bg-white/20 text-white'
                        }`}
                      >
                        {isLoadingCounts ? '...' : (counts?.groups ?? 0)}
                      </span>
                    </div>
                  </button>
                  <button
                    onClick={() => setActiveTab('clients')}
                    className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-white/50 focus:ring-offset-2 ${
                      activeTab === 'clients'
                        ? 'bg-white text-forvis-blue-600 shadow-sm'
                        : 'text-white hover:bg-white/20'
                    }`}
                  >
                    <div className="flex items-center space-x-2">
                      <Building2 className="h-4 w-4" />
                      <span>Clients</span>
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          activeTab === 'clients'
                            ? 'bg-forvis-blue-100 text-forvis-blue-700'
                            : 'bg-white/20 text-white'
                        }`}
                      >
                        {isLoadingCounts ? '...' : (counts?.clients ?? 0)}
                      </span>
                    </div>
                  </button>
                  <button
                    onClick={() => setActiveTab('tasks')}
                    className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-white/50 focus:ring-offset-2 ${
                      activeTab === 'tasks'
                        ? 'bg-white text-forvis-blue-600 shadow-sm'
                        : 'text-white hover:bg-white/20'
                    }`}
                  >
                    <div className="flex items-center space-x-2">
                      <Folder className="h-4 w-4" />
                      <span>Tasks</span>
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          activeTab === 'tasks'
                            ? 'bg-forvis-blue-100 text-forvis-blue-700'
                            : 'bg-white/20 text-white'
                        }`}
                      >
                        {isLoadingCounts ? '...' : (counts?.tasks ?? 0)}
                      </span>
                    </div>
                  </button>
                  <button
                    onClick={() => setActiveTab('planner')}
                    className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-white/50 focus:ring-offset-2 ${
                      activeTab === 'planner'
                        ? 'bg-white text-forvis-blue-600 shadow-sm'
                        : 'text-white hover:bg-white/20'
                    }`}
                  >
                    <div className="flex items-center space-x-2">
                      <LayoutGrid className="h-4 w-4" />
                      <span>Planner</span>
                    </div>
                  </button>
                </nav>
              </div>

              {/* My Workspace Section - Gold */}
              <div 
                className="rounded-lg border-2 p-3 shadow-sm"
                style={{ 
                  background: 'rgba(240, 234, 224, 0.2)',
                  borderColor: 'rgba(201, 188, 170, 0.5)'
                }}
              >
                <h3 
                  className="text-xs font-semibold uppercase tracking-wider mb-2 text-white"
                >
                  My Workspace
                </h3>
                <nav className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setActiveTab('my-tasks')}
                    className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-white/50 focus:ring-offset-2 ${
                      activeTab === 'my-tasks'
                        ? 'shadow-sm'
                        : 'text-white hover:bg-white/20'
                    }`}
                    style={activeTab === 'my-tasks' ? { 
                      background: 'linear-gradient(135deg, #D9CBA8 0%, #B0A488 100%)',
                      color: 'white'
                    } : {}}
                  >
                    <div className="flex items-center space-x-2">
                      <Users className="h-4 w-4" />
                      <span>My Tasks</span>
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          activeTab === 'my-tasks'
                            ? 'bg-white/30 text-white'
                            : 'bg-white/20 text-white'
                        }`}
                      >
                        {isLoadingCounts ? '...' : (counts?.myTasks ?? 0)}
                      </span>
                    </div>
                  </button>
                  <button
                    onClick={() => setActiveTab('my-planning')}
                    className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-white/50 focus:ring-offset-2 ${
                      activeTab === 'my-planning'
                        ? 'shadow-sm'
                        : 'text-white hover:bg-white/20'
                    }`}
                    style={activeTab === 'my-planning' ? { 
                      background: 'linear-gradient(135deg, #D9CBA8 0%, #B0A488 100%)',
                      color: 'white'
                    } : {}}
                  >
                    <div className="flex items-center space-x-2">
                      <Calendar className="h-4 w-4" />
                      <span>My Planning</span>
                    </div>
                  </button>
                </nav>
              </div>
            </div>
          </div>
          
          <div className="p-6">

          {/* Filter Bars for Groups and Clients */}
          {activeTab === 'groups' && (
            <GroupsFilters
              filters={groupsFilters}
              onFiltersChange={setGroupsFilters}
            />
          )}

          {activeTab === 'clients' && (
            <ClientsFilters
              filters={clientsFilters}
              onFiltersChange={setClientsFilters}
            />
          )}


          {/* Content - Groups, Clients, Tasks, Planner, My Tasks, or My Planning */}
          {activeTab === 'planner' ? (
            /* Team Planner */
            <div className="space-y-4">
              {/* Unified Planner Filters */}
              <PlannerFilters
                plannerView={plannerView}
                onPlannerViewChange={setPlannerView}
                viewMode={plannerView === 'employees' ? employeePlannerViewMode : clientPlannerViewMode}
                onViewModeChange={(mode) => {
                  if (plannerView === 'employees') {
                    setEmployeePlannerViewMode(mode);
                  } else {
                    setClientPlannerViewMode(mode);
                  }
                }}
                employeeFilters={employeePlannerFilters}
                onEmployeeFiltersChange={setEmployeePlannerFilters}
                employeeFilterOptions={employeeFilterOptions}
                clientFilters={clientPlannerFilters}
                onClientFiltersChange={setClientPlannerFilters}
                clientFilterOptions={clientPlannerFilterOptions}
                isLoadingClientOptions={isLoadingFilterOptions}
                teamCount={filteredPlannerUsers.length}
              />

              {/* Timeline or List View */}
              {plannerView === 'employees' ? (
                /* Employee Planner - Timeline or List */
                isLoadingPlannerUsers ? (
                <div className="animate-pulse space-y-4">
                  <div className="h-20 bg-forvis-gray-200 rounded-lg"></div>
                  <div className="h-20 bg-forvis-gray-200 rounded-lg"></div>
                  <div className="h-20 bg-forvis-gray-200 rounded-lg"></div>
                </div>
              ) : filteredPlannerUsers.length === 0 ? (
                <div className="bg-white rounded-lg shadow-corporate border-2 border-forvis-gray-200 p-12 text-center">
                  <Users className="mx-auto h-12 w-12 text-forvis-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-forvis-gray-900">
                    {(employeePlannerFilters.employees.length > 0 || 
                      employeePlannerFilters.jobGrades.length > 0 || 
                      employeePlannerFilters.offices.length > 0 || 
                      employeePlannerFilters.clients.length > 0 ||
                      employeePlannerFilters.taskCategories.length > 0) ? 'No matching team members' : 'No team members'}
                  </h3>
                  <p className="mt-1 text-sm text-forvis-gray-600">
                    {(employeePlannerFilters.employees.length > 0 || 
                      employeePlannerFilters.jobGrades.length > 0 || 
                      employeePlannerFilters.offices.length > 0 || 
                      employeePlannerFilters.clients.length > 0 ||
                      employeePlannerFilters.taskCategories.length > 0)
                      ? 'Try adjusting your filters.'
                      : 'No users are currently assigned to this sub-service line group.'}
                  </p>
                </div>
              ) : employeePlannerViewMode === 'timeline' ? (
                /* Employee Timeline View */
                <GanttTimeline
                  taskId={0}
                  teamMembers={transformedPlannerUsers}
                  currentUserRole={mapServiceLineRoleToTaskRole(currentUserServiceLineRole)}
                  onAllocationUpdate={refetchPlannerUsers}
                  serviceLine={serviceLine}
                  subServiceLineGroup={subServiceLineGroup}
                />
              ) : (
                /* Employee List View */
                <EmployeePlannerList
                  teamMembers={transformedPlannerUsers}
                  serviceLine={serviceLine}
                  subServiceLineGroup={subServiceLineGroup}
                />
              )
              ) : (
                /* Client Planner - Timeline or List */
                clientPlannerViewMode === 'timeline' ? (
                  /* Client Timeline View */
                  <ClientPlannerTimeline
                    serviceLine={serviceLine}
                    subServiceLineGroup={subServiceLineGroup}
                    currentUserRole={mapServiceLineRoleToTaskRole(currentUserServiceLineRole)}
                    filters={clientPlannerFilters}
                  />
                ) : (
                  /* Client List View */
                  <ClientPlannerList
                    serviceLine={serviceLine}
                    subServiceLineGroup={subServiceLineGroup}
                    filters={clientPlannerFilters}
                  />
                )
              )}
            </div>
          ) : activeTab === 'my-planning' ? (
            /* My Planning View */
            <MyPlanningView />
          ) : activeTab === 'groups' ? (
            /* Groups List */
            <div className="bg-forvis-gray-50 rounded-lg border border-forvis-gray-200 shadow-sm p-4">
              {filteredGroups.length === 0 ? (
                <div className="bg-white rounded-lg border border-forvis-gray-200 shadow-corporate text-center py-12">
                  <Users className="mx-auto h-12 w-12 text-forvis-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-forvis-gray-900">No groups</h3>
                  <p className="mt-1 text-sm text-forvis-gray-600">
                    {groupsFilters.groups.length > 0 
                      ? 'No groups match your filters.' 
                      : 'No client groups available in the system.'}
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
                              {group.clientCount ?? 0}
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
                    of <span className="font-medium">{pagination.total}</span> group{pagination.total !== 1 ? 's' : ''}
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
              {filteredClients.length === 0 ? (
                <div className="bg-white rounded-lg border border-forvis-gray-200 shadow-corporate text-center py-12">
                  <Building2 className="mx-auto h-12 w-12 text-forvis-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-forvis-gray-900">No clients</h3>
                  <p className="mt-1 text-sm text-forvis-gray-600">
                    {(clientsFilters.clients.length > 0 || clientsFilters.industries.length > 0 || clientsFilters.groups.length > 0) 
                      ? 'No clients match your filters.' 
                      : 'No clients available in the system.'}
                  </p>
                </div>
              ) : (
                <>
                  <div className="bg-white rounded-lg border border-forvis-gray-200 shadow-corporate overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full" style={{ tableLayout: 'fixed' }}>
                  <colgroup>
                    <col style={{ width: '26%' }} />
                    <col style={{ width: '18%' }} />
                    <col style={{ width: '16%' }} />
                    <col style={{ width: '12%' }} />
                    <col style={{ width: '12%' }} />
                    <col style={{ width: '8%' }} />
                    <col style={{ width: '8%' }} />
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
                        Manager
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
                            <div className="text-sm font-normal text-forvis-gray-800 text-center truncate" title={client.clientPartnerName || client.clientPartner}>
                              {client.clientPartnerName || client.clientPartner}
                            </div>
                          </td>
                          <td className="px-3 py-3">
                            <div className="text-sm font-normal text-forvis-gray-800 text-center truncate" title={client.clientManagerName || client.clientManager}>
                              {client.clientManagerName || client.clientManager}
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
                  of <span className="font-medium">{pagination.total}</span> client{pagination.total !== 1 ? 's' : ''}
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
          ) : (activeTab === 'tasks' || activeTab === 'my-tasks') ? (
            /* Tasks List or Kanban View */
            <div className="space-y-4">
              {/* Unified Filters Bar - Always show */}
              <TasksFilters
                serviceLine={serviceLine}
                subServiceLineGroup={subServiceLineGroup}
                filters={taskFilters}
                onFiltersChange={setTaskFilters}
                viewMode={taskViewMode}
                onViewModeChange={handleViewModeChange}
                displayMode={displayMode}
                onDisplayModeChange={setDisplayMode}
              />

              {taskViewMode === 'kanban' ? (
                /* Kanban View */
                <KanbanBoard
                  serviceLine={serviceLine}
                  subServiceLineGroup={subServiceLineGroup}
                  myTasksOnly={activeTab === 'my-tasks'}
                  displayMode={displayMode}
                  onDisplayModeChange={setDisplayMode}
                  filters={taskFilters}
                />
              ) : (
                /* List View */
                <div className="bg-forvis-gray-50 rounded-lg border border-forvis-gray-200 shadow-sm p-4">
                  {(activeTab === 'tasks' ? filteredTasks : filteredMyTasks).length === 0 ? (
                <div className="bg-white rounded-lg border border-forvis-gray-200 shadow-corporate text-center py-12">
                  <Folder className="mx-auto h-12 w-12 text-forvis-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-forvis-gray-900">No tasks</h3>
                  <p className="mt-1 text-sm text-forvis-gray-600">
                    {debouncedSearch || taskFilters.clients.length > 0 || taskFilters.taskNames.length > 0 || taskFilters.partners.length > 0 || taskFilters.managers.length > 0 || taskFilters.serviceLines.length > 0
                      ? 'No tasks match your filters.'
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
                      <col style={{ width: '35%' }} />
                      <col style={{ width: '25%' }} />
                      <col style={{ width: '15%' }} />
                      <col style={{ width: '15%' }} />
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
                          Partner
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                          Manager
                        </th>
                        <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-white uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-forvis-gray-200">
                      {(activeTab === 'tasks' ? filteredTasks : filteredMyTasks).map((task, index) => {
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
                                  {task.taskCode && (
                                    <div className="text-xs text-forvis-gray-500">
                                      {task.taskCode}
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
                              <div className="text-sm font-normal text-forvis-gray-800 truncate" title={task.taskPartnerName || task.taskPartner || ''}>
                                {task.taskPartnerName || task.taskPartner || '-'}
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="text-sm font-normal text-forvis-gray-800 truncate" title={task.taskManagerName || task.taskManager || ''}>
                                {task.taskManagerName || task.taskManager || '-'}
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
          ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
