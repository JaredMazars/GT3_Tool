'use client';

import { useQuery } from '@tanstack/react-query';

// Query Keys
export const taskBalancesKeys = {
  all: ['task-balances'] as const,
  detail: (taskId: number) => [...taskBalancesKeys.all, taskId] as const,
};

// Types
export interface TaskBalances {
  taskId: number;
  GSTaskID: string;
  taskCode: string;
  taskDesc: string;
  // Breakdown components
  time: number;
  adjustments: number; // Single category for all adjustments (TType === 'ADJ')
  disbursements: number;
  fees: number;
  provision: number;
  // Calculated totals
  grossWip: number;
  netWip: number;
  lastUpdated: string | null;
}

export interface UseTaskBalancesParams {
  enabled?: boolean;
}

/**
 * Fetch WIP balances for a task with detailed breakdown
 * Returns balances calculated from WIPTransactions using exact TType matching:
 * 
 * Breakdown Components:
 * - time: Time transactions (TType === 'T')
 * - adjustments: All adjustment transactions (TType === 'ADJ')
 * - disbursements: Disbursement transactions (TType === 'D')
 * - fees: Fee transactions (TType === 'F', reversed/subtracted)
 * - provision: Provision transactions (TType === 'P')
 * 
 * Calculated Totals:
 * - grossWip: Time + Adjustments + Disbursements - Fees
 * - netWip: Gross WIP + Provision
 */
export function useTaskBalances(
  taskId: number | undefined,
  params: UseTaskBalancesParams = {}
) {
  const { enabled = true } = params;

  return useQuery<TaskBalances>({
    queryKey: taskBalancesKeys.detail(taskId!),
    queryFn: async () => {
      const url = `/api/tasks/${taskId}/balances`;
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch task balances');
      
      const result = await response.json();
      return result.success ? result.data : result;
    },
    enabled: enabled && !!taskId,
    staleTime: 10 * 60 * 1000, // 10 minutes - aligned with business rules cache TTL
    gcTime: 15 * 60 * 1000, // 15 minutes cache retention
    refetchOnMount: false, // Don't refetch if data is fresh
    refetchOnWindowFocus: false, // Don't refetch on window focus
    refetchOnReconnect: false, // Don't refetch on reconnect
  });
}
