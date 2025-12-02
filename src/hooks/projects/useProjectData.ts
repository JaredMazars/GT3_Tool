'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { MappedData, Project } from '@/types';

// Query Keys
export const projectKeys = {
  all: ['projects'] as const,
  detail: (id: string) => [...projectKeys.all, id] as const,
  mappedAccounts: (id: string) => [...projectKeys.detail(id), 'mapped-accounts'] as const,
  taxAdjustments: (id: string) => [...projectKeys.detail(id), 'tax-adjustments'] as const,
  taxCalculation: (id: string) => [...projectKeys.detail(id), 'tax-calculation'] as const,
};

/**
 * Normalize project data from API response
 * Transforms Prisma relation names to consistent lowercase naming
 */
function normalizeProjectData(data: unknown): Project {
  if (!data || typeof data !== 'object') return data as unknown as Project;
  
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
  
  return normalized as unknown as Project;
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
 * Fetch project details
 */
export function useProject(projectId: string) {
  return useQuery<Project>({
    queryKey: projectKeys.detail(projectId),
    queryFn: async () => {
      const response = await fetch(`/api/projects/${projectId}`);
      if (!response.ok) throw new Error('Failed to fetch project');
      const result = await response.json();
      const data = result.success ? result.data : result;
      return normalizeProjectData(data);
    },
    enabled: !!projectId,
  });
}

/**
 * Fetch mapped accounts for a project
 */
export function useMappedAccounts(projectId: string) {
  return useQuery<MappedData[]>({
    queryKey: projectKeys.mappedAccounts(projectId),
    queryFn: async () => {
      const response = await fetch(`/api/projects/${projectId}/mapped-accounts`);
      if (!response.ok) throw new Error('Failed to fetch mapped accounts');
      const result = await response.json();
      const data = result.success ? result.data : result;
      return Array.isArray(data) ? data : [];
    },
    enabled: !!projectId,
  });
}

/**
 * Update a mapped account
 */
export function useUpdateMappedAccount(projectId: string) {
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
        `/api/projects/${projectId}/mapped-accounts/${accountId}`,
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
      queryClient.invalidateQueries({ queryKey: projectKeys.mappedAccounts(projectId) });
    },
  });
}

/**
 * Fetch tax adjustments for a project
 */
export function useTaxAdjustments(projectId: string, status?: string) {
  return useQuery<TaxAdjustment[]>({
    queryKey: status
      ? [...projectKeys.taxAdjustments(projectId), status]
      : projectKeys.taxAdjustments(projectId),
    queryFn: async () => {
      const url = status
        ? `/api/projects/${projectId}/tax-adjustments?status=${status}`
        : `/api/projects/${projectId}/tax-adjustments`;
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch tax adjustments');
      const result = await response.json();
      return result.success ? result.data : result;
    },
    enabled: !!projectId,
  });
}

/**
 * Fetch tax calculation data
 */
export function useTaxCalculation(projectId: string) {
  return useQuery<TaxCalculationData>({
    queryKey: projectKeys.taxCalculation(projectId),
    queryFn: async () => {
      const response = await fetch(`/api/projects/${projectId}/tax-calculation`);
      if (!response.ok) throw new Error('Failed to fetch tax calculation');
      const result = await response.json();
      return result.data || result;
    },
    enabled: !!projectId,
  });
}

/**
 * Fetch a single tax adjustment
 */
export function useTaxAdjustment(projectId: string, adjustmentId: string) {
  return useQuery({
    queryKey: [...projectKeys.taxAdjustments(projectId), adjustmentId] as const,
    queryFn: async () => {
      const response = await fetch(`/api/projects/${projectId}/tax-adjustments/${adjustmentId}`);
      if (!response.ok) throw new Error('Failed to fetch adjustment');
      const result = await response.json();
      return result.success ? result.data : result;
    },
    enabled: !!projectId && !!adjustmentId,
  });
}

/**
 * Update tax adjustment status with optimistic updates
 */
export function useUpdateTaxAdjustment(projectId: string) {
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
        `/api/projects/${projectId}/tax-adjustments/${adjustmentId}`,
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
      await queryClient.cancelQueries({ queryKey: projectKeys.taxAdjustments(projectId) });

      // Snapshot previous value for rollback
      const previousAdjustments = queryClient.getQueryData(projectKeys.taxAdjustments(projectId));

      // Optimistically update cache
      queryClient.setQueryData(projectKeys.taxAdjustments(projectId), (old: unknown) => {
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
          projectKeys.taxAdjustments(projectId),
          context.previousAdjustments
        );
      }
    },
    // Refetch in background to ensure data consistency
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: projectKeys.taxAdjustments(projectId) });
    },
  });
}

/**
 * Update tax adjustment details (full update)
 */
export function useUpdateAdjustmentDetails(projectId: string, adjustmentId: string) {
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
        `/api/projects/${projectId}/tax-adjustments/${adjustmentId}`,
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
      queryClient.invalidateQueries({ queryKey: projectKeys.taxAdjustments(projectId) });
      queryClient.invalidateQueries({ 
        queryKey: [...projectKeys.taxAdjustments(projectId), adjustmentId] 
      });
    },
  });
}

/**
 * Delete tax adjustment
 */
export function useDeleteTaxAdjustment(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (adjustmentId: number) => {
      const response = await fetch(
        `/api/projects/${projectId}/tax-adjustments/${adjustmentId}`,
        {
          method: 'DELETE',
        }
      );
      if (!response.ok) throw new Error('Failed to delete adjustment');
      return response.json();
    },
    onSuccess: () => {
      // Invalidate tax adjustments list
      queryClient.invalidateQueries({ queryKey: projectKeys.taxAdjustments(projectId) });
    },
  });
}

/**
 * Generate AI tax adjustment suggestions
 */
export function useGenerateTaxSuggestions(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const response = await fetch(
        `/api/projects/${projectId}/tax-adjustments/suggestions`,
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
      queryClient.invalidateQueries({ queryKey: projectKeys.taxAdjustments(projectId) });
    },
  });
}

/**
 * Fetch trial balance data for a project
 */
export function useTrialBalance(projectId: string) {
  return useQuery({
    queryKey: [...projectKeys.detail(projectId), 'trial-balance'] as const,
    queryFn: async () => {
      const response = await fetch(`/api/projects/${projectId}/trial-balance`);
      if (!response.ok) throw new Error('Failed to fetch trial balance');
      const result = await response.json();
      return result.success ? result.data : result;
    },
    enabled: !!projectId,
  });
}

