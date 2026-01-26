'use client';

import { useQuery } from '@tanstack/react-query';

// Query Keys
export const taskTransactionsKeys = {
  all: ['task-transactions'] as const,
  detail: (taskId: number) => [...taskTransactionsKeys.all, taskId] as const,
};

// Types
export interface TaskTransaction {
  id: number;
  GSWIPTransID: string;
  tranDate: Date;
  tranType: string;
  tType: string;
  empCode: string | null;
  empName: string | null;
  amount: number | null;
  cost: number;
  hour: number;
  ref: string | null;
  narr: string | null;
  officeCode: string;
  taskServLine: string;
}

export interface TaskTransactionsData {
  taskId: number;
  taskCode: string;
  taskDesc: string;
  transactions: TaskTransaction[];
}

export interface UseTaskTransactionsParams {
  enabled?: boolean;
}

/**
 * Fetch WIP transactions for a task
 * Returns all transaction details for the task
 */
export function useTaskTransactions(
  taskId: number,
  params: UseTaskTransactionsParams = {}
) {
  const { enabled = true } = params;

  return useQuery<TaskTransactionsData>({
    queryKey: taskTransactionsKeys.detail(taskId),
    queryFn: async () => {
      const url = `/api/tasks/${taskId}/transactions`;
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch task transactions');
      
      const result = await response.json();
      return result.success ? result.data : result;
    },
    enabled: enabled && !!taskId && taskId > 0,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes cache retention
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
}

























