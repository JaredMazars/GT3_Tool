/**
 * Hook for fetching user's primary workspace
 * Returns the service line + sub-service line group where user has most tasks
 */

import { useQuery } from '@tanstack/react-query';

interface PrimaryWorkspace {
  serviceLine: string;
  subServiceLineGroup: string;
  taskCount: number;
}

/**
 * Fetch user's primary workspace from API
 */
export function usePrimaryWorkspace() {
  return useQuery<PrimaryWorkspace>({
    queryKey: ['primary-workspace'],
    queryFn: async () => {
      const response = await fetch('/api/workspace/primary');
      if (!response.ok) {
        throw new Error('Failed to fetch primary workspace');
      }
      const result = await response.json();
      return result.success ? result.data : result;
    },
    staleTime: 10 * 60 * 1000, // 10 minutes - matches backend cache
    gcTime: 15 * 60 * 1000, // 15 minutes cache retention
    refetchOnMount: false, // Don't refetch on mount if data exists
    refetchOnWindowFocus: false, // Don't refetch on window focus
    refetchOnReconnect: false, // Don't refetch on reconnect
    retry: 2, // Retry failed requests twice
  });
}
