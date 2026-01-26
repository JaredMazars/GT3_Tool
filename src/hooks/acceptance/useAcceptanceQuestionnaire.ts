/**
 * React Query hooks for acceptance questionnaire
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export const acceptanceKeys = {
  all: ['acceptance'] as const,
  questionnaire: (taskId: string) => [...acceptanceKeys.all, 'questionnaire', taskId] as const,
  status: (taskId: string) => [...acceptanceKeys.all, 'status', taskId] as const, // Kept for backwards compatibility
  documents: (taskId: string) => [...acceptanceKeys.all, 'documents', taskId] as const,
};

/**
 * Derive status information from questionnaire data
 * This eliminates the need for a separate status query
 */
export function deriveQuestionnaireStatus(data: any) {
  if (!data?.data) {
    return {
      exists: false,
      completed: false,
      questionnaireType: null,
      completionPercentage: 0,
      riskRating: null,
      overallRiskScore: null,
    };
  }

  const response = data.data.response;
  const riskAssessment = data.data.riskAssessment;
  
  return {
    exists: !!response,
    completed: !!response?.completedAt,
    questionnaireType: response?.questionnaireType || null,
    completionPercentage: data.data.completionPercentage || 0,
    riskRating: riskAssessment?.riskRating || response?.riskRating || null,
    overallRiskScore: riskAssessment?.overallRiskScore || response?.overallRiskScore || null,
  };
}

/**
 * Initialize and fetch questionnaire
 * Optimized with better caching and no separate status query needed
 */
export function useQuestionnaire(taskId: string) {
  return useQuery({
    queryKey: acceptanceKeys.questionnaire(taskId),
    queryFn: async () => {
      // Guard: Never run if taskId is empty
      if (!taskId || taskId === '' || taskId === 'undefined') {
        throw new Error('Task ID is required');
      }

      const res = await fetch(`/api/tasks/${taskId}/acceptance/initialize`, {
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
    enabled: !!taskId && taskId !== '' && taskId !== 'undefined', // Only run when taskId is valid
    staleTime: 1000 * 60 * 5, // 5 minutes - longer cache since data doesn't change frequently
    gcTime: 1000 * 60 * 10, // 10 minutes garbage collection
    refetchOnWindowFocus: false, // Don't refetch on focus - reduces unnecessary calls
    refetchOnReconnect: true, // Refetch on network reconnect
  });
}

/**
 * @deprecated Use useQuestionnaire and deriveQuestionnaireStatus instead
 * This hook now derives status from questionnaire data to avoid duplicate API calls
 */
export function useQuestionnaireStatus(taskId: string) {
  const { data, isLoading, error } = useQuestionnaire(taskId);
  
  return {
    data: data ? { data: deriveQuestionnaireStatus(data) } : undefined,
    isLoading,
    error,
    isFetching: false,
  };
}

/**
 * Save answers (autosave)
 * Optimized with better cache management and error rollback
 */
export function useSaveAnswers(taskId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (answers: Array<{ questionKey: string; answer: string; comment?: string }>) => {
      const res = await fetch(`/api/tasks/${taskId}/acceptance/answers`, {
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
      await queryClient.cancelQueries({ queryKey: acceptanceKeys.questionnaire(taskId) });

      // Snapshot the previous value
      const previousData = queryClient.getQueryData(acceptanceKeys.questionnaire(taskId));

      // Return context with snapshot
      return { previousData };
    },
    onError: (_error, _variables, context) => {
      // Rollback to previous data on error
      if (context?.previousData) {
        queryClient.setQueryData(acceptanceKeys.questionnaire(taskId), context.previousData);
      }
    },
    onSuccess: (data) => {
      // Update risk assessment without refetching (prevents state jumping)
      queryClient.setQueryData(acceptanceKeys.questionnaire(taskId), (oldData: unknown) => {
        if (
          !oldData ||
          typeof oldData !== 'object' ||
          !('data' in oldData) ||
          !oldData.data
        ) {
          return oldData;
        }
        return {
          ...oldData,
          data: {
            ...(oldData.data as Record<string, unknown>),
            riskAssessment: data.data?.riskAssessment,
          },
        };
      });
      
      // Status is now derived from questionnaire data, no separate invalidation needed
    },
  });
}

/**
 * Submit questionnaire for review
 */
export function useSubmitQuestionnaire(taskId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/tasks/${taskId}/acceptance/submit`, {
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
      // Only invalidate questionnaire query - status is derived from it
      queryClient.invalidateQueries({ queryKey: acceptanceKeys.questionnaire(taskId) });
    },
  });
}

/**
 * Get supporting documents
 */
export function useAcceptanceDocuments(taskId: string) {
  return useQuery({
    queryKey: acceptanceKeys.documents(taskId),
    queryFn: async () => {
      // Guard: Never run if taskId is empty
      if (!taskId || taskId === '' || taskId === 'undefined') {
        throw new Error('Task ID is required');
      }

      const res = await fetch(`/api/tasks/${taskId}/acceptance/documents`);

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to fetch documents');
      }

      return res.json();
    },
    enabled: !!taskId && taskId !== '' && taskId !== 'undefined', // Only run when taskId is valid
    staleTime: 1000 * 60, // 1 minute
  });
}

/**
 * Upload supporting document
 */
export function useUploadDocument(taskId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ file, documentType }: { file: File; documentType: string }) => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('documentType', documentType);

      const res = await fetch(`/api/tasks/${taskId}/acceptance/documents`, {
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
      queryClient.invalidateQueries({ queryKey: acceptanceKeys.documents(taskId) });
    },
  });
}

/**
 * Delete supporting document
 */
export function useDeleteDocument(taskId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (documentId: number) => {
      const res = await fetch(`/api/tasks/${taskId}/acceptance/documents?documentId=${documentId}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to delete document');
      }

      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: acceptanceKeys.documents(taskId) });
    },
  });
}

