/**
 * React Query hook for My Reports Overview data
 * 
 * Fetches monthly financial metrics - supports fiscal year, custom date range, or rolling 24-month
 */

import { useQuery } from '@tanstack/react-query';
import type { ApiResponse, MyReportsOverviewData } from '@/types/api';

export interface UseMyReportsOverviewParams {
  fiscalYear?: number | 'all'; // If provided, show fiscal year view or all years comparison
  startDate?: string;          // For custom date range (ISO format)
  endDate?: string;            // For custom date range (ISO format)
  mode?: 'fiscal' | 'custom';  // View mode (defaults to 'fiscal')
  serviceLines?: string[];     // Optional array of masterCode values to filter by service line
  enabled?: boolean;
}

/**
 * Fetch overview report data
 */
export function useMyReportsOverview(params: UseMyReportsOverviewParams = {}) {
  const { fiscalYear, startDate, endDate, mode = 'fiscal', serviceLines, enabled = true } = params;

  return useQuery({
    queryKey: ['my-reports', 'overview', mode, fiscalYear, startDate, endDate, serviceLines?.join(',') || 'all'],
    queryFn: async () => {
      // Build query parameters
      const queryParams = new URLSearchParams();
      queryParams.set('mode', mode);
      
      if (mode === 'fiscal' && fiscalYear !== undefined) {
        queryParams.set('fiscalYear', fiscalYear.toString());
      } else if (mode === 'custom' && startDate && endDate) {
        queryParams.set('startDate', startDate);
        queryParams.set('endDate', endDate);
      }
      
      if (serviceLines && serviceLines.length > 0) {
        queryParams.set('serviceLines', serviceLines.join(','));
      }
      
      const response = await fetch(`/api/my-reports/overview?${queryParams}`);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to fetch overview report');
      }

      const result: ApiResponse<MyReportsOverviewData> = await response.json();
      
      if (!result.success || !result.data) {
        throw new Error(result.error || 'Invalid response from server');
      }

      return result.data;
    },
    enabled,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes (longer for fiscal years)
  });
}

