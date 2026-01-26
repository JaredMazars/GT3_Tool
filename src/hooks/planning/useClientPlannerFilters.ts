import { useQuery } from '@tanstack/react-query';
import { MultiSelectOption } from '@/components/ui';

interface ClientPlannerFiltersResponse {
  clients: MultiSelectOption[];
  groups: MultiSelectOption[];
  partners: MultiSelectOption[];
  tasks: MultiSelectOption[];
  managers: MultiSelectOption[];
}

interface UseClientPlannerFiltersOptions {
  serviceLine: string;
  subServiceLineGroup: string;
  enabled?: boolean;
}

/**
 * Hook to fetch filter options for client planner
 * Returns unique values for all filter types
 * 
 * Performance optimizations:
 * - Server-side Redis caching (30min TTL for relatively static data)
 * - Increased staleTime to match server cache (30 min)
 */
export function useClientPlannerFilters({
  serviceLine,
  subServiceLineGroup,
  enabled = true
}: UseClientPlannerFiltersOptions) {
  return useQuery<ClientPlannerFiltersResponse>({
    queryKey: ['planner', 'filters', serviceLine, subServiceLineGroup],
    queryFn: async () => {
      const response = await fetch(
        `/api/service-lines/${serviceLine}/${subServiceLineGroup}/planner/clients/filters`
      );
      
      if (!response.ok) {
        throw new Error('Failed to fetch client planner filters');
      }
      
      const result = await response.json();
      return result.data || result;
    },
    enabled: enabled && !!serviceLine && !!subServiceLineGroup,
    staleTime: 30 * 60 * 1000, // Match Redis TTL (30 minutes)
    gcTime: 60 * 60 * 1000, // Keep in cache for 1 hour
  });
}










