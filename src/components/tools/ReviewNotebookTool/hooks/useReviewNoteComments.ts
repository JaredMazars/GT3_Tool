/**
 * useReviewNoteComments Hook
 * Fetch and add comments to review notes
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

/**
 * useReviewNoteComments Hook
 * Fetch comments for a review note
 */
export function useReviewNoteComments(taskId: number, noteId: number) {
  return useQuery({
    queryKey: ['review-note-comments', taskId, noteId],
    queryFn: async () => {
      const response = await fetch(`/api/tasks/${taskId}/review-notes/${noteId}/comments`);

      if (!response.ok) {
        throw new Error('Failed to fetch comments');
      }

      const result = await response.json();
      return result.data;
    },
    staleTime: 30000,
    enabled: noteId > 0,
  });
}

/**
 * useAddReviewNoteComment Hook
 * Add a comment to a review note
 */
export function useAddReviewNoteComment(taskId: number, noteId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { comment: string; isInternal?: boolean }) => {
      const response = await fetch(`/api/tasks/${taskId}/review-notes/${noteId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to add comment');
      }

      const result = await response.json();
      return result.data;
    },
    onSuccess: () => {
      // Invalidate comments query
      queryClient.invalidateQueries({ queryKey: ['review-note-comments', taskId, noteId] });
      // Also invalidate the note details (which includes comment count)
      queryClient.invalidateQueries({ queryKey: ['review-note', taskId, noteId] });
    },
  });
}

