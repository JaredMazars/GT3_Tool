'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { TaskStage } from '@/types/task-stages';

// Query Keys
export const taskStageKeys = {
  all: ['taskStages'] as const,
  stage: (taskId: number) => [...taskStageKeys.all, taskId] as const,
};

export interface TaskStageHistory {
  id: number;
  stage: string;
  movedBy: string;
  notes: string | null;
  createdAt: string;
  User: {
    id: string;
    name: string | null;
    email: string;
  };
}

export interface TaskStageData {
  currentStage: TaskStage;
  history: TaskStageHistory[];
}

/**
 * Get current stage and history for a task
 */
export function useTaskStage(taskId: number, enabled = true) {
  return useQuery<TaskStageData>({
    queryKey: taskStageKeys.stage(taskId),
    queryFn: async () => {
      const response = await fetch(`/api/tasks/${taskId}/stage`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch task stage');
      }
      
      const result = await response.json();
      return result.success ? result.data : result;
    },
    enabled,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes cache retention
  });
}

/**
 * Mutation hook for updating task stage
 */
export function useUpdateTaskStageMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      taskId, 
      stage, 
      notes 
    }: { 
      taskId: number; 
      stage: TaskStage;
      notes?: string;
    }) => {
      const response = await fetch(`/api/tasks/${taskId}/stage`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ stage, notes }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update task stage');
      }

      const result = await response.json();
      return result.success ? result.data : result;
    },
    onSuccess: (data, variables) => {
      // Invalidate task stage query
      queryClient.invalidateQueries({ 
        queryKey: taskStageKeys.stage(variables.taskId) 
      });
      
      // Invalidate Kanban board queries
      queryClient.invalidateQueries({ queryKey: ['kanban'] });
      
      // Invalidate task list queries
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      
      // Invalidate specific task detail
      queryClient.invalidateQueries({ queryKey: ['task', variables.taskId] });
    },
  });
}



















