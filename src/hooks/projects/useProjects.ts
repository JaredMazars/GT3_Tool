'use client';

import { useQuery } from '@tanstack/react-query';

// Query Keys - extend existing projectKeys from useProjectData
export const projectListKeys = {
  all: ['projects'] as const,
  list: (serviceLine?: string, includeArchived?: boolean, internalOnly?: boolean, clientProjectsOnly?: boolean) => 
    [...projectListKeys.all, 'list', serviceLine, includeArchived, internalOnly, clientProjectsOnly] as const,
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
  Client: {
    id: number;
    clientNameFull: string | null;
    clientCode: string | null;
  } | null;
  _count: {
    mappings: number;
    taxAdjustments: number;
  };
}

/**
 * Fetch projects list with optional service line filter
 */
export function useProjects(serviceLine?: string, includeArchived = false, internalOnly = false, clientProjectsOnly = false) {
  return useQuery<ProjectListItem[]>({
    queryKey: projectListKeys.list(serviceLine, includeArchived, internalOnly, clientProjectsOnly),
    queryFn: async () => {
      const params = new URLSearchParams();
      if (serviceLine) params.set('serviceLine', serviceLine);
      if (includeArchived) params.set('includeArchived', 'true');
      if (internalOnly) params.set('internalOnly', 'true');
      if (clientProjectsOnly) params.set('clientProjectsOnly', 'true');
      
      const url = `/api/projects${params.toString() ? `?${params.toString()}` : ''}`;
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch projects');
      
      const result = await response.json();
      const data = result.success ? result.data : result;
      return Array.isArray(data) ? data : [];
    },
    staleTime: 3 * 60 * 1000, // 3 minutes - projects change more frequently
    gcTime: 10 * 60 * 1000, // 10 minutes cache retention
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

