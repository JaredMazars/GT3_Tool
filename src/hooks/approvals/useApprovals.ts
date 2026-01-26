/**
 * Approvals Hooks
 * React Query hooks for fetching user approvals
 */

import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import type { ApprovalsResponse, ApprovalsCountResponse } from '@/types/approvals';

/**
 * Fetch all pending or archived approvals for the current user
 * @param showArchived - If true, fetch archived (resolved) approvals instead of pending ones
 */
export function useApprovals(showArchived: boolean = false): UseQueryResult<ApprovalsResponse> {
  return useQuery<ApprovalsResponse>({
    queryKey: ['approvals', { archived: showArchived }],
    queryFn: async () => {
      const url = new URL('/api/approvals', window.location.origin);
      if (showArchived) {
        url.searchParams.set('archived', 'true');
      }

      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch approvals');
      }

      const data = await response.json();
      return data.data;
    },
    refetchInterval: 60000, // Refetch every 60 seconds for real-time updates
    staleTime: 30000, // Consider data stale after 30 seconds
  });
}

/**
 * Fetch just the count of pending approvals for badge display
 */
export function useApprovalsCount(): UseQueryResult<number> {
  return useQuery<number>({
    queryKey: ['approvals', 'count'],
    queryFn: async () => {
      const response = await fetch('/api/approvals', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch approvals count');
      }

      const data = await response.json();
      return data.data.totalCount as number;
    },
    refetchInterval: 60000, // Refetch every 60 seconds
    staleTime: 30000,
  });
}
