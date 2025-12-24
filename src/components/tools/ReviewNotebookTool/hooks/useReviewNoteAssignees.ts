/**
 * useReviewNoteAssignees Hooks
 * Manage assignees for a review note
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

export function useReviewNoteAssignees(taskId: number, noteId: number) {
  return useQuery({
    queryKey: ['review-note-assignees', taskId, noteId],
    queryFn: async () => {
      const response = await fetch(`/api/tasks/${taskId}/review-notes/${noteId}/assignees`);
      if (!response.ok) throw new Error('Failed to fetch assignees');
      const result = await response.json();
      return result.data;
    },
    staleTime: 30000,
  });
}

export function useAddReviewNoteAssignee(taskId: number, noteId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, isForwarded }: { userId: string; isForwarded?: boolean }) => {
      const response = await fetch(`/api/tasks/${taskId}/review-notes/${noteId}/assignees`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, isForwarded: isForwarded || false }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to add assignee');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['review-note-assignees', taskId, noteId] });
      queryClient.invalidateQueries({ queryKey: ['review-note', taskId, noteId] });
      queryClient.invalidateQueries({ queryKey: ['review-notes', taskId] });
    },
  });
}

export function useRemoveReviewNoteAssignee(taskId: number, noteId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (userId: string) => {
      const response = await fetch(`/api/tasks/${taskId}/review-notes/${noteId}/assignees`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to remove assignee');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['review-note-assignees', taskId, noteId] });
      queryClient.invalidateQueries({ queryKey: ['review-note', taskId, noteId] });
      queryClient.invalidateQueries({ queryKey: ['review-notes', taskId] });
    },
  });
}




