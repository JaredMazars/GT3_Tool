'use client';

import { useQuery } from '@tanstack/react-query';
import { AgingBuckets, DebtorMetrics } from '@/lib/services/analytics/debtorAggregation';

// Query Keys
export const groupDebtorsKeys = {
  all: ['group-debtors'] as const,
  detail: (groupCode: string) => [...groupDebtorsKeys.all, groupCode] as const,
};

// Types
export interface MasterServiceLineInfo {
  code: string;
  name: string;
}

export interface GroupDebtorData {
  groupCode: string;
  groupDesc: string | null;
  overall: DebtorMetrics;
  byMasterServiceLine: Record<string, DebtorMetrics>;
  masterServiceLines: MasterServiceLineInfo[];
  transactionCount: number;
  lastUpdated: string | null;
}

export interface UseGroupDebtorsParams {
  enabled?: boolean;
}

// Re-export types for convenience
export type { AgingBuckets, DebtorMetrics };

/**
 * Fetch debtor data for a group
 * Returns aggregated debtor balances, aging analysis, and payment metrics
 * across all clients in the group
 */
export function useGroupDebtors(
  groupCode: string,
  params: UseGroupDebtorsParams = {}
) {
  const { enabled = true } = params;

  return useQuery<GroupDebtorData>({
    queryKey: groupDebtorsKeys.detail(groupCode),
    queryFn: async () => {
      const url = `/api/groups/${encodeURIComponent(groupCode)}/debtors`;
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch group debtor data');
      
      const result = await response.json();
      return result.success ? result.data : result;
    },
    enabled: enabled && !!groupCode,
    staleTime: 10 * 60 * 1000, // 10 minutes - aligned with business rules cache TTL
    gcTime: 15 * 60 * 1000, // 15 minutes cache retention
    refetchOnMount: false, // Don't refetch if data is fresh
    refetchOnWindowFocus: false, // Don't refetch on window focus
    refetchOnReconnect: false, // Don't refetch on reconnect
  });
}
