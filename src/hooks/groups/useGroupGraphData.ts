import { useQuery } from '@tanstack/react-query';

/**
 * Daily metrics for transaction graphs
 */
export interface DailyMetrics {
  date: string; // YYYY-MM-DD format
  production: number;
  adjustments: number;
  disbursements: number;
  billing: number;
  provisions: number;
  wipBalance: number;
}

/**
 * Service line specific graph data
 */
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

/**
 * Master service line information
 */
export interface MasterServiceLineInfo {
  code: string;
  name: string;
}

/**
 * Complete group graph data response
 */
export interface GroupGraphData {
  groupCode: string;
  groupDesc: string;
  clientCount: number;
  startDate: string;
  endDate: string;
  overall: ServiceLineGraphData;
  byMasterServiceLine: Record<string, ServiceLineGraphData>;
  masterServiceLines: MasterServiceLineInfo[];
}

/**
 * Query key factory for group graph data
 */
export const groupGraphDataKeys = {
  all: ['groupGraphData'] as const,
  lists: () => [...groupGraphDataKeys.all, 'list'] as const,
  list: (filters: Record<string, unknown>) => [...groupGraphDataKeys.lists(), filters] as const,
  details: () => [...groupGraphDataKeys.all, 'detail'] as const,
  detail: (groupCode: string) => [...groupGraphDataKeys.details(), groupCode, 'v2'] as const, // v2 = fixed downsampling
};

export interface UseGroupGraphDataParams {
  enabled?: boolean;
}

/**
 * Fetch daily transaction graph data for all clients in a group
 * Returns 24 months of daily metrics (Production, Adjustments, Disbursements, Billing, Provisions, WIP Balance)
 * aggregated across all clients in the group
 */
export function useGroupGraphData(
  groupCode: string,
  params: UseGroupGraphDataParams = {}
) {
  const { enabled = true } = params;

  return useQuery<GroupGraphData>({
    queryKey: groupGraphDataKeys.detail(groupCode),
    queryFn: async () => {
      const url = `/api/groups/${encodeURIComponent(groupCode)}/analytics/graphs`;
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch group graph data');
      
      const result = await response.json();
      return result.success ? result.data : result;
    },
    enabled: enabled && !!groupCode,
    staleTime: 30 * 60 * 1000, // 30 minutes - extended for analytics performance
    gcTime: 60 * 60 * 1000, // 60 minutes cache retention
    refetchOnMount: false, // Don't refetch if data is fresh
    refetchOnWindowFocus: false, // Don't refetch on window focus
    refetchOnReconnect: false, // Don't refetch on reconnect
    placeholderData: (previousData) => previousData, // Keep previous data while refetching
  });
}

