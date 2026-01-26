import { useQuery } from '@tanstack/react-query';
import type { QRMMonitoringStats } from '@/types/qrm';

export const qrmMonitoringKeys = {
  all: ['qrm', 'monitoring'] as const,
  stats: () => [...qrmMonitoringKeys.all, 'stats'] as const,
};

interface QRMMonitoringStatsResponse {
  success: boolean;
  data: QRMMonitoringStats;
}

export function useQRMMonitoringStats() {
  return useQuery({
    queryKey: qrmMonitoringKeys.stats(),
    queryFn: async () => {
      const res = await fetch('/api/qrm/monitoring/stats');
      if (!res.ok) {
        throw new Error('Failed to fetch monitoring stats');
      }
      const json: QRMMonitoringStatsResponse = await res.json();
      return json.data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
  });
}
