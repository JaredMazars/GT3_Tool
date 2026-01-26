'use client';

import { useQuery } from '@tanstack/react-query';

export interface StandardTask {
  id: number;
  GSStdTaskID: string;
  StdTaskCode: string;
  StdTaskDesc: string;
  ServLineCode: string;
  createdAt: string;
  updatedAt: string;
}

export const standardTaskKeys = {
  all: ['standard-tasks'] as const,
  byServiceLine: (serviceLine: string) => ['standard-tasks', serviceLine] as const,
};

/**
 * Fetch standard tasks for a specific service line
 */
export function useStandardTasks(serviceLine: string | null | undefined, enabled = true) {
  return useQuery<StandardTask[], Error>({
    queryKey: standardTaskKeys.byServiceLine(serviceLine || ''),
    queryFn: async () => {
      if (!serviceLine) {
        return [];
      }

      const response = await fetch(`/api/standard-tasks?serviceLine=${encodeURIComponent(serviceLine)}`);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch standard tasks');
      }

      const result = await response.json();
      return result.success ? result.data : result;
    },
    enabled: enabled && !!serviceLine,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}


























