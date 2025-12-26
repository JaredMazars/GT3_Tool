/**
 * React Query hook for Profitability report
 */

import { useQuery } from '@tanstack/react-query';
import type { ProfitabilityReportData } from '@/types/api';

/**
 * Fetch profitability data (tasks with Net WIP) for the current user
 * 
 * Returns tasks filtered by employee category:
 * - CARL/Local/DIR: Tasks as Partner
 * - Others: Tasks as Manager
 */
export function useProfitabilityReport() {
  return useQuery<ProfitabilityReportData>({
    queryKey: ['my-reports', 'profitability'],
    queryFn: async () => {
      const response = await fetch('/api/my-reports/profitability');
      
      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Failed to fetch report' }));
        throw new Error(error.error || 'Failed to fetch profitability report');
      }
      
      const data = await response.json();
      return data.data as ProfitabilityReportData;
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 15 * 60 * 1000, // 15 minutes (formerly cacheTime)
  });
}

