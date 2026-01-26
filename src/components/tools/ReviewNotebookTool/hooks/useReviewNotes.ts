/**
 * useReviewNotes Hook
 * Fetch review notes with filters and pagination
 */

import { useQuery } from '@tanstack/react-query';
import type { ReviewNoteFilterDTO, ReviewNoteListResponse } from '@/types/review-notes';

interface UseReviewNotesOptions extends ReviewNoteFilterDTO {
  taskId: number;
}

export function useReviewNotes(options: UseReviewNotesOptions) {
  const { taskId, ...filters } = options;

  return useQuery({
    queryKey: ['review-notes', taskId, filters],
    queryFn: async (): Promise<ReviewNoteListResponse> => {
      // Build query string
      const params = new URLSearchParams();

      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          if (Array.isArray(value)) {
            params.append(key, value.join(','));
          } else {
            params.append(key, String(value));
          }
        }
      });

      const response = await fetch(
        `/api/tasks/${taskId}/review-notes?${params.toString()}`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch review notes');
      }

      const result = await response.json();
      return result.data;
    },
    staleTime: 30000, // 30 seconds
  });
}

/**
 * useReviewNote Hook
 * Fetch a single review note with details
 */
interface UseReviewNoteOptions {
  taskId: number;
  noteId: number;
  includeComments?: boolean;
  includeAttachments?: boolean;
}

export function useReviewNote(options: UseReviewNoteOptions) {
  const { taskId, noteId, includeComments = false, includeAttachments = false } = options;

  return useQuery({
    queryKey: ['review-note', taskId, noteId, { includeComments, includeAttachments }],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (includeComments) params.append('includeComments', 'true');
      if (includeAttachments) params.append('includeAttachments', 'true');

      const response = await fetch(
        `/api/tasks/${taskId}/review-notes/${noteId}?${params.toString()}`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch review note');
      }

      const result = await response.json();
      return result.data;
    },
    staleTime: 30000,
    enabled: noteId > 0,
  });
}

/**
 * useReviewNoteAnalytics Hook
 * Fetch analytics data for review notes
 */
export function useReviewNoteAnalytics(taskId: number) {
  return useQuery({
    queryKey: ['review-note-analytics', taskId],
    queryFn: async () => {
      const response = await fetch(`/api/tasks/${taskId}/review-notes/analytics`);

      if (!response.ok) {
        throw new Error('Failed to fetch analytics');
      }

      const result = await response.json();
      return result.data;
    },
    staleTime: 60000, // 1 minute
  });
}

/**
 * useReviewCategories Hook
 * Fetch review categories
 */
export function useReviewCategories(serviceLine?: string) {
  return useQuery({
    queryKey: ['review-categories', serviceLine],
    queryFn: async () => {
      const params = serviceLine ? `?serviceLine=${serviceLine}` : '';
      const response = await fetch(`/api/tasks/0/review-notes/categories${params}`);

      if (!response.ok) {
        throw new Error('Failed to fetch categories');
      }

      const result = await response.json();
      return result.data;
    },
    staleTime: 300000, // 5 minutes - categories don't change often
  });
}

