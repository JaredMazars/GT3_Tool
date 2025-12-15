'use client';

import { useQuery } from '@tanstack/react-query';
import { AgingBuckets, DebtorMetrics } from '@/lib/services/analytics/debtorAggregation';

// Query Keys
export const clientDebtorsKeys = {
  all: ['client-debtors'] as const,
  detail: (GSClientID: string) => [...clientDebtorsKeys.all, GSClientID] as const,
};

// Types
export interface MasterServiceLineInfo {
  code: string;
  name: string;
}

export interface ClientDebtorData {
  GSClientID: string;
  clientCode: string;
  clientName: string | null;
  overall: DebtorMetrics;
  byMasterServiceLine: Record<string, DebtorMetrics>;
  masterServiceLines: MasterServiceLineInfo[];
  transactionCount: number;
  lastUpdated: string | null;
}

export interface UseClientDebtorsParams {
  enabled?: boolean;
}

// Re-export types for convenience
export type { AgingBuckets, DebtorMetrics };

/**
 * Fetch debtor data for a client
 * Returns aggregated debtor balances, aging analysis, and payment metrics
 */
export function useClientDebtors(
  GSClientID: string,
  params: UseClientDebtorsParams = {}
) {
  const { enabled = true } = params;

  return useQuery<ClientDebtorData>({
    queryKey: clientDebtorsKeys.detail(GSClientID),
    queryFn: async () => {
      const url = `/api/clients/${GSClientID}/debtors`;
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch client debtor data');
      
      const result = await response.json();
      return result.success ? result.data : result;
    },
    enabled: enabled && !!GSClientID,
    staleTime: 10 * 60 * 1000, // 10 minutes - aligned with business rules cache TTL
    gcTime: 15 * 60 * 1000, // 15 minutes cache retention
    refetchOnMount: false, // Don't refetch if data is fresh
    refetchOnWindowFocus: false, // Don't refetch on window focus
    refetchOnReconnect: false, // Don't refetch on reconnect
  });
}

