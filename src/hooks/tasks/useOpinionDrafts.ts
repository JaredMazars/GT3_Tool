import { useState, useEffect } from 'react';
import { OpinionDraft } from '@/types';

export function useOpinionDrafts(taskId: string) {
  const [drafts, setDrafts] = useState<OpinionDraft[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedDraft, setSelectedDraft] = useState<OpinionDraft | null>(null);

  const fetchDrafts = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/tasks/${taskId}/opinion-drafts`);
      if (!response.ok) throw new Error('Failed to fetch drafts');
      const data = await response.json();
      setDrafts(data.data || []);
      if (data.data?.length > 0 && !selectedDraft) {
        setSelectedDraft(data.data[0]);
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to fetch drafts');
    } finally {
      setIsLoading(false);
    }
  };

  const createDraft = async () => {
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
      await fetchDrafts();
      setSelectedDraft(data.data);
      return data.data;
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to create draft');
      throw error;
    }
  };

  const updateDraft = async (draftId: number, updates: Partial<OpinionDraft>) => {
    try {
      const response = await fetch(`/api/tasks/${taskId}/opinion-drafts/${draftId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });

      if (!response.ok) throw new Error('Failed to update draft');
      
      await fetchDrafts();
      setError(null);
      
      if (selectedDraft?.id === draftId) {
        setSelectedDraft({ ...selectedDraft, ...updates });
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to update draft');
      throw error;
    }
  };

  const deleteDraft = async (draftId: number) => {
    try {
      const response = await fetch(`/api/tasks/${taskId}/opinion-drafts/${draftId}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete draft');

      if (selectedDraft?.id === draftId) {
        const remainingDrafts = drafts.filter(d => d.id !== draftId);
        setSelectedDraft(remainingDrafts[0] ?? null);
      }

      await fetchDrafts();
      setError(null);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to delete draft');
      throw error;
    }
  };

  useEffect(() => {
    fetchDrafts();
  }, [taskId]);

  return {
    drafts,
    selectedDraft,
    setSelectedDraft,
    isLoading,
    error,
    setError,
    createDraft,
    updateDraft,
    deleteDraft,
    refetch: fetchDrafts,
  };
}

