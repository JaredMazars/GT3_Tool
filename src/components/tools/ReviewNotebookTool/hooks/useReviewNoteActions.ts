/**
 * useReviewNoteActions Hook
 * Mutations for creating, updating, deleting review notes and changing status
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import type {
  CreateReviewNoteDTO,
  UpdateReviewNoteDTO,
  ReviewNoteStatus,
} from '@/types/review-notes';

/**
 * useCreateReviewNote Hook
 * Create a new review note
 */
export function useCreateReviewNote(taskId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateReviewNoteDTO) => {
      const response = await fetch(`/api/tasks/${taskId}/review-notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create review note');
      }

      const result = await response.json();
      return result.data;
    },
    onSuccess: () => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['review-notes', taskId] });
      queryClient.invalidateQueries({ queryKey: ['review-note-analytics', taskId] });
    },
  });
}

/**
 * useUpdateReviewNote Hook
 * Update an existing review note
 */
export function useUpdateReviewNote(taskId: number, noteId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: UpdateReviewNoteDTO) => {
      const response = await fetch(`/api/tasks/${taskId}/review-notes/${noteId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update review note');
      }

      const result = await response.json();
      return result.data;
    },
    onSuccess: () => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['review-notes', taskId] });
      queryClient.invalidateQueries({ queryKey: ['review-note', taskId, noteId] });
      queryClient.invalidateQueries({ queryKey: ['review-note-analytics', taskId] });
    },
  });
}

/**
 * useDeleteReviewNote Hook
 * Delete a review note
 */
export function useDeleteReviewNote(taskId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (noteId: number) => {
      const response = await fetch(`/api/tasks/${taskId}/review-notes/${noteId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete review note');
      }

      const result = await response.json();
      return result.data;
    },
    onSuccess: () => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['review-notes', taskId] });
      queryClient.invalidateQueries({ queryKey: ['review-note-analytics', taskId] });
    },
  });
}

/**
 * useChangeReviewNoteStatus Hook
 * Change the status of a review note
 */
export function useChangeReviewNoteStatus(taskId: number, noteId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      status: ReviewNoteStatus;
      comment?: string;
      reason?: string;
    }) => {
      const response = await fetch(`/api/tasks/${taskId}/review-notes/${noteId}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to change status');
      }

      const result = await response.json();
      return result.data;
    },
    onSuccess: () => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['review-notes', taskId] });
      queryClient.invalidateQueries({ queryKey: ['review-note', taskId, noteId] });
      queryClient.invalidateQueries({ queryKey: ['review-note-analytics', taskId] });
    },
  });
}

/**
 * useAssignReviewNote Hook
 * Assign or reassign a review note to a user
 */
export function useAssignReviewNote(taskId: number, noteId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (assignedTo: string) => {
      const response = await fetch(`/api/tasks/${taskId}/review-notes/${noteId}/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assignedTo }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to assign review note');
      }

      const result = await response.json();
      return result.data;
    },
    onSuccess: () => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['review-notes', taskId] });
      queryClient.invalidateQueries({ queryKey: ['review-note', taskId, noteId] });
      queryClient.invalidateQueries({ queryKey: ['review-note-analytics', taskId] });
    },
  });
}

