'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { taskListKeys } from './useTasks';
import { clientKeys } from '@/hooks/clients/useClients';

export interface CreateTaskInput {
  // Basic Info
  taskYear: number;
  TaskDesc: string;
  TaskCode?: string;
  clientId?: number | null;  // Internal ID - for queries (will be converted to GSClientID)
  
  // Team & Organization
  TaskPartner: string;
  TaskPartnerName: string;
  TaskManager: string;
  TaskManagerName: string;
  OfficeCode: string;
  
  // Service Line
  serviceLine?: string;
  SLGroup?: string | null;  // Backend derives from ServLineCode
  ServLineCode?: string;
  ServLineDesc?: string | null;  // Backend derives from ServLineCode
  
  // Timeline
  TaskDateOpen: Date;
  TaskDateTerminate?: Date | null;
  
  // Estimations
  estimatedHours?: number;
  estimatedTimeValue?: number;
  estimatedDisbursements?: number;
  estimatedAdjustments?: number;

  // Team Members
  teamMembers?: Array<{
    empCode: string;
    role: 'ADMINISTRATOR' | 'PARTNER' | 'MANAGER' | 'SUPERVISOR' | 'USER' | 'VIEWER';
  }>;
}

export interface CreateTaskResult {
  id: number;
  name: string;
  serviceLine: string;
  teamMemberSummary?: {
    requested: number;
    created: number;
    failed: Array<{
      empCode: string;
      role: string;
      reason: string;
    }>;
  };
  [key: string]: unknown;
}

/**
 * Create a new task
 * Automatically invalidates task and client caches on success
 */
export function useCreateTask() {
  const queryClient = useQueryClient();

  return useMutation<CreateTaskResult, Error, CreateTaskInput>({
    mutationFn: async (data: CreateTaskInput) => {
      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create task');
      }

      const result = await response.json();
      return result.success ? result.data : result;
    },
    onSuccess: async () => {
      // Invalidate and refetch all task queries (both active and inactive)
      // This ensures the cache is fresh when user navigates to any page
      await queryClient.invalidateQueries({ 
        queryKey: taskListKeys.all,
        refetchType: 'all',
      });
      
      // Invalidate and refetch all client queries
      await queryClient.invalidateQueries({ 
        queryKey: clientKeys.all,
        refetchType: 'all',
      });
      
      // Invalidate workspace counts
      await queryClient.invalidateQueries({ 
        queryKey: ['workspace-counts'],
        refetchType: 'all',
      });
    },
  });
}


