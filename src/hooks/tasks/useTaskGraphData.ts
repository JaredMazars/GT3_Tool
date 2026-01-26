'use client';

import { useQuery } from '@tanstack/react-query';

// Query Keys
export const taskGraphDataKeys = {
  all: ['task-graph-data'] as const,
  detail: (taskId: number) => [...taskGraphDataKeys.all, taskId] as const,
};

// Types
export interface DailyMetrics {
  date: string; // YYYY-MM-DD format
  production: number;
  adjustments: number;
  disbursements: number;
  billing: number;
  provisions: number;
  wipBalance: number;
}

export interface TaskGraphData {
  dailyMetrics: DailyMetrics[];
  summary: {
    totalProduction: number;
    totalAdjustments: number;
    totalDisbursements: number;
    totalBilling: number;
    totalProvisions: number;
    currentWipBalance: number;
  };
}

export interface TaskGraphResponse {
  taskId: number;
  GSTaskID: string;
  taskCode: string;
  taskDesc: string;
  startDate: string;
  endDate: string;
  data: TaskGraphData;
}

export interface UseTaskGraphDataParams {
  enabled?: boolean;
}

/**
 * Fetch daily transaction graph data for a task
 * Returns 24 months of daily metrics (Production, Adjustments, Disbursements, Billing, Provisions)
 */
export function useTaskGraphData(
  taskId: number,
  params: UseTaskGraphDataParams = {}
) {
  const { enabled = true } = params;

  return useQuery<TaskGraphResponse>({
    queryKey: taskGraphDataKeys.detail(taskId),
    queryFn: async () => {
      const url = `/api/tasks/${taskId}/analytics/graphs`;
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch task graph data');
      
      const result = await response.json();
      return result.success ? result.data : result;
    },
    enabled: enabled && !!taskId && taskId > 0,
    staleTime: 30 * 60 * 1000, // 30 minutes - extended for analytics performance
    gcTime: 60 * 60 * 1000, // 60 minutes cache retention
    refetchOnMount: false, // Don't refetch if data is fresh
    refetchOnWindowFocus: false, // Don't refetch on window focus
    refetchOnReconnect: false, // Don't refetch on reconnect
  });
}


