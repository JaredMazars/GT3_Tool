'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { MappedData, Task } from '@/types';

// Query Keys
export const taskKeys = {
  all: ['tasks'] as const,
  detail: (id: string) => [...taskKeys.all, id] as const,
  mappedAccounts: (id: string) => [...taskKeys.detail(id), 'mapped-accounts'] as const,
  taxAdjustments: (id: string) => [...taskKeys.detail(id), 'tax-adjustments'] as const,
  taxCalculation: (id: string) => [...taskKeys.detail(id), 'tax-calculation'] as const,
};

/**
 * Normalize task data from API response
 * Transforms Prisma relation names to consistent lowercase naming
 */
function normalizeTaskData(data: unknown): Task {
  if (!data || typeof data !== 'object') return data as unknown as Task;
  
  const normalized = { ...(data as Record<string, unknown>) };
  
  // Transform Client → client (Prisma relation to lowercase)
  if ('Client' in normalized) {
    normalized.client = normalized.Client;
    delete normalized.Client;
  }
  
  // Transform _count field names from Prisma model names to friendly names
  if ('_count' in normalized && normalized._count && typeof normalized._count === 'object') {
    const count = normalized._count as Record<string, unknown>;
    const newCount: Record<string, unknown> = {};
    
    if ('MappedAccount' in count && count.MappedAccount !== undefined) {
      newCount.mappings = count.MappedAccount;
    }
    if ('TaxAdjustment' in count && count.TaxAdjustment !== undefined) {
      newCount.taxAdjustments = count.TaxAdjustment;
    }
    // Preserve any other count fields that may already be normalized
    Object.keys(count).forEach(key => {
      if (key !== 'MappedAccount' && key !== 'TaxAdjustment') {
        newCount[key] = count[key];
      }
    });
    normalized._count = newCount;
  }
  
  return normalized as unknown as Task;
}

interface TaxAdjustment {
  id: number;
  type: 'DEBIT' | 'CREDIT' | 'ALLOWANCE' | 'RECOUPMENT';
  description: string;
  amount: number;
  status: string;
  sarsSection?: string;
  confidenceScore?: number;
  notes?: string;
}

interface TaxCalculationData {
  netProfit: number;
}

// Hooks

/**
 * Fetch task details
 */
export function useTask(taskId: string) {
  return useQuery<Task>({
    queryKey: taskKeys.detail(taskId),
    queryFn: async () => {
      const response = await fetch(`/api/tasks/${taskId}`);
      if (!response.ok) throw new Error('Failed to fetch task');
      const result = await response.json();
      const data = result.success ? result.data : result;
      return normalizeTaskData(data);
    },
    enabled: !!taskId,
    staleTime: 5 * 60 * 1000, // 5 minutes - aligned with Redis cache TTL
    gcTime: 10 * 60 * 1000, // 10 minutes cache retention
    refetchOnMount: true, // Refetch if data is stale (after invalidation)
    refetchOnWindowFocus: false, // Don't refetch on window focus
    refetchOnReconnect: false, // Don't refetch on reconnect
    placeholderData: (previousData) => previousData, // Keep previous data while fetching
  });
}

/**
 * Fetch mapped accounts for a task
 */
export function useMappedAccounts(taskId: string) {
  return useQuery<MappedData[]>({
    queryKey: taskKeys.mappedAccounts(taskId),
    queryFn: async () => {
      const response = await fetch(`/api/tasks/${taskId}/mapped-accounts`);
      if (!response.ok) throw new Error('Failed to fetch mapped accounts');
      const result = await response.json();
      const data = result.success ? result.data : result;
      return Array.isArray(data) ? data : [];
    },
    enabled: !!taskId,
    staleTime: 3 * 60 * 1000, // 3 minutes - mapped accounts change more frequently
    gcTime: 5 * 60 * 1000, // 5 minutes cache retention
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    placeholderData: (previousData) => previousData,
  });
}

/**
 * Update a mapped account
 */
