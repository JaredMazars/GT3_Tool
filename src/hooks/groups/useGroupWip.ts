'use client';

import { useQuery } from '@tanstack/react-query';

// Query Keys
export const groupWipKeys = {
  all: ['group-wip'] as const,
  detail: (groupCode: string) => [...groupWipKeys.all, groupCode] as const,
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
  taskCount: number;
  // Legacy fields for backwards compatibility
  ltdAdjTime: number;
  ltdAdjDisb: number;
  ltdFeeTime: number;
  ltdFeeDisb: number;
}

export interface MasterServiceLineInfo {
  code: string;
  name: string;
}

export interface GroupWipData {
  groupCode: string;
  groupDesc: string | null;
  overall: ProfitabilityMetrics;
  byMasterServiceLine: Record<string, ProfitabilityMetrics>;
  masterServiceLines: MasterServiceLineInfo[];
  taskCount: number;
  lastUpdated: string | null;
}

export interface UseGroupWipParams {
  enabled?: boolean;
}

/**
 * Fetch Work in Progress data for a group
 * Returns aggregated WIP balances across all clients in the group
 */
export function useGroupWip(
  groupCode: string,
  params: UseGroupWipParams = {}
) {
  const { enabled = true } = params;

  return useQuery<GroupWipData>({
    queryKey: groupWipKeys.detail(groupCode),
    queryFn: async () => {
      const url = `/api/groups/${encodeURIComponent(groupCode)}/wip`;
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch group WIP data');
      
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
