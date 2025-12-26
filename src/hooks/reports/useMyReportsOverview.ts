/**
 * React Query hook for My Reports Overview data
 * 
 * Fetches monthly financial metrics over a rolling 24-month period
 */

import { useQuery } from '@tanstack/react-query';
import type { ApiResponse, MyReportsOverviewData } from '@/types/api';

export interface UseMyReportsOverviewParams {
  enabled?: boolean;
}

/**
 * Fetch overview report data
 */
export function useMyReportsOverview(params: UseMyReportsOverviewParams = {}) {
  const { enabled = true } = params;

  return useQuery({
    queryKey: ['my-reports', 'overview'],
    queryFn: async () => {
      const response = await fetch('/api/my-reports/overview');
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to fetch overview report');
      }

      const result: ApiResponse<MyReportsOverviewData> = await response.json();
      
      if (!result.success || !result.data) {
        throw new Error(result.error || 'Invalid response from server');
      }

      return result.data;
    },
    enabled,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
}

