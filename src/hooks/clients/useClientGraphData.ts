'use client';

import { useQuery } from '@tanstack/react-query';

// Query Keys
export const clientGraphDataKeys = {
  all: ['client-graph-data'] as const,
  detail: (GSClientID: string) => [...clientGraphDataKeys.all, GSClientID, 'v2'] as const, // v2 = fixed downsampling
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

export interface ServiceLineGraphData {
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

export interface MasterServiceLineInfo {
  code: string;
  name: string;
}

export interface ClientGraphData {
  GSClientID: string;
  clientCode: string;
  clientName: string | null;
  startDate: string;
  endDate: string;
  overall: ServiceLineGraphData;
  byMasterServiceLine: Record<string, ServiceLineGraphData>;
  masterServiceLines: MasterServiceLineInfo[];
}

export interface UseClientGraphDataParams {
  enabled?: boolean;
}

/**
 * Fetch daily transaction graph data for a client
 * Returns 24 months of daily metrics (Production, Adjustments, Disbursements, Billing)
 */
export function useClientGraphData(
  GSClientID: string,
  params: UseClientGraphDataParams = {}
) {
  const { enabled = true } = params;

  return useQuery<ClientGraphData>({
    queryKey: clientGraphDataKeys.detail(GSClientID),
    queryFn: async () => {
      const url = `/api/clients/${GSClientID}/analytics/graphs`;
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch client graph data');
      
      const result = await response.json();
      return result.success ? result.data : result;
    },
    enabled: enabled && !!GSClientID,
    staleTime: 30 * 60 * 1000, // 30 minutes - extended for analytics performance
    gcTime: 60 * 60 * 1000, // 60 minutes cache retention
    refetchOnMount: false, // Don't refetch if data is fresh
    refetchOnWindowFocus: false, // Don't refetch on window focus
    refetchOnReconnect: false, // Don't refetch on reconnect
  });
}
