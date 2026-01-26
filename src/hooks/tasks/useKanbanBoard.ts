'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { KanbanBoardData } from '@/components/features/tasks/Kanban/types';
import { TaskStage } from '@/types/task-stages';

// Query Keys
export const kanbanKeys = {
  all: ['kanban'] as const,
  boards: () => [...kanbanKeys.all, 'board'] as const,
  board: (params: UseKanbanBoardParams) => 
    [...kanbanKeys.boards(), params] as const,
};

export interface UseKanbanBoardParams {
  serviceLine: string;
  subServiceLineGroup: string;
  myTasksOnly?: boolean;
  clientIds?: number[];
  taskNames?: string[];
  partnerCodes?: string[];
  managerCodes?: string[];
  serviceLineCodes?: string[];
  includeArchived?: boolean;
}

/**
 * Fetch Kanban board data with tasks grouped by stage
 */
export function useKanbanBoard(params: UseKanbanBoardParams) {
  const {
    serviceLine,
    subServiceLineGroup,
    myTasksOnly = false,
    clientIds = [],
    taskNames = [],
    partnerCodes = [],
    managerCodes = [],
    serviceLineCodes = [],
    includeArchived = false,
  } = params;

  return useQuery<KanbanBoardData>({
    queryKey: kanbanKeys.board({
      serviceLine,
      subServiceLineGroup,
      myTasksOnly,
      clientIds,
      taskNames,
      partnerCodes,
      managerCodes,
      serviceLineCodes,
      includeArchived,
    }),
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      searchParams.set('serviceLine', serviceLine);
      searchParams.set('subServiceLineGroup', subServiceLineGroup);
      if (myTasksOnly) searchParams.set('myTasksOnly', 'true');
      if (clientIds.length > 0) searchParams.set('clientIds', clientIds.join(','));
      if (taskNames.length > 0) searchParams.set('taskNames', taskNames.join(','));
      if (partnerCodes.length > 0) searchParams.set('partnerCodes', partnerCodes.join(','));
      if (managerCodes.length > 0) searchParams.set('managerCodes', managerCodes.join(','));
      if (serviceLineCodes.length > 0) searchParams.set('serviceLineCodes', serviceLineCodes.join(','));
      // Always include the includeArchived parameter to ensure proper cache invalidation
      searchParams.set('includeArchived', includeArchived ? 'true' : 'false');
      
      const url = `/api/tasks/kanban?${searchParams.toString()}`;
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error('Failed to fetch Kanban board data');
      }
      
      const result = await response.json();
      return result.success ? result.data : result;
    },
    staleTime: 30 * 1000, // 30 seconds - reduced from 15 minutes for fresher data
    gcTime: 5 * 60 * 1000, // 5 minutes cache retention
    refetchOnMount: true, // Refetch when component mounts (ensures fresh data on tab switches)
    refetchOnWindowFocus: false, // Keep disabled to prevent unnecessary refetches
    refetchOnReconnect: false,
    refetchInterval: false, // Disable automatic polling
    // Note: Query will automatically refetch when queryKey params change
  });
}

/**
 * Helper function to update task stage in cached data
 */
function updateTaskStageInCache(
  data: KanbanBoardData,
  taskId: number,
  newStage: TaskStage
): KanbanBoardData {
  // Create a deep copy of the data
  const updatedColumns = data.columns.map(column => {
    // Find and remove task from its current column
    const filteredTasks = column.tasks.filter(task => task.id !== taskId);
    
    // If this is the target column, add the task with updated stage
    if (column.stage === newStage) {
      const taskToMove = data.columns
        .flatMap(col => col.tasks)
        .find(task => task.id === taskId);
      
      if (taskToMove) {
        const newTasks = [{ ...taskToMove, stage: newStage }, ...filteredTasks];
        const newTaskCount = newTasks.length;
        const newLoaded = column.metrics.loaded !== undefined 
          ? Math.min(newTaskCount, column.totalCount)
          : newTaskCount;
        
        return {
          ...column,
          tasks: newTasks,
          taskCount: newTaskCount,
          totalCount: column.totalCount,
          metrics: {
            count: column.metrics.count,
            loaded: newLoaded,
          },
        };
      }
    }
    
    // Update metrics for columns that lost a task
    if (filteredTasks.length !== column.tasks.length) {
      const newTaskCount = filteredTasks.length;
      const newLoaded = column.metrics.loaded !== undefined
        ? Math.min(newTaskCount, column.totalCount)
        : newTaskCount;
        
      return {
        ...column,
        tasks: filteredTasks,
        taskCount: newTaskCount,
        totalCount: column.totalCount,
        metrics: {
          count: column.metrics.count,
          loaded: newLoaded,
        },
      };
    }
    
    return column;
  });
  
  return {
    ...data,
    columns: updatedColumns,
    totalTasks: data.totalTasks,
    loadedTasks: data.loadedTasks,
  };
}

/**
 * Hook to update a task's stage
 */
export function useUpdateTaskStage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ['updateTaskStage'],
    mutationFn: async ({ taskId, stage, notes }: { 
      taskId: number; 
      stage: TaskStage;
      notes?: string;
    }) => {
      const requestBody = { stage, notes };
      
      const response = await fetch(`/api/tasks/${taskId}/stage`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const error = await response.json();
        console.error('Stage update failed:', {
          taskId,
          stage,
          requestBody,
          error,
          statusCode: response.status
        });
        throw new Error(error.error || 'Failed to update task stage');
      }

      const result = await response.json();
      return result.success ? result.data : result;
    },
    onMutate: async (variables) => {
      // Cancel ANY outgoing refetches to prevent cache from being overwritten
      await queryClient.cancelQueries({ queryKey: kanbanKeys.boards() });
      await queryClient.cancelQueries({ queryKey: ['tasks'] });
      
      // Snapshot the current value for rollback on error
      // Note: Cache was already updated synchronously in handleDragEnd
      const previousData = queryClient.getQueriesData({ queryKey: kanbanKeys.boards() });
      
      // Return context with snapshot for rollback on error
      return { previousData };
    },
    onError: (err, variables, context) => {
      // Rollback optimistic updates on error
      if (context?.previousData) {
        context.previousData.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
    },
    onSettled: async (data, error, variables) => {
      // Use onSettled instead of onSuccess to ensure it runs after everything
      // Only invalidate task detail for consistency in detail views
      // Don't invalidate board queries - optimistic update is already correct
      if (!error) {
        queryClient.invalidateQueries({ queryKey: ['task', variables.taskId] });
      }
    },
  });
}



