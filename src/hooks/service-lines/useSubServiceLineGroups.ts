import { useQuery } from '@tanstack/react-query';
import { SubServiceLineGroup } from '@/types';

interface UseSubServiceLineGroupsOptions {
  serviceLine: string;
  enabled?: boolean;
}

interface SubServiceLineGroupsResponse {
  success: boolean;
  data: SubServiceLineGroup[];
}

/**
 * Hook to fetch SubServLineGroups for a specific master service line
 * @param options - Hook options including serviceLine and enabled flag
 * @returns React Query result with SubServLineGroups data
 */
export function useSubServiceLineGroups({
  serviceLine,
  enabled = true,
}: UseSubServiceLineGroupsOptions) {
  return useQuery({
    queryKey: ['sub-service-line-groups', serviceLine],
    queryFn: async () => {
      const response = await fetch(`/api/service-lines/${serviceLine}/sub-groups`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch sub service line groups');
      }
      
      const result: SubServiceLineGroupsResponse = await response.json();
      
      if (!result.success) {
        throw new Error('API returned unsuccessful response');
      }
      
      return result.data;
    },
    enabled: enabled && !!serviceLine,
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 15 * 60 * 1000, // 15 minutes (formerly cacheTime)
  });
}










































