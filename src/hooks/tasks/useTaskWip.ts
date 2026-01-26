'use client';

import { useQuery } from '@tanstack/react-query';

// Query Keys
export const taskWipKeys = {
  all: ['task-wip'] as const,
  detail: (taskId: number) => [...taskWipKeys.all, taskId] as const,
};

// Types
export interface ProfitabilityMetrics {
  grossProduction: number;
  ltdAdjustment: number;
  netRevenue: number;
  adjustmentPercentage: number;
  ltdCost: number;
  grossProfit: number;
  grossProfitPercentage: number;
  averageChargeoutRate: number;
  averageRecoveryRate: number;
  balWIP: number;
  balTime: number;
  balDisb: number;
  wipProvision: number;
  ltdTime: number;
  ltdDisb: number;
  ltdAdj: number; // Merged adjustments
  ltdFee: number; // Merged fees
  ltdHours: number;
  // Legacy fields for backwards compatibility
  ltdAdjTime: number;
  ltdAdjDisb: number;
  ltdFeeTime: number;
  ltdFeeDisb: number;
}

export interface TaskWipData {
  taskId: number;
  GSTaskID: string;
  taskCode: string;
  taskDesc: string;
  metrics: ProfitabilityMetrics;
  lastUpdated: string | null;
}

export interface UseTaskWipParams {
  enabled?: boolean;
}

/**
 * Fetch Work in Progress data for a task
 * Returns profitability metrics for the task
 */
export function useTaskWip(
  taskId: number,
  params: UseTaskWipParams = {}
) {
  const { enabled = true } = params;

  return useQuery<TaskWipData>({
    queryKey: taskWipKeys.detail(taskId),
    queryFn: async () => {
      const url = `/api/tasks/${taskId}/wip`;
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch task WIP data');
      
      const result = await response.json();
      return result.success ? result.data : result;
    },
    enabled: enabled && !!taskId && taskId > 0,
    staleTime: 10 * 60 * 1000, // 10 minutes - aligned with business rules cache TTL
    gcTime: 15 * 60 * 1000, // 15 minutes cache retention
    refetchOnMount: false, // Don't refetch if data is fresh
    refetchOnWindowFocus: false, // Don't refetch on window focus
    refetchOnReconnect: false, // Don't refetch on reconnect
  });
}

























