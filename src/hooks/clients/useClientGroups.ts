'use client';

import { useQuery } from '@tanstack/react-query';

// Query Keys - v2 includes clientCount in response
export const clientGroupKeys = {
  all: ['client-groups', 'v2'] as const,
  list: (params?: Record<string, string | number | null | undefined>) => 
    [...clientGroupKeys.all, 'list', params] as const,
};

// Types
export interface ClientGroup {
  groupCode: string;
  groupDesc: string;
  clientCount: number;
}

interface ClientGroupsResponse {
  groups: ClientGroup[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface UseClientGroupsParams {
  search?: string;
  page?: number;
  limit?: number;
  groupCodes?: string[]; // Filter by specific group codes
  enabled?: boolean;
}

/**
 * Fetch client groups list with server-side pagination and search
 */
export function useClientGroups(params: UseClientGroupsParams = {}) {
  const {
    search = '',
    page = 1,
    limit = 50,
    groupCodes = [],
    enabled = true,
  } = params;

  return useQuery<ClientGroupsResponse>({
    queryKey: clientGroupKeys.list({ search, page, limit, groupCodes: groupCodes.join(',') }),
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      if (search) searchParams.set('search', search);
      searchParams.set('page', page.toString());
      searchParams.set('limit', limit.toString());
      
      // Add array filters
      groupCodes.forEach(code => searchParams.append('groupCodes[]', code));
      
      const url = `/api/groups?${searchParams.toString()}`;
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch client groups');
      
      const result = await response.json();
      return result.success ? result.data : result;
    },
    enabled,
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 15 * 60 * 1000, // 15 minutes cache retention
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    placeholderData: (previousData) => previousData,
  });
}



































