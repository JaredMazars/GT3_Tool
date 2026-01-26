/**
 * useReviewNoteAttachments Hook
 * Fetch, upload, and delete attachments for review notes
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

/**
 * useReviewNoteAttachments Hook
 * Fetch attachments for a review note
 */
export function useReviewNoteAttachments(taskId: number, noteId: number) {
  return useQuery({
    queryKey: ['review-note-attachments', taskId, noteId],
    queryFn: async () => {
      const response = await fetch(`/api/tasks/${taskId}/review-notes/${noteId}/attachments`);

      if (!response.ok) {
        throw new Error('Failed to fetch attachments');
      }

      const result = await response.json();
      return result.data;
    },
    staleTime: 30000,
    enabled: noteId > 0,
  });
}

/**
 * useUploadReviewNoteAttachment Hook
 * Upload an attachment to a review note
 */
export function useUploadReviewNoteAttachment(taskId: number, noteId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`/api/tasks/${taskId}/review-notes/${noteId}/attachments`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to upload attachment');
      }

      const result = await response.json();
      return result.data;
    },
    onSuccess: () => {
      // Invalidate attachments query
      queryClient.invalidateQueries({ queryKey: ['review-note-attachments', taskId, noteId] });
      // Also invalidate the note details (which includes attachment count)
      queryClient.invalidateQueries({ queryKey: ['review-note', taskId, noteId] });
    },
  });
}

/**
 * useDeleteReviewNoteAttachment Hook
 * Delete an attachment from a review note
 */
export function useDeleteReviewNoteAttachment(taskId: number, noteId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (attachmentId: number) => {
      const response = await fetch(
        `/api/tasks/${taskId}/review-notes/${noteId}/attachments/${attachmentId}`,
        {
          method: 'DELETE',
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete attachment');
      }

      const result = await response.json();
      return result.data;
    },
    onSuccess: () => {
      // Invalidate attachments query
      queryClient.invalidateQueries({ queryKey: ['review-note-attachments', taskId, noteId] });
      // Also invalidate the note details
      queryClient.invalidateQueries({ queryKey: ['review-note', taskId, noteId] });
    },
  });
}

/**
 * downloadAttachment Helper Function
 * Download an attachment file
 */
export function downloadAttachment(
  taskId: number,
  noteId: number,
  attachmentId: number,
  fileName: string
) {
  const url = `/api/tasks/${taskId}/review-notes/${noteId}/attachments/${attachmentId}`;
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

