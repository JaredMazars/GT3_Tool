'use client';

import { useQuery } from '@tanstack/react-query';

// Query Keys (v2: includes partner/manager tasks in myTasks count)
export const workspaceCountsKeys = {
  all: ['workspace-counts', 'v2'] as const,
  counts: (serviceLine: string, subServiceLineGroup: string) => 
    [...workspaceCountsKeys.all, serviceLine, subServiceLineGroup] as const,
};

// Types
export interface WorkspaceCounts {
  groups: number;
  clients: number;
  tasks: number;
  myTasks: number;
}

export interface UseWorkspaceCountsParams {
  serviceLine: string;
  subServiceLineGroup: string;
  enabled?: boolean;
}

/**
 * Fetch workspace counts (groups, clients, tasks, myTasks) for a specific service line and sub-service line group
 * This provides lightweight count-only queries for displaying badge counts without fetching full data
 */
export function useWorkspaceCounts(params: UseWorkspaceCountsParams) {
  const {
    serviceLine,
    subServiceLineGroup,
    enabled = true,
  } = params;

  return useQuery<WorkspaceCounts>({
    queryKey: workspaceCountsKeys.counts(serviceLine, subServiceLineGroup),
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      searchParams.set('serviceLine', serviceLine);
      searchParams.set('subServiceLineGroup', subServiceLineGroup);
      
      const url = `/api/workspace-counts?${searchParams.toString()}`;
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error('Failed to fetch workspace counts');
      }
      
      const result = await response.json();
      return result.success ? result.data : result;
    },
    enabled: enabled && !!serviceLine && !!subServiceLineGroup,
    staleTime: 30 * 60 * 1000, // 30 minutes - counts change infrequently (increased from 5 min)
    gcTime: 45 * 60 * 1000, // 45 minutes cache retention (increased from 10 min)
    refetchOnMount: false, // Don't refetch if data is fresh
    refetchOnWindowFocus: false, // Don't refetch on window focus (changed from true for performance)
    refetchOnReconnect: false, // Don't refetch on reconnect
    placeholderData: (previousData) => previousData, // Keep previous data while fetching
  });
}

























