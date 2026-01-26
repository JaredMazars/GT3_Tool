/**
 * BD Analytics React Query Hooks
 */

import { useQuery } from '@tanstack/react-query';
import type { BDAnalyticsFiltersInput } from '@/lib/validation/schemas';

/**
 * Fetch pipeline analytics
 */
export function usePipelineAnalytics(filters: BDAnalyticsFiltersInput = {}) {
  return useQuery({
    queryKey: ['bd-analytics-pipeline', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.serviceLine) params.append('serviceLine', filters.serviceLine);
      if (filters.assignedTo) params.append('assignedTo', filters.assignedTo);

      const res = await fetch(`/api/bd/analytics/pipeline?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch pipeline analytics');
      const data = await res.json();
      return data.data;
    },
  });
}

/**
 * Fetch conversion analytics
 */
export function useConversionAnalytics(filters: BDAnalyticsFiltersInput = {}) {
  return useQuery({
    queryKey: ['bd-analytics-conversion', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.serviceLine) params.append('serviceLine', filters.serviceLine);
      if (filters.assignedTo) params.append('assignedTo', filters.assignedTo);
      if (filters.fromDate) params.append('fromDate', filters.fromDate.toISOString());
      if (filters.toDate) params.append('toDate', filters.toDate.toISOString());

      const res = await fetch(`/api/bd/analytics/conversion?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch conversion analytics');
      const data = await res.json();
      return data.data;
    },
  });
}

/**
 * Fetch forecast analytics
 */
export function useForecastAnalytics(filters: { serviceLine?: string; assignedTo?: string } = {}) {
  return useQuery({
    queryKey: ['bd-analytics-forecast', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.serviceLine) params.append('serviceLine', filters.serviceLine);
      if (filters.assignedTo) params.append('assignedTo', filters.assignedTo);

      const res = await fetch(`/api/bd/analytics/forecast?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch forecast analytics');
      const data = await res.json();
      return data.data;
    },
  });
}


