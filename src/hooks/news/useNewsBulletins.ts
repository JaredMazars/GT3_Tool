/**
 * News Bulletins React Query Hooks
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type {
  CreateNewsBulletinInput,
  UpdateNewsBulletinInput,
  NewsBulletinFiltersInput,
} from '@/lib/validation/schemas';
import { NewsBulletin } from '@/types';

interface BulletinsResponse {
  bulletins: NewsBulletin[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/**
 * Fetch bulletins with filters
 */
export function useNewsBulletins(filters: Partial<NewsBulletinFiltersInput> = {}) {
  return useQuery({
    queryKey: ['news-bulletins', filters],
    queryFn: async (): Promise<BulletinsResponse> => {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params.append(key, String(value));
        }
      });

      const res = await fetch(`/api/news?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch bulletins');
      const data = await res.json();
      return data.data;
    },
  });
}

/**
 * Fetch single bulletin by ID
 */
export function useNewsBulletin(id: number | undefined) {
  return useQuery({
    queryKey: ['news-bulletin', id],
    queryFn: async (): Promise<NewsBulletin> => {
      if (!id) throw new Error('Bulletin ID is required');
      const res = await fetch(`/api/news/${id}`);
      if (!res.ok) throw new Error('Failed to fetch bulletin');
      const data = await res.json();
      return data.data;
    },
    enabled: !!id,
  });
}

/**
 * Create bulletin mutation
 */
export function useCreateBulletin() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateNewsBulletinInput): Promise<NewsBulletin> => {
      const res = await fetch('/api/news', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to create bulletin');
      }
      const result = await res.json();
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['news-bulletins'] });
    },
  });
}

/**
 * Update bulletin mutation
 */
export function useUpdateBulletin(id: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: UpdateNewsBulletinInput): Promise<NewsBulletin> => {
      const res = await fetch(`/api/news/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to update bulletin');
      }
      const result = await res.json();
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['news-bulletins'] });
      queryClient.invalidateQueries({ queryKey: ['news-bulletin', id] });
    },
  });
}

/**
 * Delete bulletin mutation (soft delete)
 */
export function useDeleteBulletin() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number): Promise<void> => {
      const res = await fetch(`/api/news/${id}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to delete bulletin');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['news-bulletins'] });
    },
  });
}

/**
 * Toggle pin status mutation
 */
export function useToggleBulletinPin(id: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (isPinned: boolean): Promise<NewsBulletin> => {
      const res = await fetch(`/api/news/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isPinned }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to update bulletin');
      }
      const result = await res.json();
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['news-bulletins'] });
      queryClient.invalidateQueries({ queryKey: ['news-bulletin', id] });
    },
  });
}
