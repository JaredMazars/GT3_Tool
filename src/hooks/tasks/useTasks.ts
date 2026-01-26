'use client';

import { useQuery } from '@tanstack/react-query';

// Query Keys - extend existing taskKeys from useTaskData
export const taskListKeys = {
  all: ['tasks'] as const,
  lists: () => [...taskListKeys.all, 'list'] as const,
  list: (params: UseTasksParams) => 
    [...taskListKeys.lists(), params] as const,
};

// Types
export interface TaskListItem {
  id: number;
  name: string;
  description: string | null;
  serviceLine: string;
  status: string;
  archived: boolean;
  clientId: number | null;  // Internal ID - for queries
  taxYear: number | null;
  createdAt: string;
  updatedAt: string;
  taskCode: string | null;
  taskPartner: string | null;
  taskPartnerName: string | null;
  taskPartnerStatus?: { isActive: boolean; hasUserAccount: boolean };
  taskManager: string | null;
  taskManagerName: string | null;
  taskManagerStatus?: { isActive: boolean; hasUserAccount: boolean };
  latestStage?: string; // Current stage of the task
  client?: {
    id: number;
    GSClientID: string;  // External ID
    clientNameFull: string | null;
    clientCode: string | null;
  } | null;
  canAccess?: boolean; // Whether user can access task details
  userRole?: string | null; // User's role on task (if team member)
  wip?: {
    netWip: number;
  } | null; // WIP balance (only present in myTasksOnly mode)
  acceptanceApproved?: boolean | null; // A&C approval status
  engagementLetterUploaded?: boolean | null; // EL upload status
  dpaUploaded?: boolean | null; // DPA upload status
  isClientTask: boolean; // Whether this is a client task (determines A&C/EL/DPA visibility)
}

export interface TasksResponse {
  tasks: TaskListItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface UseTasksParams {
  search?: string;
  page?: number;
  limit?: number; // Note: For virtual scrolling, use higher limits (100-500) to minimize API calls
  serviceLine?: string;
  subServiceLineGroup?: string;
  includeArchived?: boolean;
  internalOnly?: boolean;
  clientTasksOnly?: boolean;
  myTasksOnly?: boolean;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  enabled?: boolean;
  // Array-based filters for server-side filtering
  clientIds?: number[];       // Filter by client IDs
  taskNames?: string[];       // Filter by task names
  partnerCodes?: string[];    // Filter by partner codes
  managerCodes?: string[];    // Filter by manager codes
  serviceLineCodes?: string[]; // Filter by service line codes
}

/**
 * Fetch tasks list with server-side pagination and filtering
 */
export function useTasks(params: UseTasksParams = {}) {
  const {
    search = '',
    page = 1,
    limit = 50,
    serviceLine,
    subServiceLineGroup,
    includeArchived = false,
    internalOnly = false,
    clientTasksOnly = false,
    myTasksOnly = false,
    sortBy = 'updatedAt',
    sortOrder = 'desc',
    enabled = true,
    clientIds,
    taskNames,
    partnerCodes,
    managerCodes,
    serviceLineCodes,
  } = params;

  return useQuery<TasksResponse>({
    queryKey: taskListKeys.list({
      search,
      page,
      limit,
      serviceLine,
      subServiceLineGroup,
      includeArchived,
      internalOnly,
      clientTasksOnly,
      myTasksOnly,
      sortBy,
      sortOrder,
      clientIds,
      taskNames,
      partnerCodes,
      managerCodes,
      serviceLineCodes,
    }),
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      if (search) searchParams.set('search', search);
      searchParams.set('page', page.toString());
      searchParams.set('limit', limit.toString());
      if (serviceLine) searchParams.set('serviceLine', serviceLine);
      if (subServiceLineGroup) searchParams.set('subServiceLineGroup', subServiceLineGroup);
      if (includeArchived) searchParams.set('includeArchived', 'true');
      if (internalOnly) searchParams.set('internalOnly', 'true');
      if (clientTasksOnly) searchParams.set('clientTasksOnly', 'true');
      if (myTasksOnly) searchParams.set('myTasksOnly', 'true');
      searchParams.set('sortBy', sortBy);
      searchParams.set('sortOrder', sortOrder);
      
      // Add array filter parameters
      if (clientIds?.length) searchParams.set('clientIds', clientIds.join(','));
      if (taskNames?.length) searchParams.set('taskNames', taskNames.join(','));
      if (partnerCodes?.length) searchParams.set('partnerCodes', partnerCodes.join(','));
      if (managerCodes?.length) searchParams.set('managerCodes', managerCodes.join(','));
      if (serviceLineCodes?.length) searchParams.set('serviceLineCodes', serviceLineCodes.join(','));
      
      const url = `/api/tasks?${searchParams.toString()}`;
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch tasks');
      
      const result = await response.json();
      return result.success ? result.data : result;
    },
    enabled,
    staleTime: 10 * 60 * 1000, // 10 minutes - aligned with backend cache (increased from 5)
    gcTime: 15 * 60 * 1000, // 15 minutes cache retention (increased from 10)
    refetchOnMount: true, // Refetch if data is stale (after invalidation)
    refetchOnWindowFocus: false, // Don't refetch on window focus
    refetchOnReconnect: false, // Don't refetch on reconnect
    placeholderData: (previousData) => previousData, // Keep previous data while fetching
  });
}

/**
 * Prefetch tasks for a service line
 * Useful for optimistic navigation
 */
export function usePrefetchTasks(serviceLine?: string, clientTasksOnly = false) {
  const queryClient = useQueryClient();
  
  return () => {
    queryClient.prefetchQuery({
      queryKey: taskListKeys.list({ serviceLine, includeArchived: false, clientTasksOnly }),
      queryFn: async () => {
        const params = new URLSearchParams();
        if (serviceLine) params.set('serviceLine', serviceLine);
        if (clientTasksOnly) params.set('clientTasksOnly', 'true');
        
        const url = `/api/tasks${params.toString() ? `?${params.toString()}` : ''}`;
        const response = await fetch(url);
        if (!response.ok) throw new Error('Failed to fetch tasks');
        
        const result = await response.json();
        const data = result.success ? result.data : result;
        return Array.isArray(data) ? data : [];
      },
      staleTime: 3 * 60 * 1000,
    });
  };
}

// Import from react-query for prefetch hook
import { useQueryClient } from '@tanstack/react-query';


