import { useQuery } from '@tanstack/react-query';
import { MultiSelectOption } from '@/components/ui';

interface GlobalClientPlannerFiltersResponse {
  clients: MultiSelectOption[];
  groups: MultiSelectOption[];
  partners: MultiSelectOption[];
  tasks: MultiSelectOption[];
  managers: MultiSelectOption[];
  serviceLines: MultiSelectOption[];
  subServiceLineGroups: MultiSelectOption[];
}

interface UseGlobalClientPlannerFiltersOptions {
  enabled?: boolean;
}

/**
 * Hook to fetch filter options for global client planner
 * Returns unique values for all filter types including service lines
 * 
 * Requires Country Management access
 */
export function useGlobalClientPlannerFilters({
  enabled = true
}: UseGlobalClientPlannerFiltersOptions = {}) {
  return useQuery<GlobalClientPlannerFiltersResponse>({
    queryKey: ['global-planner', 'clients', 'filters'],
    queryFn: async () => {
      const response = await fetch('/api/planner/clients/filters');
      
      if (!response.ok) {
        throw new Error('Failed to fetch global client planner filters');
      }
      
      const result = await response.json();
      return result.data || result;
    },
    enabled,
    staleTime: 30 * 60 * 1000, // 30 minutes
    gcTime: 60 * 60 * 1000, // 1 hour
  });
}
