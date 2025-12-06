'use client';

import { useQuery } from '@tanstack/react-query';

// Query Keys
export const clientGroupKeys = {
  all: ['client-groups'] as const,
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
    enabled = true,
  } = params;

  return useQuery<ClientGroupsResponse>({
    queryKey: clientGroupKeys.list({ search, page, limit }),
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      if (search) searchParams.set('search', search);
      searchParams.set('page', page.toString());
      searchParams.set('limit', limit.toString());
      
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

