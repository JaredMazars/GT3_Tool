'use client';

import { useQuery } from '@tanstack/react-query';

// Query Keys
export const clientFilterKeys = {
  all: ['client-filters'] as const,
  list: (params?: Record<string, string | number | null | undefined>) => 
    [...clientFilterKeys.all, 'list', params] as const,
};

// Types
export interface ClientFilterOptions {
  industries: string[];
  groups: { code: string; name: string }[];
}

export interface UseClientFiltersParams {
  industrySearch?: string;
  groupSearch?: string;
  enabled?: boolean;
}

/**
 * Fetch client filter options (industries and groups)
 * Used to populate filter dropdowns independently from the main client list
 * Supports separate searches for industries and groups
 */
export function useClientFilters(params: UseClientFiltersParams = {}) {
  const {
    industrySearch = '',
    groupSearch = '',
    enabled = true,
  } = params;

  return useQuery<ClientFilterOptions>({
    queryKey: clientFilterKeys.list({ industrySearch, groupSearch }),
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      if (industrySearch) searchParams.set('industrySearch', industrySearch);
      if (groupSearch) searchParams.set('groupSearch', groupSearch);
      
      const url = `/api/clients/filters?${searchParams.toString()}`;
      
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch client filter options');
      
      const result = await response.json();
      
      return result.success ? result.data : result;
    },
    enabled,
    staleTime: 30 * 60 * 1000, // 30 minutes - filter options are relatively static
    gcTime: 45 * 60 * 1000, // 45 minutes cache retention
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    placeholderData: (previousData) => previousData,
  });
}


