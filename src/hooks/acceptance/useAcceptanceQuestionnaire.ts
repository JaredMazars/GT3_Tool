/**
 * React Query hooks for acceptance questionnaire
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export const acceptanceKeys = {
  all: ['acceptance'] as const,
  questionnaire: (projectId: string) => [...acceptanceKeys.all, 'questionnaire', projectId] as const,
  status: (projectId: string) => [...acceptanceKeys.all, 'status', projectId] as const,
  documents: (projectId: string) => [...acceptanceKeys.all, 'documents', projectId] as const,
};

/**
 * Initialize and fetch questionnaire
 * Optimized with reduced stale time and refetch strategies
 */
export function useQuestionnaire(projectId: string) {
  return useQuery({
    queryKey: acceptanceKeys.questionnaire(projectId),
    queryFn: async () => {
      const res = await fetch(`/api/projects/${projectId}/acceptance/initialize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to initialize questionnaire');
      }

      return res.json();
    },
    staleTime: 1000 * 60 * 2, // 2 minutes (reduced from 5)
    refetchOnWindowFocus: true, // Refetch when user returns to tab
    refetchOnReconnect: true, // Refetch on network reconnect
  });
}

/**
 * Get questionnaire status
 * Optimized with shorter stale time
 */
export function useQuestionnaireStatus(projectId: string) {
  return useQuery({
    queryKey: acceptanceKeys.status(projectId),
    queryFn: async () => {
      const res = await fetch(`/api/projects/${projectId}/acceptance/status`);

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to fetch status');
      }

      return res.json();
    },
    staleTime: 1000 * 15, // 15 seconds (reduced from 30)
    refetchInterval: 1000 * 30, // Poll every 30 seconds for status updates
  });
}

/**
 * Save answers (autosave)
 * Optimized with better cache management and error rollback
 */
export function useSaveAnswers(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (answers: Array<{ questionKey: string; answer: string; comment?: string }>) => {
      const res = await fetch(`/api/projects/${projectId}/acceptance/answers`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || error.message || 'Failed to save answers');
      }

      return res.json();
    },
    onMutate: async (answers) => {
      // Cancel any outgoing refetches to prevent overwriting our optimistic update
      await queryClient.cancelQueries({ queryKey: acceptanceKeys.questionnaire(projectId) });

      // Snapshot the previous value
      const previousData = queryClient.getQueryData(acceptanceKeys.questionnaire(projectId));

      // Return context with snapshot
      return { previousData };
    },
    onError: (_error, _variables, context) => {
      // Rollback to previous data on error
      if (context?.previousData) {
        queryClient.setQueryData(acceptanceKeys.questionnaire(projectId), context.previousData);
      }
    },
    onSuccess: (data) => {
      // Update risk assessment without refetching (prevents state jumping)
      queryClient.setQueryData(acceptanceKeys.questionnaire(projectId), (oldData: any) => {
        if (!oldData?.data) return oldData;
        return {
          ...oldData,
          data: {
            ...oldData.data,
            riskAssessment: data.data?.riskAssessment,
          },
        };
      });
      
      // Only invalidate status (lightweight query)
      queryClient.invalidateQueries({ queryKey: acceptanceKeys.status(projectId) });
    },
  });
}

/**
 * Submit questionnaire for review
 */
export function useSubmitQuestionnaire(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/projects/${projectId}/acceptance/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to submit questionnaire');
      }

      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: acceptanceKeys.questionnaire(projectId) });
      queryClient.invalidateQueries({ queryKey: acceptanceKeys.status(projectId) });
    },
  });
}

/**
 * Get supporting documents
 */
export function useAcceptanceDocuments(projectId: string) {
  return useQuery({
    queryKey: acceptanceKeys.documents(projectId),
    queryFn: async () => {
      const res = await fetch(`/api/projects/${projectId}/acceptance/documents`);

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to fetch documents');
      }

      return res.json();
    },
    staleTime: 1000 * 60, // 1 minute
  });
}

/**
 * Upload supporting document
 */
export function useUploadDocument(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ file, documentType }: { file: File; documentType: string }) => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('documentType', documentType);

      const res = await fetch(`/api/projects/${projectId}/acceptance/documents`, {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to upload document');
      }

      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: acceptanceKeys.documents(projectId) });
    },
  });
}

/**
 * Delete supporting document
 */
export function useDeleteDocument(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (documentId: number) => {
      const res = await fetch(`/api/projects/${projectId}/acceptance/documents?documentId=${documentId}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to delete document');
      }

      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: acceptanceKeys.documents(projectId) });
    },
  });
}
