'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import Link from 'next/link';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
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
  FileBarChart,
  ClipboardCheck,
  FolderOpen,
} from 'lucide-react';
import { isValidServiceLine, formatServiceLineName, isSharedService } from '@/lib/utils/serviceLineUtils';
import { formatTaskStage, getTaskStageColor } from '@/lib/utils/taskStages';
import { useServiceLine } from '@/components/providers/ServiceLineProvider';
import { ServiceLine } from '@/types';
import { useClients, type Client } from '@/hooks/clients/useClients';
import { useTasks, type TaskListItem } from '@/hooks/tasks/useTasks'; // Updated with GSClientID
import { useSubServiceLineGroups } from '@/hooks/service-lines/useSubServiceLineGroups';
import { useClientGroups } from '@/hooks/clients/useClientGroups';
import { useWorkspaceCounts } from '@/hooks/workspace/useWorkspaceCounts';
import { useApprovalsCount } from '@/hooks/approvals/useApprovals';
import { ServiceLineSelector } from '@/components/features/service-lines/ServiceLineSelector';
import { SubServiceLineQuickNav } from '@/components/features/service-lines/SubServiceLineQuickNav';
import { Button, LoadingSpinner, Card, MultiSelect, Banner } from '@/components/ui';
import { Pagination } from '@/components/shared/Pagination';
import { GRADIENTS } from '@/lib/design-system/gradients';
import { MyPlanningView, PlannerFilters } from '@/components/features/planning';
import { EmployeePlannerList } from '@/components/features/planning/EmployeePlannerList';
import { ClientPlannerList } from '@/components/features/planning/ClientPlannerList';
import { MyReportsView } from '@/components/features/reports/MyReportsView';
import { MyApprovalsView } from '@/components/features/approvals';
import { DocumentCard, DocumentFilterBar, DocumentDetailModal } from '@/components/features/document-vault';
import type { EmployeePlannerFilters as EmployeePlannerFiltersType, ClientPlannerFilters as ClientPlannerFiltersType } from '@/components/features/planning';
import { EmployeeStatusBadge } from '@/components/shared/EmployeeStatusBadge';
import { ClickableEmployeeBadge } from '@/components/shared/ClickableEmployeeBadge';
import { ChangePartnerManagerModal } from '@/components/features/clients/ChangePartnerManagerModal';
import { useSubServiceLineUsers } from '@/hooks/service-lines/useSubServiceLineUsers';
import { useCurrentUser } from '@/hooks/auth/usePermissions';
import { useQuery } from '@tanstack/react-query';
import { hasServiceLineRole } from '@/lib/utils/roleHierarchy';
import { useEmployeePlanner } from '@/hooks/planning/useEmployeePlanner';
import { TaskWorkflowStatus } from '@/components/features/tasks/TaskWorkflowStatus';
import { GanttTimeline } from '@/components/features/tasks/TeamPlanner';
import { ClientPlannerTimeline } from '@/components/features/tasks/ClientPlanner';
import { ServiceLineRole, NonClientEventType, NON_CLIENT_EVENT_CONFIG } from '@/types';
import { KanbanBoard } from '@/components/features/tasks/Kanban';
import { GroupsFilters, GroupsFiltersType } from '@/components/features/groups/GroupsFilters';
import { ClientsFilters, ClientsFiltersType } from '@/components/features/clients/ClientsFilters';
import { TasksFilters, TasksFiltersType } from '@/components/features/tasks/TasksFilters';
import { PlannerOptimisticProvider } from '@/contexts/PlannerOptimisticContext';

