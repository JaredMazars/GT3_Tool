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
  projectType: string;
  serviceLine: string;
  status: string;
  archived: boolean;
  clientId: number | null;
  taxYear: number | null;
  createdAt: string;
  updatedAt: string;
  client?: {
    id: number;
    clientNameFull: string | null;
    clientCode: string | null;
  } | null;
  canAccess?: boolean; // Whether user can access task details
  userRole?: string | null; // User's role on task (if team member)
  _count: {
    mappings: number;
    taxAdjustments: number;
  };
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
  limit?: number;
  serviceLine?: string;
  subServiceLineGroup?: string;
  includeArchived?: boolean;
  internalOnly?: boolean;
  clientTasksOnly?: boolean;
  myTasksOnly?: boolean;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  enabled?: boolean;
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
      
      const url = `/api/tasks?${searchParams.toString()}`;
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch tasks');
      
      const result = await response.json();
      return result.success ? result.data : result;
    },
    enabled,
    staleTime: 5 * 60 * 1000, // 5 minutes - data stays fresh
    gcTime: 10 * 60 * 1000, // 10 minutes cache retention
    refetchOnMount: false, // Don't refetch if data is fresh
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


