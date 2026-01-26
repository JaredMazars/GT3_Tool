/**
 * React Query hook for client acceptance status
 */

import { useQuery } from '@tanstack/react-query';
import { ClientAcceptanceStatus } from '@/lib/services/acceptance/clientAcceptanceService';

export const clientAcceptanceKeys = {
  all: ['client-acceptance'] as const,
  status: (GSClientID: string) => [...clientAcceptanceKeys.all, 'status', GSClientID] as const,
};

/**
 * Fetch client acceptance status by GSClientID
 */
export function useClientAcceptanceStatus(GSClientID: string | null | undefined) {
  return useQuery({
    queryKey: clientAcceptanceKeys.status(GSClientID || ''),
    queryFn: async () => {
      // Guard: Return null if no GSClientID
      if (!GSClientID || GSClientID === '' || GSClientID === 'undefined') {
        return null;
      }

      const response = await fetch(`/api/clients/${GSClientID}/acceptance/status`);
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch client acceptance status');
      }
      
      const data = await response.json();
      return data.data as ClientAcceptanceStatus;
    },
    enabled: !!GSClientID && GSClientID !== '' && GSClientID !== 'undefined',
    staleTime: 1000 * 30, // 30 seconds
    gcTime: 1000 * 60 * 5, // 5 minutes garbage collection
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
  });
}