// Vault Documents View Component
function VaultDocumentsView({ serviceLine }: { serviceLine: string }) {
  const [documents, setDocuments] = useState<any[]>([]);
  const [categories, setCategories] = useState<Array<{ id: number; name: string }>>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<any>({ serviceLine: serviceLine.toUpperCase() });
  const [selectedDocumentId, setSelectedDocumentId] = useState<number | null>(null);

  // Fetch categories
  useEffect(() => {
    fetch('/api/document-vault/categories')
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setCategories(data.data.map((cat: any) => ({ id: cat.id, name: cat.name })));
        }
      })
      .catch(err => console.error('Failed to load categories:', err));
  }, []);

  // Fetch documents
  useEffect(() => {
    setIsLoading(true);
    const params = new URLSearchParams();
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value) params.append(key, String(value));
    });

    fetch(`/api/document-vault?${params}`)
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setDocuments(data.data.documents);
        } else {
          setError(data.error || 'Failed to load documents');
        }
      })
      .catch(err => {
        setError('Failed to load documents');
        console.error(err);
      })
      .finally(() => setIsLoading(false));
  }, [filters]);

  if (isLoading && documents.length === 0) {
    return (
      <div className="flex justify-center items-center py-12">
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <Banner 
        variant="error" 
        message={error}
        dismissible
        onDismiss={() => setError(null)}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <DocumentFilterBar
        onFilterChange={(newFilters) => {
          setFilters({
            ...newFilters,
            serviceLine: serviceLine.toUpperCase(),
          });
        }}
        categories={categories}
      />

      {/* Document Grid */}
      {documents.length === 0 ? (
        <div className="bg-white rounded-lg border border-forvis-gray-200 shadow-corporate text-center py-12">
          <FolderOpen className="mx-auto h-12 w-12 text-forvis-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-forvis-gray-900">No documents found</h3>
          <p className="mt-1 text-sm text-forvis-gray-500">
            No documents available for this service line
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {documents.map((doc: any) => (
            <DocumentCard 
              key={doc.id} 
              document={doc} 
              onClick={(id) => setSelectedDocumentId(id)}
            />
          ))}
        </div>
      )}

      {/* Document Detail Modal */}
      <DocumentDetailModal
        isOpen={selectedDocumentId !== null}
        onClose={() => setSelectedDocumentId(null)}
        documentId={selectedDocumentId}
      />
    </div>
  );
}

