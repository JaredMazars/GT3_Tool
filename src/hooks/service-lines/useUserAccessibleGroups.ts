import { useQuery } from '@tanstack/react-query';
import type { GroupedAccessibleGroups } from '@/app/api/service-lines/user-accessible-groups/route';

interface UserAccessibleGroupsResponse {
  success: boolean;
  data: GroupedAccessibleGroups[];
}

/**
 * Hook to fetch all subservice line groups accessible to the current user
 * Groups are organized by master service line
 * @returns React Query result with grouped accessible groups data
 */
export function useUserAccessibleGroups() {
  return useQuery({
    queryKey: ['user-accessible-groups'],
    queryFn: async () => {
      const response = await fetch('/api/service-lines/user-accessible-groups');
      
      if (!response.ok) {
        throw new Error('Failed to fetch user accessible groups');
      }
      
      const result: UserAccessibleGroupsResponse = await response.json();
      
      if (!result.success) {
        throw new Error('API returned unsuccessful response');
      }
      
      return result.data;
    },
    staleTime: 10 * 60 * 1000, // 10 minutes - matches service line cache pattern
    gcTime: 15 * 60 * 1000, // 15 minutes (formerly cacheTime)
  });
}

