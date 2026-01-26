'use client';

import { useMutation } from '@tanstack/react-query';

export interface CheckDuplicateInput {
  servLineCode: string;
  year: number;
  stdTaskCode: string;
}

export interface ExistingTask {
  id: number;
  taskCode: string;
  taskDesc: string;
  taskYear: number;
  active: boolean;
  clientCode?: string;
  clientName?: string;
}

export interface CheckDuplicateResult {
  exists: boolean;
  count: number;
  nextIncrement: string;
  nextTaskCode: string;
  basePattern: string;
  existingTasks: ExistingTask[];
}

/**
 * Check for duplicate task codes and get next increment
 */
export function useCheckDuplicateTaskCode() {
  return useMutation<CheckDuplicateResult, Error, CheckDuplicateInput>({
    mutationFn: async (data: CheckDuplicateInput) => {
      const response = await fetch('/api/tasks/check-duplicate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to check duplicate task codes');
      }

      const result = await response.json();
      return result.success ? result.data : result;
    },
  });
}


























