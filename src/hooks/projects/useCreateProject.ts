'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { projectListKeys } from './useProjects';
import { clientKeys } from '@/hooks/clients/useClients';

export interface CreateProjectInput {
  name: string;
  description?: string;
  clientId?: number | null;
  projectType?: string;
  serviceLine?: string;
  taxYear?: number;
  taxPeriodStart?: Date | null;
  taxPeriodEnd?: Date | null;
  assessmentYear?: string;
  submissionDeadline?: Date | null;
}

export interface CreateProjectResult {
  id: number;
  name: string;
  serviceLine: string;
  [key: string]: unknown;
}

/**
 * Create a new project
 * Automatically invalidates project and client caches on success
 */
export function useCreateProject() {
  const queryClient = useQueryClient();

  return useMutation<CreateProjectResult, Error, CreateProjectInput>({
    mutationFn: async (data: CreateProjectInput) => {
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create project');
      }

      const result = await response.json();
      return result.success ? result.data : result;
    },
    onSuccess: async () => {
      // Invalidate and refetch all project queries (both active and inactive)
      // This ensures the cache is fresh when user navigates to any page
      await queryClient.invalidateQueries({ 
        queryKey: projectListKeys.all,
        refetchType: 'all',
      });
      
      // Invalidate and refetch all client queries
      await queryClient.invalidateQueries({ 
        queryKey: clientKeys.all,
        refetchType: 'all',
      });
    },
  });
}

