'use client';

import { useQuery } from '@tanstack/react-query';

// Query Keys
export const groupServiceLineKeys = {
  all: ['group-service-lines'] as const,
  detail: (groupCode: string) => [...groupServiceLineKeys.all, groupCode] as const,
};

// Types
export interface GroupServiceLine {
  code: string;
  name: string;
  taskCount: number;
}

interface GroupServiceLinesResponse {
  serviceLines: GroupServiceLine[];
}

/**
 * Fetch service line task counts for a specific group
 * Used to populate service line tabs without fetching all tasks
 */
export function useGroupServiceLines(groupCode: string, enabled = true) {
  return useQuery<GroupServiceLinesResponse>({
    queryKey: groupServiceLineKeys.detail(groupCode),
    queryFn: async () => {
      const url = `/api/groups/${encodeURIComponent(groupCode)}/service-lines`;
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch group service lines');
      
      const result = await response.json();
      return result.success ? result.data : result;
    },
    enabled: enabled && !!groupCode,
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 15 * 60 * 1000, // 15 minutes cache retention
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
}



































