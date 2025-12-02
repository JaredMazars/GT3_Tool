/**
 * BD Opportunities React Query Hooks
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type {
  CreateBDOpportunityInput,
  UpdateBDOpportunityInput,
  MoveBDOpportunityStageInput,
  ConvertBDOpportunityInput,
  BDOpportunityFiltersInput,
} from '@/lib/validation/schemas';

/**
 * Fetch opportunities with filters
 */
export function useOpportunities(filters: BDOpportunityFiltersInput = { page: 1, pageSize: 50 }) {
  return useQuery({
    queryKey: ['bd-opportunities', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params.append(key, String(value));
        }
      });

      const res = await fetch(`/api/bd/opportunities?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch opportunities');
      const data = await res.json();
      return data.data;
    },
  });
}

/**
 * Fetch single opportunity by ID
 */
export function useOpportunity(id: number | undefined) {
  return useQuery({
    queryKey: ['bd-opportunity', id],
    queryFn: async () => {
      if (!id) throw new Error('Opportunity ID is required');
      const res = await fetch(`/api/bd/opportunities/${id}`);
      if (!res.ok) throw new Error('Failed to fetch opportunity');
      const data = await res.json();
      return data.data;
    },
    enabled: !!id,
  });
}

/**
 * Fetch pipeline view
 */
export function usePipeline(filters: { serviceLine?: string; assignedTo?: string } = {}) {
  return useQuery({
    queryKey: ['bd-pipeline', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.serviceLine) params.append('serviceLine', filters.serviceLine);
      if (filters.assignedTo) params.append('assignedTo', filters.assignedTo);

      const res = await fetch(`/api/bd/opportunities/pipeline?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch pipeline');
      const data = await res.json();
      return data.data;
    },
  });
}

/**
 * Create opportunity mutation
 */
export function useCreateOpportunity() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateBDOpportunityInput) => {
      const res = await fetch('/api/bd/opportunities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to create opportunity');
      const result = await res.json();
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bd-opportunities'] });
      queryClient.invalidateQueries({ queryKey: ['bd-pipeline'] });
    },
  });
}

/**
 * Update opportunity mutation
 */
export function useUpdateOpportunity(id: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: UpdateBDOpportunityInput) => {
      const res = await fetch(`/api/bd/opportunities/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to update opportunity');
      const result = await res.json();
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bd-opportunity', id] });
      queryClient.invalidateQueries({ queryKey: ['bd-opportunities'] });
      queryClient.invalidateQueries({ queryKey: ['bd-pipeline'] });
    },
  });
}

/**
 * Move opportunity to stage mutation
 */
export function useMoveOpportunityStage(id: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: MoveBDOpportunityStageInput) => {
      const res = await fetch(`/api/bd/opportunities/${id}/stage`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to move opportunity stage');
      const result = await res.json();
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bd-opportunity', id] });
      queryClient.invalidateQueries({ queryKey: ['bd-opportunities'] });
      queryClient.invalidateQueries({ queryKey: ['bd-pipeline'] });
    },
  });
}

/**
 * Convert opportunity to client mutation
 */
export function useConvertOpportunity(id: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: ConvertBDOpportunityInput) => {
      const res = await fetch(`/api/bd/opportunities/${id}/convert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to convert opportunity');
      const result = await res.json();
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bd-opportunity', id] });
      queryClient.invalidateQueries({ queryKey: ['bd-opportunities'] });
      queryClient.invalidateQueries({ queryKey: ['bd-pipeline'] });
      queryClient.invalidateQueries({ queryKey: ['clients'] });
    },
  });
}

/**
 * Delete opportunity mutation
 */
export function useDeleteOpportunity() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/bd/opportunities/${id}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to delete opportunity');
      const result = await res.json();
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bd-opportunities'] });
      queryClient.invalidateQueries({ queryKey: ['bd-pipeline'] });
    },
  });
}

