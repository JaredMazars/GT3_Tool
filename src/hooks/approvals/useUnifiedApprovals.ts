/**
 * Unified Approvals Hook
 * React Query hook for the generic approval system
 */

import { useQuery, useMutation, useQueryClient, type UseQueryResult } from '@tanstack/react-query';
import type { UserApprovalsResponse } from '@/types/approval';

/**
 * Fetch all pending approvals for the current user using the unified approval system
 */
export function useUnifiedApprovals(): UseQueryResult<UserApprovalsResponse> {
  return useQuery<UserApprovalsResponse>({
    queryKey: ['unified-approvals'],
    queryFn: async () => {
      const response = await fetch('/api/approvals/unified', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch unified approvals');
      }

      const data = await response.json();
      return data.data;
    },
    refetchInterval: 60000, // Refetch every 60 seconds
    staleTime: 30000,
  });
}

/**
 * Approve an approval step
 */
export function useApproveStep() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ stepId, comment }: { stepId: number; comment?: string }) => {
      const response = await fetch(`/api/approvals/${0}/steps/${stepId}/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ comment }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'Failed to approve step');
      }

      return response.json();
    },
    onSuccess: () => {
      // Invalidate approvals queries
      queryClient.invalidateQueries({ queryKey: ['unified-approvals'] });
      queryClient.invalidateQueries({ queryKey: ['approvals'] });
    },
  });
}

/**
 * Reject an approval step
 */
export function useRejectStep() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ stepId, comment }: { stepId: number; comment: string }) => {
      const response = await fetch(`/api/approvals/${0}/steps/${stepId}/reject`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ comment }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'Failed to reject step');
      }

      return response.json();
    },
    onSuccess: () => {
      // Invalidate approvals queries
      queryClient.invalidateQueries({ queryKey: ['unified-approvals'] });
      queryClient.invalidateQueries({ queryKey: ['approvals'] });
    },
  });
}
