/**
 * React Query hook for Profitability report
 * 
 * Supports fiscal year and custom date range filtering
 */

import { useQuery } from '@tanstack/react-query';
import type { ProfitabilityReportData } from '@/types/api';

export interface UseProfitabilityReportParams {
  fiscalYear?: number;        // If provided, show fiscal year view
  fiscalMonth?: string;       // If provided with fiscalYear, show cumulative through month ('Sep', 'Oct', etc.)
  startDate?: string;         // For custom date range (ISO format)
  endDate?: string;           // For custom date range (ISO format)
  mode?: 'fiscal' | 'custom'; // View mode (defaults to 'fiscal')
  enabled?: boolean;
}

/**
 * Fetch profitability data (tasks with period-filtered WIP) for the current user
 * 
 * Returns tasks filtered by employee category:
 * - CARL/Local/DIR: Tasks as Partner
 * - Others: Tasks as Manager
 */
export function useProfitabilityReport(params: UseProfitabilityReportParams = {}) {
  const { fiscalYear, fiscalMonth, startDate, endDate, mode = 'fiscal', enabled = true } = params;

  return useQuery<ProfitabilityReportData>({
    queryKey: ['my-reports', 'profitability', mode, fiscalYear, fiscalMonth, startDate, endDate],
    queryFn: async () => {
      // Build query parameters
      const queryParams = new URLSearchParams();
      queryParams.set('mode', mode);
      
      if (mode === 'fiscal' && fiscalYear) {
        queryParams.set('fiscalYear', fiscalYear.toString());
        if (fiscalMonth) {
          queryParams.set('fiscalMonth', fiscalMonth);
        }
      } else if (mode === 'custom' && startDate && endDate) {
        queryParams.set('startDate', startDate);
        queryParams.set('endDate', endDate);
      }
      
      const response = await fetch(`/api/my-reports/profitability?${queryParams}`);
      
      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Failed to fetch report' }));
        throw new Error(error.error || 'Failed to fetch profitability report');
      }
      
      const data = await response.json();
      return data.data as ProfitabilityReportData;
    },
    enabled,
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes (longer for fiscal years)
  });
}

