/**
 * BD Activities React Query Hooks
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type {
  CreateBDActivityInput,
  UpdateBDActivityInput,
  BDActivityFiltersInput,
} from '@/lib/validation/schemas';

/**
 * Fetch activities with filters
 */
export function useActivities(filters: BDActivityFiltersInput = { page: 1, pageSize: 50 }) {
  return useQuery({
    queryKey: ['bd-activities', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params.append(key, String(value));
        }
      });

      const res = await fetch(`/api/bd/activities?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch activities');
      const data = await res.json();
      return data.data;
    },
  });
}

/**
 * Fetch single activity by ID
 */
export function useActivity(id: number | undefined) {
  return useQuery({
    queryKey: ['bd-activity', id],
    queryFn: async () => {
      if (!id) throw new Error('Activity ID is required');
      const res = await fetch(`/api/bd/activities/${id}`);
      if (!res.ok) throw new Error('Failed to fetch activity');
      const data = await res.json();
      return data.data;
    },
    enabled: !!id,
  });
}

/**
 * Create activity mutation
 */
export function useCreateActivity() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateBDActivityInput) => {
      const res = await fetch('/api/bd/activities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to create activity');
      const result = await res.json();
      return result.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['bd-activities'] });
      queryClient.invalidateQueries({ queryKey: ['bd-opportunity', variables.opportunityId] });
    },
  });
}

/**
 * Update activity mutation
 */
export function useUpdateActivity(id: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: UpdateBDActivityInput) => {
      const res = await fetch(`/api/bd/activities/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to update activity');
      const result = await res.json();
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bd-activity', id] });
      queryClient.invalidateQueries({ queryKey: ['bd-activities'] });
    },
  });
}

/**
 * Delete activity mutation
 */
export function useDeleteActivity() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/bd/activities/${id}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to delete activity');
      const result = await res.json();
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bd-activities'] });
    },
  });
}


