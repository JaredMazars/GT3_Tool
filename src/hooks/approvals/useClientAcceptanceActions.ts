/**
 * Client Acceptance Approval Hooks
 * Hooks for approving and rejecting client acceptances
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';

interface ApproveClientAcceptanceParams {
  stepId: number;
  comment?: string;
}

interface RejectClientAcceptanceParams {
  stepId: number;
  comment: string;
}

/**
 * Hook to approve a client acceptance
 */
export function useApproveClientAcceptance() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ stepId, comment }: ApproveClientAcceptanceParams) => {
      const response = await fetch(`/api/approvals/steps/${stepId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ comment }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to approve client acceptance');
      }

      return response.json();
    },
    onSuccess: () => {
      // Invalidate all relevant caches (React Query only - server cache is handled by API)
      queryClient.invalidateQueries({ queryKey: ['approvals'] });
      queryClient.invalidateQueries({ queryKey: ['client', 'acceptance', 'status'] });
      queryClient.invalidateQueries({ queryKey: ['clients'] });
    },
  });
}

/**
 * Hook to reject a client acceptance
 */
export function useRejectClientAcceptance() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ stepId, comment }: RejectClientAcceptanceParams) => {
      const response = await fetch(`/api/approvals/steps/${stepId}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ comment }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to reject client acceptance');
      }

      return response.json();
    },
    onSuccess: () => {
      // Invalidate all relevant caches (React Query only - server cache is handled by API)
      queryClient.invalidateQueries({ queryKey: ['approvals'] });
      queryClient.invalidateQueries({ queryKey: ['client', 'acceptance', 'status'] });
      queryClient.invalidateQueries({ queryKey: ['clients'] });
    },
  });
}