export function useUpdateMappedAccount(taskId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      accountId,
      sarsItem,
      section,
      subsection,
    }: {
      accountId: number;
      sarsItem: string;
      section: string;
      subsection: string;
    }) => {
      const response = await fetch(
        `/api/tasks/${taskId}/mapped-accounts/${accountId}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sarsItem, section, subsection }),
        }
      );
      if (!response.ok) throw new Error('Failed to update mapping');
      return response.json();
    },
    onSuccess: () => {
      // Invalidate and refetch mapped accounts
      queryClient.invalidateQueries({ queryKey: taskKeys.mappedAccounts(taskId) });
    },
  });
}

/**
 * Fetch tax adjustments for a task
 */
export function useTaxAdjustments(taskId: string, status?: string) {
  return useQuery<TaxAdjustment[]>({
    queryKey: status
      ? [...taskKeys.taxAdjustments(taskId), status]
      : taskKeys.taxAdjustments(taskId),
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
    staleTime: 3 * 60 * 1000, // 3 minutes - tax adjustments change frequently
    gcTime: 5 * 60 * 1000, // 5 minutes cache retention
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    placeholderData: (previousData) => previousData,
  });
}

/**
 * Fetch tax calculation data
 */
export function useTaxCalculation(taskId: string) {
  return useQuery<TaxCalculationData>({
    queryKey: taskKeys.taxCalculation(taskId),
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
 * Fetch a single tax adjustment
 */
export function useTaxAdjustment(taskId: string, adjustmentId: string) {
  return useQuery({
    queryKey: [...taskKeys.taxAdjustments(taskId), adjustmentId] as const,
    queryFn: async () => {
      const response = await fetch(`/api/tasks/${taskId}/tax-adjustments/${adjustmentId}`);
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
    // Optimistic update: Update UI immediately before server responds
    onMutate: async ({ adjustmentId, status }) => {
      // Cancel outgoing refetches to avoid overwriting optimistic update
      await queryClient.cancelQueries({ queryKey: taskKeys.taxAdjustments(taskId) });

      // Snapshot previous value for rollback
      const previousAdjustments = queryClient.getQueryData(taskKeys.taxAdjustments(taskId));

      // Optimistically update cache
      queryClient.setQueryData(taskKeys.taxAdjustments(taskId), (old: unknown) => {
        if (!old || !Array.isArray(old)) return old;
        return old.map((adj: TaxAdjustment) =>
          adj.id === adjustmentId ? { ...adj, status } : adj
        );
      });

      // Return context with snapshot for rollback
      return { previousAdjustments };
    },
    // Rollback on error
    onError: (err, variables, context) => {
      if (context?.previousAdjustments) {
        queryClient.setQueryData(
          taskKeys.taxAdjustments(taskId),
          context.previousAdjustments
        );
      }
    },
    // Refetch in background to ensure data consistency
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: taskKeys.taxAdjustments(taskId) });
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
      // Invalidate both the list and the individual adjustment
      queryClient.invalidateQueries({ queryKey: taskKeys.taxAdjustments(taskId) });
      queryClient.invalidateQueries({ 
        queryKey: [...taskKeys.taxAdjustments(taskId), adjustmentId] 
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
      // Invalidate tax adjustments list
      queryClient.invalidateQueries({ queryKey: taskKeys.taxAdjustments(taskId) });
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
      // Invalidate tax adjustments to show new suggestions
      queryClient.invalidateQueries({ queryKey: taskKeys.taxAdjustments(taskId) });
    },
  });
}

/**
 * Fetch trial balance data for a task
 */
export function useTrialBalance(taskId: string) {
  return useQuery({
    queryKey: [...taskKeys.detail(taskId), 'trial-balance'] as const,
    queryFn: async () => {
      const response = await fetch(`/api/tasks/${taskId}/trial-balance`);
      if (!response.ok) throw new Error('Failed to fetch trial balance');
      const result = await response.json();
      return result.success ? result.data : result;
    },
    enabled: !!taskId,
  });
}


