import { useState } from 'react';
import { OpinionDraft } from '@/types';

export function useDraftOperations(taskId: string, onDraftChange: (draft: OpinionDraft | null) => void) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const renameDraft = async (draftId: number, newTitle: string) => {
    if (!newTitle.trim()) {
      setError('Draft title cannot be empty');
      return false;
    }

    setIsRenaming(true);
    setError(null);

    try {
      const response = await fetch(`/api/tasks/${taskId}/opinion-drafts/${draftId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newTitle.trim(),
        }),
      });

      if (!response.ok) throw new Error('Failed to rename draft');
      
      setError(null);
      return true;
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to rename draft');
      return false;
    } finally {
      setIsRenaming(false);
    }
  };

  const deleteDraft = async (draftId: number) => {
    setIsDeleting(true);
    setError(null);

    try {
      const response = await fetch(`/api/tasks/${taskId}/opinion-drafts/${draftId}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete draft');
      
      setError(null);
      return true;
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to delete draft');
      return false;
    } finally {
      setIsDeleting(false);
    }
  };

  const createDraft = async () => {
    setError(null);

    try {
      const response = await fetch(`/api/tasks/${taskId}/opinion-drafts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'New Opinion Draft',
          content: '',
          status: 'DRAFT',
        }),
      });

      if (!response.ok) throw new Error('Failed to create draft');
      const data = await response.json();
      onDraftChange(data.data);
      return data.data;
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to create draft');
      return null;
    }
  };

  return {
    renameDraft,
    deleteDraft,
    createDraft,
    isDeleting,
    isRenaming,
    error,
    setError,
  };
}