export default function SubServiceLineWorkspacePage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const serviceLine = (params.serviceLine as string)?.toUpperCase();
  const subServiceLineGroup = params.subServiceLineGroup as string;
  const { setCurrentServiceLine } = useServiceLine();
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [currentUserSubGroupRole, setCurrentUserSubGroupRole] = useState<string>('VIEWER');
  
  const [activeTab, setActiveTab] = useState<'groups' | 'clients' | 'tasks' | 'planner' | 'vault' | 'my-tasks' | 'my-planning' | 'my-reports' | 'my-approvals'>('clients');
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
    partners: [],
    managers: [],
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
  
  // Timeline pagination state
  const [timelinePage, setTimelinePage] = useState(1);
  
  // Employee planner filters (array-based for multiselect)
  const [employeePlannerFilters, setEmployeePlannerFilters] = useState<EmployeePlannerFiltersType>({
    employees: [],
    jobGrades: [],
    offices: [],
    clients: [],
    taskCategories: []
  });
  
  // Change request modal state
  const [changeModalState, setChangeModalState] = useState<{
    isOpen: boolean;
    clientId: number;
    clientName: string;
    clientCode: string;
    changeType: 'PARTNER' | 'MANAGER';
    currentEmployeeCode: string;
    currentEmployeeName: string;
  } | null>(null);

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

  // Fetch current user and roles for change request feature
  const { data: currentUser } = useCurrentUser();
  const { data: userRoles } = useQuery({
    queryKey: ['user-service-line-roles', currentUser?.id],
    queryFn: async () => {
      if (!currentUser?.id) return [];
      const response = await fetch('/api/service-lines/user-roles');
      if (!response.ok) throw new Error('Failed to fetch user roles');
      const result = await response.json();
      return result.data as { role: string }[];
    },
    enabled: !!currentUser?.id,
    staleTime: 10 * 60 * 1000,
  });

  // Check if user has MANAGER+ role for change requests
  const hasManagerRole = useMemo(() => {
    if (!currentUser) return false;
    if (currentUser.systemRole === 'SYSTEM_ADMIN') return true;
    if (!userRoles || userRoles.length === 0) return false;
    return userRoles.some(({ role }) => hasServiceLineRole(role, 'MANAGER'));
  }, [currentUser, userRoles]);

  // Debounce search input (500ms to reduce unnecessary API calls)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setCurrentPage(1); // Reset to first page on search
    }, 500);
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

  // Handle tab query parameter for navigation from Quick Nav
  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab && (tab === 'groups' || tab === 'clients' || tab === 'tasks' || tab === 'planner' || tab === 'my-tasks' || tab === 'my-planning' || tab === 'my-reports' || tab === 'my-approvals')) {
      setActiveTab(tab);
    }
  }, [searchParams]);

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
    isFetching: isFetchingClients,
  } = useClients({
    search: '', // No text search - use array filters
    page: currentPage,
    limit: itemsPerPage,
    clientCodes: clientsFilters.clients, // Backend filtering by client codes
    partners: clientsFilters.partners, // Backend filtering by partners
    managers: clientsFilters.managers, // Backend filtering by managers
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

  // Fetch employee planner data for timeline view (with pagination)
  const { 
    data: timelinePlannerData,
    isLoading: isLoadingTimelinePlanner
  } = useEmployeePlanner({
    serviceLine,
    subServiceLineGroup,
    employees: employeePlannerFilters.employees,
    jobGrades: employeePlannerFilters.jobGrades,
    offices: employeePlannerFilters.offices,
    clients: employeePlannerFilters.clients,
    taskCategories: employeePlannerFilters.taskCategories,
    includeUnallocated: true, // Timeline view shows all employees
    page: timelinePage,
    limit: 50, // Limit to 50 employees per page
    enabled: activeTab === 'planner' && 
             plannerView === 'employees' && 
             employeePlannerViewMode === 'timeline'
  });

  // Reset timeline page when filters change
  React.useEffect(() => {
    setTimelinePage(1);
  }, [
    employeePlannerFilters.employees,
    employeePlannerFilters.jobGrades,
    employeePlannerFilters.offices,
    employeePlannerFilters.clients,
    employeePlannerFilters.taskCategories
  ]);

  // Refetch planner data when switching between Employee/Client views
  // This ensures changes made in one view are visible in the other
  React.useEffect(() => {
    if (activeTab === 'planner') {
      // Invalidate all planner data when switching between employee/client views
      // The new view's queries will automatically fetch fresh data on mount (refetchOnMount: true)
      queryClient.invalidateQueries({ 
        queryKey: ['planner'],
        refetchType: 'none' // Don't refetch now - let components handle it when they mount
      });
      queryClient.invalidateQueries({ 
        queryKey: ['global-planner'],
        refetchType: 'none'
      });
    }
  }, [plannerView, queryClient, activeTab]);

  // Ensure fresh data when navigating to planner tab
  React.useEffect(() => {
    if (activeTab === 'planner') {
      // Invalidate to ensure fresh data when tab becomes active
      queryClient.invalidateQueries({ queryKey: ['planner'] });
      queryClient.invalidateQueries({ queryKey: ['global-planner'] });
    }
  }, [activeTab, queryClient]);

  // Filter options are now fetched inside PlannerFilters component

 
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

  // Fetch approvals count for badge
  const { data: approvalsCount, isLoading: isLoadingApprovalsCount } = useApprovalsCount();
  
  const isLoading = activeTab === 'clients' ? isLoadingClients : activeTab === 'tasks' ? isLoadingTasks : activeTab === 'my-tasks' ? isLoadingMyTasks : activeTab === 'groups' ? isLoadingGroups : activeTab === 'planner' ? isLoadingPlannerUsers : false;
  const isFetching = activeTab === 'clients' ? isFetchingClients : activeTab === 'tasks' ? isFetchingTasks : activeTab === 'my-tasks' ? isFetchingMyTasks : activeTab === 'groups' ? isFetchingGroups : false;
  
  // Use the current user's role from state (default to VIEWER)
  const currentUserServiceLineRole = currentUserSubGroupRole;

  // Transform employee planner data to GanttTimeline format (for timeline view with server-side filtering)
  const transformedTimelineUsers = useMemo(() => {
    if (!timelinePlannerData?.allocations) {
      return [];
    }
    
    // Group allocations by employee
    const employeeMap = new Map<string, any>();
    
    timelinePlannerData.allocations.forEach(alloc => {
      if (!employeeMap.has(alloc.userId)) {
        employeeMap.set(alloc.userId, {
          userId: alloc.userId,
          employeeId: alloc.employeeId,
          User: {
            id: alloc.userId,
            name: alloc.userName,
            email: alloc.userEmail,
            jobTitle: alloc.jobGradeCode,
            officeLocation: alloc.officeLocation,
            jobGradeCode: alloc.jobGradeCode
          },
          role: (alloc as any).serviceLineRole || 'USER',
          allocations: [],
          employeeStatus: alloc.employeeStatus
        });
      }
      
      // Add all allocations: task allocations (taskId > 0) AND non-client events (taskId === 0 && isNonClientEvent)
      if (alloc.taskId > 0 || alloc.isNonClientEvent) {
        employeeMap.get(alloc.userId).allocations.push({
          id: alloc.allocationId,
          taskId: alloc.taskId,
          taskName: alloc.taskName,
          taskCode: alloc.taskCode,
          clientId: alloc.clientId,
          clientName: alloc.clientName,
          clientCode: alloc.clientCode,
          startDate: alloc.startDate,
          endDate: alloc.endDate,
          role: alloc.role,
          allocatedHours: alloc.allocatedHours,
          allocatedPercentage: alloc.allocatedPercentage,
          actualHours: alloc.actualHours,
          isNonClientEvent: alloc.isNonClientEvent,
          nonClientEventType: alloc.nonClientEventType,
          notes: alloc.notes,
          isCurrentTask: (alloc as any).isCurrentTask // Preserve isCurrentTask flag for cross-service-line allocations
        });
      }
    });
    
    return Array.from(employeeMap.values()).map(employee => ({
      userId: employee.userId,
      employeeId: employee.employeeId,
      User: employee.User,
      role: employee.role,
      allocations: employee.allocations,
      employeeStatus: employee.employeeStatus
    }));
  }, [timelinePlannerData]);

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
        // STEP 1: Fetch user session to check if SYSTEM_ADMIN
        const sessionResponse = await fetch('/api/auth/session');
        
        if (!sessionResponse.ok) {
          setHasAccess(false);
          return;
        }
        
        const sessionData = await sessionResponse.json();
        const userRole = sessionData.user?.role;
        
        // Set current user ID
        if (sessionData.user?.id) {
          setCurrentUserId(sessionData.user.id);
        }
        
        // SYSTEM_ADMIN bypasses service line checks and gets ADMINISTRATOR role
        if (userRole === 'SYSTEM_ADMIN') {
          setHasAccess(true);
          setCurrentUserSubGroupRole('ADMINISTRATOR');
          return; // Exit early - no need to check service line assignments
        }

        // STEP 2: For regular users, check service line assignments
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
          <AlertTriangle className="mx-auto h-12 w-12 text-forvis-warning-500 mb-4" />
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
            style={{ background: GRADIENTS.primary.horizontal }}
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
                  : activeTab === 'vault'
                  ? `${formatServiceLineName(serviceLine)} policies, procedures, and templates`
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
                  <button
                    onClick={() => setActiveTab('vault')}
                    className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-white/50 focus:ring-offset-2 ${
                      activeTab === 'vault'
                        ? 'bg-white text-forvis-blue-600 shadow-sm'
                        : 'text-white hover:bg-white/20'
                    }`}
                  >
                    <div className="flex items-center space-x-2">
                      <FolderOpen className="h-4 w-4" />
                      <span>Vault</span>
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
                      background: GRADIENTS.premium.gold,
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
                      background: GRADIENTS.premium.gold,
                      color: 'white'
                    } : {}}
                  >
                    <div className="flex items-center space-x-2">
                      <Calendar className="h-4 w-4" />
                      <span>My Planning</span>
                    </div>
                  </button>
                  <button
                    onClick={() => setActiveTab('my-reports')}
                    className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-white/50 focus:ring-offset-2 ${
                      activeTab === 'my-reports'
                        ? 'shadow-sm'
                        : 'text-white hover:bg-white/20'
                    }`}
                    style={activeTab === 'my-reports' ? { 
                      background: GRADIENTS.premium.gold,
                      color: 'white'
                    } : {}}
                  >
                    <div className="flex items-center space-x-2">
                      <FileBarChart className="h-4 w-4" />
                      <span>My Reports</span>
                    </div>
                  </button>
                  <button
                    onClick={() => setActiveTab('my-approvals')}
                    className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-white/50 focus:ring-offset-2 ${
                      activeTab === 'my-approvals'
                        ? 'shadow-sm'
                        : 'text-white hover:bg-white/20'
                    }`}
                    style={activeTab === 'my-approvals' ? { 
                      background: GRADIENTS.premium.gold,
                      color: 'white'
                    } : {}}
                  >
                    <div className="flex items-center space-x-2">
                      <ClipboardCheck className="h-4 w-4" />
                      <span>My Approvals</span>
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          activeTab === 'my-approvals'
                            ? 'bg-white/30 text-white'
                            : 'bg-white/20 text-white'
                        }`}
                      >
                        {isLoadingApprovalsCount ? '...' : (approvalsCount ?? 0)}
                      </span>
                    </div>
                  </button>
                  <SubServiceLineQuickNav />
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
            /* Team Planner - Wrapped with optimistic update provider for cross-view sync */
            <PlannerOptimisticProvider>
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
                serviceLine={serviceLine}
                subServiceLineGroup={subServiceLineGroup}
                employeeFilters={employeePlannerFilters}
                onEmployeeFiltersChange={setEmployeePlannerFilters}
                clientFilters={clientPlannerFilters}
                onClientFiltersChange={setClientPlannerFilters}
                teamCount={plannerUsers.length}
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
              ) : employeePlannerViewMode === 'timeline' ? (
                /* Employee Timeline View */
                isLoadingTimelinePlanner ? (
                  <div className="bg-white rounded-lg shadow-corporate border-2 border-forvis-gray-200 p-12 text-center">
                    <LoadingSpinner size="lg" />
                    <p className="mt-4 text-forvis-gray-600">Loading timeline data...</p>
                  </div>
                ) : transformedTimelineUsers.length === 0 ? (
                  <div className="bg-white rounded-lg shadow-corporate border-2 border-forvis-gray-200 p-12 text-center">
                    <Users className="mx-auto h-12 w-12 text-forvis-gray-400" />
                    <p className="mt-2 text-lg font-medium text-forvis-gray-900">No Allocations Found</p>
                    <p className="mt-1 text-sm text-forvis-gray-600">
                      Try adjusting your filters to see employee allocations.
                    </p>
                  </div>
                ) : (
                  <>
                    <GanttTimeline
                      taskId={0}
                      teamMembers={transformedTimelineUsers}
                      currentUserRole={currentUserServiceLineRole}
                      onAllocationUpdate={async () => {
                        // Invalidate ALL planner queries to ensure both views stay in sync
                        await queryClient.invalidateQueries({ 
                          queryKey: ['planner'],
                          refetchType: 'all' // Force refetch for both active and inactive queries
                        });
                        // Also invalidate global planner for Staff Planner sync
                        await queryClient.invalidateQueries({
                          queryKey: ['global-planner'],
                          refetchType: 'all'
                        });
                        // Force immediate refetch of active queries for instant sync
                        await queryClient.refetchQueries({
                          queryKey: ['planner'],
                          type: 'active'
                        });
                      }}
                      serviceLine={serviceLine}
                      subServiceLineGroup={subServiceLineGroup}
                    />
                    
                    {/* Timeline Pagination Controls */}
                    {timelinePlannerData?.pagination && timelinePlannerData.pagination.totalPages > 1 && (
                      <div className="mt-4 px-6 py-4 bg-white rounded-lg shadow-corporate border-2 border-forvis-gray-200 flex items-center justify-between">
                        <div className="text-sm text-forvis-gray-600">
                          Showing {transformedTimelineUsers.length} of {timelinePlannerData.pagination.total} employees
                          {' '}&middot;{' '}
                          Page {timelinePlannerData.pagination.page} of {timelinePlannerData.pagination.totalPages}
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => setTimelinePage(Math.max(1, timelinePage - 1))}
                            disabled={timelinePage === 1}
                            className="px-4 py-2 text-sm font-medium text-forvis-gray-700 bg-white border border-forvis-gray-300 rounded-md hover:bg-forvis-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                          >
                            Previous
                          </button>
                          <button
                            onClick={() => setTimelinePage(Math.min(timelinePlannerData.pagination.totalPages, timelinePage + 1))}
                            disabled={timelinePage === timelinePlannerData.pagination.totalPages}
                            className="px-4 py-2 text-sm font-medium text-forvis-gray-700 bg-white border border-forvis-gray-300 rounded-md hover:bg-forvis-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                          >
                            Next
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                )
              ) : (
                /* Employee List View */
                <EmployeePlannerList
                  serviceLine={serviceLine}
                  subServiceLineGroup={subServiceLineGroup}
                  filters={employeePlannerFilters}
                />
              )
              ) : (
                /* Client Planner - Timeline or List */
                clientPlannerViewMode === 'timeline' ? (
                  /* Client Timeline View */
                  <ClientPlannerTimeline
                    serviceLine={serviceLine}
                    subServiceLineGroup={subServiceLineGroup}
                    currentUserRole={currentUserServiceLineRole}
                    filters={clientPlannerFilters}
                    onAllocationUpdate={async () => {
                      // Invalidate ALL planner queries to ensure both views stay in sync
                      await queryClient.invalidateQueries({ 
                        queryKey: ['planner'],
                        refetchType: 'all' // Force refetch for both active and inactive queries
                      });
                      // Also invalidate global planner for Staff Planner sync
                      await queryClient.invalidateQueries({
                        queryKey: ['global-planner'],
                        refetchType: 'all'
                      });
                      // Force immediate refetch of active queries for instant sync
                      await queryClient.refetchQueries({
                        queryKey: ['planner'],
                        type: 'active'
                      });
                    }}
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
            </PlannerOptimisticProvider>
          ) : activeTab === 'my-planning' ? (
            /* My Planning View */
            <MyPlanningView />
          ) : activeTab === 'my-reports' ? (
            /* My Reports View with Sub-tabs */
            <MyReportsView />
          ) : activeTab === 'my-approvals' ? (
            /* My Approvals View with Sub-tabs */
            <MyApprovalsView />
          ) : activeTab === 'vault' ? (
            /* Vault Documents */
            <VaultDocumentsView serviceLine={serviceLine} />
          ) : activeTab === 'groups' ? (
            /* Groups List */
            isFetchingGroups && filteredGroups.length === 0 ? (
              <div className="flex justify-center items-center py-12">
                <LoadingSpinner size="lg" />
                <p className="ml-4 text-sm text-forvis-gray-600">Loading groups...</p>
              </div>
            ) : (
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
                      <tr style={{ background: GRADIENTS.primary.horizontal }}>
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
                <Pagination
                  currentPage={currentPage}
                  totalPages={pagination.totalPages}
                  onPageChange={setCurrentPage}
                  totalItems={pagination.total}
                  itemsPerPage={itemsPerPage}
                  showMetadata
                  className="mt-4"
                />
              )}
                </>
              )}
            </div>
            )
          ) : activeTab === 'clients' ? (
            /* Clients List */
            isFetchingClients && filteredClients.length === 0 ? (
              <div className="flex justify-center items-center py-12">
                <LoadingSpinner size="lg" />
                <p className="ml-4 text-sm text-forvis-gray-600">Loading clients...</p>
              </div>
            ) : (
            <div className="bg-forvis-gray-50 rounded-lg border border-forvis-gray-200 shadow-sm p-4">
              {filteredClients.length === 0 ? (
                <div className="bg-white rounded-lg border border-forvis-gray-200 shadow-corporate text-center py-12">
                  <Building2 className="mx-auto h-12 w-12 text-forvis-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-forvis-gray-900">No clients</h3>
                  <p className="mt-1 text-sm text-forvis-gray-600">
                    {(clientsFilters.clients.length > 0 || clientsFilters.partners.length > 0 || clientsFilters.managers.length > 0 || clientsFilters.groups.length > 0) 
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
                    <col style={{ width: '32%' }} />
                    <col style={{ width: '22%' }} />
                    <col style={{ width: '17%' }} />
                    <col style={{ width: '17%' }} />
                    <col style={{ width: '7%' }} />
                    <col style={{ width: '5%' }} />
                  </colgroup>
                  <thead>
                    <tr style={{ background: GRADIENTS.primary.horizontal }}>
                      <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                        Client
                      </th>
                      <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                        Group
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
                                <div className="text-sm text-forvis-gray-500 truncate">{client.clientCode}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-3 py-3">
                            <div className="text-sm font-normal text-forvis-gray-800 truncate" title={client.groupDesc}>
                              {client.groupDesc}
                            </div>
                          </td>
                          <td className="px-3 py-3">
                            <div className="text-center">
                              <ClickableEmployeeBadge
                                name={client.clientPartnerName || '-'}
                                isActive={client.clientPartnerStatus?.isActive ?? false}
                                hasUserAccount={client.clientPartnerStatus?.hasUserAccount ?? false}
                                variant="text"
                                iconSize="sm"
                                clickable={hasManagerRole}
                                onClick={() => {
                                  setChangeModalState({
                                    isOpen: true,
                                    clientId: client.id,
                                    clientName: client.clientNameFull || client.clientCode,
                                    clientCode: client.clientCode,
                                    changeType: 'PARTNER',
                                    currentEmployeeCode: client.clientPartner,
                                    currentEmployeeName: client.clientPartnerName || client.clientPartner,
                                  });
                                }}
                              />
                            </div>
                          </td>
                          <td className="px-3 py-3">
                            <div className="text-center">
                              <ClickableEmployeeBadge
                                name={client.clientManagerName || '-'}
                                isActive={client.clientManagerStatus?.isActive ?? false}
                                hasUserAccount={client.clientManagerStatus?.hasUserAccount ?? false}
                                variant="text"
                                iconSize="sm"
                                clickable={hasManagerRole}
                                onClick={() => {
                                  setChangeModalState({
                                    isOpen: true,
                                    clientId: client.id,
                                    clientName: client.clientNameFull || client.clientCode,
                                    clientCode: client.clientCode,
                                    changeType: 'MANAGER',
                                    currentEmployeeCode: client.clientManager,
                                    currentEmployeeName: client.clientManagerName || client.clientManager,
                                  });
                                }}
                              />
                            </div>
                          </td>
                          <td className="px-3 py-3 text-center">
                            <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-full text-sm font-medium bg-forvis-blue-100 text-forvis-blue-800">
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
              <Pagination
                currentPage={currentPage}
                totalPages={pagination.totalPages}
                onPageChange={setCurrentPage}
                totalItems={pagination.total}
                itemsPerPage={itemsPerPage}
                showMetadata
                className="mt-4"
              />
            )}
                </>
              )}
            </div>
            )
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

              {/* Show loading spinner for list view only (Kanban handles its own loading) */}
              {taskViewMode !== 'kanban' && (isFetchingTasks || isFetchingMyTasks) && (activeTab === 'tasks' ? filteredTasks.length === 0 : filteredMyTasks.length === 0) ? (
                <div className="flex justify-center items-center py-12">
                  <LoadingSpinner size="lg" />
                  <p className="ml-4 text-sm text-forvis-gray-600">
                    Loading {activeTab === 'my-tasks' ? 'your tasks' : 'tasks'}...
                  </p>
                </div>
              ) : taskViewMode === 'kanban' ? (
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
                      <col style={{ width: activeTab === 'my-tasks' ? '23%' : '28%' }} />
                      <col style={{ width: '10%' }} />
                      <col style={{ width: '8%' }} />
                      <col style={{ width: activeTab === 'my-tasks' ? '16%' : '18%' }} />
                      <col style={{ width: '12%' }} />
                      <col style={{ width: '12%' }} />
                      {activeTab === 'my-tasks' && <col style={{ width: '11%' }} />}
                      <col style={{ width: activeTab === 'my-tasks' ? '8%' : '10%' }} />
                    </colgroup>
                    <thead>
                      <tr style={{ background: GRADIENTS.primary.horizontal }}>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                          Task Name
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                          Stage
                        </th>
                        <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-white uppercase tracking-wider">
                          QRM
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
                        {activeTab === 'my-tasks' && (
                          <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-white uppercase tracking-wider">
                            WIP Balance
                          </th>
                        )}
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
                              <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-md border ${getTaskStageColor(task.latestStage || 'ENGAGE')}`}>
                                {formatTaskStage(task.latestStage || 'ENGAGE')}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex justify-center">
                                <TaskWorkflowStatus
                                  acceptanceApproved={task.acceptanceApproved}
                                  engagementLetterUploaded={task.engagementLetterUploaded}
                                  dpaUploaded={task.dpaUploaded}
                                  isClientTask={task.isClientTask}
                                  displayMode="detailed"
                                />
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
                              {task.taskPartnerName || task.taskPartner ? (
                                <EmployeeStatusBadge
                                  name={task.taskPartnerName || task.taskPartner}
                                  isActive={task.taskPartnerStatus?.isActive ?? false}
                                  hasUserAccount={task.taskPartnerStatus?.hasUserAccount ?? false}
                                  variant="text"
                                  iconSize="sm"
                                />
                              ) : (
                                <span className="text-sm font-normal text-forvis-gray-800">-</span>
                              )}
                            </td>
                            <td className="px-6 py-4">
                              {task.taskManagerName || task.taskManager ? (
                                <EmployeeStatusBadge
                                  name={task.taskManagerName || task.taskManager}
                                  isActive={task.taskManagerStatus?.isActive ?? false}
                                  hasUserAccount={task.taskManagerStatus?.hasUserAccount ?? false}
                                  variant="text"
                                  iconSize="sm"
                                />
                              ) : (
                                <span className="text-sm font-normal text-forvis-gray-800">-</span>
                              )}
                            </td>
                            {activeTab === 'my-tasks' && (
                              <td className="px-6 py-4 text-right">
                                <span className="text-sm font-semibold text-forvis-blue-600">
                                  {new Intl.NumberFormat('en-ZA', {
                                    style: 'currency',
                                    currency: 'ZAR',
                                    minimumFractionDigits: 0,
                                    maximumFractionDigits: 0,
                                  }).format(task.wip?.netWip ?? 0)}
                                </span>
                              </td>
                            )}
                            <td className="px-6 py-4 text-center">
                              <Link
                                href={
                                  task.client?.GSClientID 
                                    ? `/dashboard/${serviceLine.toLowerCase()}/${subServiceLineGroup}/clients/${task.client.GSClientID}/tasks/${task.id}${activeTab === 'my-tasks' ? '?from=my-tasks' : ''}`
                                    : `/dashboard/tasks/${task.id}${activeTab === 'my-tasks' ? '?from=my-tasks' : ''}`
                                }
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
                <Pagination
                  currentPage={currentPage}
                  totalPages={pagination.totalPages}
                  onPageChange={setCurrentPage}
                  totalItems={pagination.total}
                  itemsPerPage={itemsPerPage}
                  showMetadata
                  className="mt-4"
                />
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

      {/* Change Partner/Manager Modal */}
      {changeModalState && (
        <ChangePartnerManagerModal
          isOpen={changeModalState.isOpen}
          onClose={() => setChangeModalState(null)}
          clientId={changeModalState.clientId}
          clientName={changeModalState.clientName}
          clientCode={changeModalState.clientCode}
          changeType={changeModalState.changeType}
          currentEmployeeCode={changeModalState.currentEmployeeCode}
          currentEmployeeName={changeModalState.currentEmployeeName}
          onSuccess={() => {
            // Invalidate clients cache to refresh the list
            queryClient.invalidateQueries({ queryKey: ['clients'] });
          }}
        />
      )}
    </div>
  );
}
