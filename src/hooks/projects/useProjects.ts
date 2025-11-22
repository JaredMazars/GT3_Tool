'use client';

import { useQuery } from '@tanstack/react-query';

// Query Keys - extend existing projectKeys from useProjectData
export const projectListKeys = {
  all: ['projects'] as const,
  lists: () => [...projectListKeys.all, 'list'] as const,
  list: (params: UseProjectsParams) => 
    [...projectListKeys.lists(), params] as const,
};

// Types
export interface ProjectListItem {
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
  _count: {
    mappings: number;
    taxAdjustments: number;
  };
}

export interface ProjectsResponse {
  projects: ProjectListItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface UseProjectsParams {
  search?: string;
  page?: number;
  limit?: number;
  serviceLine?: string;
  includeArchived?: boolean;
  internalOnly?: boolean;
  clientProjectsOnly?: boolean;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  enabled?: boolean;
}

/**
 * Fetch projects list with server-side pagination and filtering
 */
export function useProjects(params: UseProjectsParams = {}) {
  const {
    search = '',
    page = 1,
    limit = 50,
    serviceLine,
    includeArchived = false,
    internalOnly = false,
    clientProjectsOnly = false,
    sortBy = 'updatedAt',
    sortOrder = 'desc',
    enabled = true,
  } = params;

  return useQuery<ProjectsResponse>({
    queryKey: projectListKeys.list({
      search,
      page,
      limit,
      serviceLine,
      includeArchived,
      internalOnly,
      clientProjectsOnly,
      sortBy,
      sortOrder,
    }),
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      if (search) searchParams.set('search', search);
      searchParams.set('page', page.toString());
      searchParams.set('limit', limit.toString());
      if (serviceLine) searchParams.set('serviceLine', serviceLine);
      if (includeArchived) searchParams.set('includeArchived', 'true');
      if (internalOnly) searchParams.set('internalOnly', 'true');
      if (clientProjectsOnly) searchParams.set('clientProjectsOnly', 'true');
      searchParams.set('sortBy', sortBy);
      searchParams.set('sortOrder', sortOrder);
      
      const url = `/api/projects?${searchParams.toString()}`;
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch projects');
      
      const result = await response.json();
      return result.success ? result.data : result;
    },
    enabled,
    staleTime: 5 * 60 * 1000, // 5 minutes - standardized
    gcTime: 10 * 60 * 1000, // 10 minutes cache retention
    placeholderData: (previousData) => previousData, // Keep previous data while fetching
  });
}

/**
 * Prefetch projects for a service line
 * Useful for optimistic navigation
 */
export function usePrefetchProjects(serviceLine?: string, clientProjectsOnly = false) {
  const queryClient = useQueryClient();
  
  return () => {
    queryClient.prefetchQuery({
      queryKey: projectListKeys.list(serviceLine, false, false, clientProjectsOnly),
      queryFn: async () => {
        const params = new URLSearchParams();
        if (serviceLine) params.set('serviceLine', serviceLine);
        if (clientProjectsOnly) params.set('clientProjectsOnly', 'true');
        
        const url = `/api/projects${params.toString() ? `?${params.toString()}` : ''}`;
        const response = await fetch(url);
        if (!response.ok) throw new Error('Failed to fetch projects');
        
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

