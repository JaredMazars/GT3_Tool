'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// Query Keys
export const taxCalculationKeys = {
  all: (taskId: string) => ['tasks', taskId, 'tax-calculation'] as const,
  calculation: (taskId: string) => [...taxCalculationKeys.all(taskId), 'data'] as const,
  adjustments: (taskId: string) => [...taxCalculationKeys.all(taskId), 'adjustments'] as const,
  adjustment: (taskId: string, adjustmentId: string) =>
    [...taxCalculationKeys.adjustments(taskId), adjustmentId] as const,
};

export interface TaxAdjustment {
  id: number;
  type: 'DEBIT' | 'CREDIT' | 'ALLOWANCE' | 'RECOUPMENT';
  description: string;
  amount: number;
  status: string;
  sarsSection?: string;
  confidenceScore?: number;
  notes?: string;
}

export interface TaxCalculationData {
  netProfit: number;
}

/**
 * Fetch tax calculation data
 */
export function useTaxCalculation(taskId: string) {
  return useQuery<TaxCalculationData>({
    queryKey: taxCalculationKeys.calculation(taskId),
    queryFn: async () => {
      const response = await fetch(`/api/tasks/${taskId}/tax-calculation`);
      if (!response.ok) throw new Error('Failed to fetch tax calculation');
      const result = await response.json();
      return result.data || result;
    },
    enabled: !!taskId,
  });
}

/**
 * Fetch tax adjustments for a task
 */
export function useTaxAdjustments(taskId: string, status?: string) {
  return useQuery<TaxAdjustment[]>({
    queryKey: status
      ? [...taxCalculationKeys.adjustments(taskId), status]
      : taxCalculationKeys.adjustments(taskId),
    queryFn: async () => {
      const url = status
        ? `/api/tasks/${taskId}/tax-adjustments?status=${status}`
        : `/api/tasks/${taskId}/tax-adjustments`;
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch tax adjustments');
      const result = await response.json();
      return result.success ? result.data : result;
    },
    enabled: !!taskId,
    staleTime: 3 * 60 * 1000, // 3 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    placeholderData: (previousData) => previousData,
  });
}

/**
 * Fetch a single tax adjustment
 */
export function useTaxAdjustment(taskId: string, adjustmentId: string) {
  return useQuery({
    queryKey: taxCalculationKeys.adjustment(taskId, adjustmentId),
    queryFn: async () => {
      const response = await fetch(
        `/api/tasks/${taskId}/tax-adjustments/${adjustmentId}`
      );
      if (!response.ok) throw new Error('Failed to fetch adjustment');
      const result = await response.json();
      return result.success ? result.data : result;
    },
    enabled: !!taskId && !!adjustmentId,
  });
}

/**
 * Update tax adjustment status with optimistic updates
 */
export function useUpdateTaxAdjustment(taskId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      adjustmentId,
      status,
    }: {
      adjustmentId: number;
      status: string;
    }) => {
      const response = await fetch(
        `/api/tasks/${taskId}/tax-adjustments/${adjustmentId}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status }),
        }
      );
      if (!response.ok) throw new Error('Failed to update adjustment');
      return response.json();
    },
    // Optimistic update
    onMutate: async ({ adjustmentId, status }) => {
      await queryClient.cancelQueries({
        queryKey: taxCalculationKeys.adjustments(taskId),
      });

      const previousAdjustments = queryClient.getQueryData(
        taxCalculationKeys.adjustments(taskId)
      );

      queryClient.setQueryData(
        taxCalculationKeys.adjustments(taskId),
        (old: unknown) => {
          if (!old || !Array.isArray(old)) return old;
          return old.map((adj: TaxAdjustment) =>
            adj.id === adjustmentId ? { ...adj, status } : adj
          );
        }
      );

      return { previousAdjustments };
    },
    onError: (err, variables, context) => {
      if (context?.previousAdjustments) {
        queryClient.setQueryData(
          taxCalculationKeys.adjustments(taskId),
          context.previousAdjustments
        );
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: taxCalculationKeys.adjustments(taskId),
      });
    },
  });
}

/**
 * Update tax adjustment details (full update)
 */
export function useUpdateAdjustmentDetails(taskId: string, adjustmentId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      type?: string;
      description?: string;
      amount?: number;
      sarsSection?: string;
      notes?: string;
      status?: string;
    }) => {
      const response = await fetch(
        `/api/tasks/${taskId}/tax-adjustments/${adjustmentId}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        }
      );
      if (!response.ok) throw new Error('Failed to update adjustment');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: taxCalculationKeys.adjustments(taskId),
      });
      queryClient.invalidateQueries({
        queryKey: taxCalculationKeys.adjustment(taskId, adjustmentId),
      });
    },
  });
}

/**
 * Delete tax adjustment
 */
export function useDeleteTaxAdjustment(taskId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (adjustmentId: number) => {
      const response = await fetch(
        `/api/tasks/${taskId}/tax-adjustments/${adjustmentId}`,
        {
          method: 'DELETE',
        }
      );
      if (!response.ok) throw new Error('Failed to delete adjustment');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: taxCalculationKeys.adjustments(taskId),
      });
    },
  });
}

/**
 * Generate AI tax adjustment suggestions
 */
export function useGenerateTaxSuggestions(taskId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const response = await fetch(
        `/api/tasks/${taskId}/tax-adjustments/suggestions`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ useAI: true, autoSave: true }),
        }
      );
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate suggestions');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: taxCalculationKeys.adjustments(taskId),
      });
    },
  });
}







































