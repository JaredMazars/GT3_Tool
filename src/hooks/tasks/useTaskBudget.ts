import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { TaskBudgetData, BudgetDisbursement, BudgetFee } from '@/types/budget';

/**
 * Hook to fetch task budget data
 */
export function useTaskBudget(taskId: number) {
  return useQuery({
    queryKey: ['tasks', taskId, 'budget'],
    queryFn: async () => {
      const response = await fetch(`/api/tasks/${taskId}/budget`);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch budget');
      }
      const result = await response.json();
      return result.data as TaskBudgetData;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook to add a disbursement
 */
export function useAddDisbursement(taskId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { description: string; amount: number; expectedDate: Date }) => {
      const response = await fetch(`/api/tasks/${taskId}/budget/disbursements`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to add disbursement');
      }

      const result = await response.json();
      return result.data as BudgetDisbursement;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', taskId, 'budget'] });
      queryClient.invalidateQueries({ queryKey: ['tasks', taskId] });
    },
  });
}

/**
 * Hook to update a disbursement
 */
export function useUpdateDisbursement(taskId: number, disbursementId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { description: string; amount: number; expectedDate: Date }) => {
      const response = await fetch(`/api/tasks/${taskId}/budget/disbursements/${disbursementId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update disbursement');
      }

      const result = await response.json();
      return result.data as BudgetDisbursement;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', taskId, 'budget'] });
      queryClient.invalidateQueries({ queryKey: ['tasks', taskId] });
    },
  });
}

/**
 * Hook to delete a disbursement
 */
export function useDeleteDisbursement(taskId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (disbursementId: number) => {
      const response = await fetch(`/api/tasks/${taskId}/budget/disbursements/${disbursementId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete disbursement');
      }

      const result = await response.json();
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', taskId, 'budget'] });
      queryClient.invalidateQueries({ queryKey: ['tasks', taskId] });
    },
  });
}

/**
 * Hook to add a fee
 */
export function useAddFee(taskId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { description: string; amount: number; expectedDate: Date }) => {
      const response = await fetch(`/api/tasks/${taskId}/budget/fees`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to add fee');
      }

      const result = await response.json();
      return result.data as BudgetFee;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', taskId, 'budget'] });
      queryClient.invalidateQueries({ queryKey: ['tasks', taskId] });
    },
  });
}

/**
 * Hook to update a fee
 */
export function useUpdateFee(taskId: number, feeId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { description: string; amount: number; expectedDate: Date }) => {
      const response = await fetch(`/api/tasks/${taskId}/budget/fees/${feeId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update fee');
      }

      const result = await response.json();
      return result.data as BudgetFee;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', taskId, 'budget'] });
      queryClient.invalidateQueries({ queryKey: ['tasks', taskId] });
    },
  });
}

/**
 * Hook to delete a fee
 */
export function useDeleteFee(taskId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (feeId: number) => {
      const response = await fetch(`/api/tasks/${taskId}/budget/fees/${feeId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete fee');
      }

      const result = await response.json();
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', taskId, 'budget'] });
      queryClient.invalidateQueries({ queryKey: ['tasks', taskId] });
    },
  });
}

/**
 * Hook to update staff allocation hours
 */
export function useUpdateAllocation(taskId: number, teamMemberId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (allocatedHours: number) => {
      const response = await fetch(
        `/api/tasks/${taskId}/team/${teamMemberId}/allocation`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ allocatedHours }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update allocation');
      }

      const result = await response.json();
      return result.data;
    },
    onSuccess: () => {
      // Invalidate budget query to refresh the display
      queryClient.invalidateQueries({ queryKey: ['tasks', taskId, 'budget'] });
      // Also invalidate task query in case it's used elsewhere
      queryClient.invalidateQueries({ queryKey: ['tasks', taskId] });
    },
  });
}
