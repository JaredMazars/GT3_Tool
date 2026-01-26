import { useQuery } from '@tanstack/react-query';
import { MultiSelectOption } from '@/components/ui';

interface GlobalEmployeePlannerFiltersResponse {
  employees: MultiSelectOption[];
  jobGrades: MultiSelectOption[];
  offices: MultiSelectOption[];
  clients: MultiSelectOption[];
  taskCategories: MultiSelectOption[];
  serviceLines: MultiSelectOption[];
  subServiceLineGroups: MultiSelectOption[];
}

interface UseGlobalEmployeePlannerFiltersOptions {
  enabled?: boolean;
}

/**
 * Hook to fetch filter options for global employee planner
 * Returns unique values for all filter types including service lines
 * 
 * Requires Country Management access
 */
export function useGlobalEmployeePlannerFilters({
  enabled = true
}: UseGlobalEmployeePlannerFiltersOptions = {}) {
  return useQuery<GlobalEmployeePlannerFiltersResponse>({
    queryKey: ['global-planner', 'employees', 'filters'],
    queryFn: async () => {
      const response = await fetch('/api/planner/employees/filters');
      
      if (!response.ok) {
        throw new Error('Failed to fetch global employee planner filters');
      }
      
      const result = await response.json();
      return result.data || result;
    },
    enabled,
    staleTime: 30 * 60 * 1000, // 30 minutes
    gcTime: 60 * 60 * 1000, // 1 hour
  });
}
