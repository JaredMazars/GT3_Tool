/**
 * React Query hook for Recoverability report
 * 
 * Supports fiscal year and custom date range filtering
 * Returns debtor aging and receipts data for employee's billed clients
 */

import { useQuery } from '@tanstack/react-query';
import type { RecoverabilityReportData } from '@/types/api';

export interface UseRecoverabilityReportParams {
  fiscalYear?: number;        // If provided, show fiscal year view
  fiscalMonth?: string;       // If provided with fiscalYear, show aging as of month end ('Sep', 'Oct', etc.)
  startDate?: string;         // For custom date range (ISO format)
  endDate?: string;           // For custom date range (ISO format)
  mode?: 'fiscal' | 'custom'; // View mode (defaults to 'fiscal')
  enabled?: boolean;
}

/**
 * Fetch recoverability data (debtors with aging and receipts) for the current user
 * 
 * Returns clients filtered by Biller = employee.EmpCode
 */
export function useRecoverabilityReport(params: UseRecoverabilityReportParams = {}) {
  const { fiscalYear, fiscalMonth, startDate, endDate, mode = 'fiscal', enabled = true } = params;

  return useQuery<RecoverabilityReportData>({
    queryKey: ['my-reports', 'recoverability', mode, fiscalYear, fiscalMonth, startDate, endDate],
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
      
      const response = await fetch(`/api/my-reports/recoverability?${queryParams}`);
      
      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Failed to fetch report' }));
        throw new Error(error.error || 'Failed to fetch recoverability report');
      }
      
      const data = await response.json();
      return data.data as RecoverabilityReportData;
    },
    enabled,
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
  });
}
