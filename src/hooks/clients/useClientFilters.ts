'use client';

import { useQuery } from '@tanstack/react-query';

// Query Keys
export const clientFilterKeys = {
  all: ['client-filters'] as const,
  list: (params?: Record<string, string | number | null | undefined>) => 
    [...clientFilterKeys.all, 'list', params] as const,
};

// Types
export interface FilterMetadata {
  hasMore: boolean;
  total: number;
  returned: number;
}

export interface ClientFilterOptions {
  industries: string[];
  groups: { code: string; name: string }[];
  metadata?: {
    industries?: FilterMetadata;
    groups?: FilterMetadata;
  };
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
 * 
 * Requires minimum 2 characters for search queries
 */
export function useClientFilters(params: UseClientFiltersParams = {}) {
  const {
    industrySearch = '',
    groupSearch = '',
    enabled = true,
  } = params;

  // Don't execute query if both searches are too short
  const industryValid = !industrySearch || industrySearch.length >= 2;
  const groupValid = !groupSearch || groupSearch.length >= 2;
  const shouldExecute = enabled && (industryValid || groupValid);

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
    enabled: shouldExecute,
    staleTime: 60 * 60 * 1000, // 60 minutes - filter options are relatively static (increased from 30)
    gcTime: 90 * 60 * 1000, // 90 minutes cache retention (increased from 45)
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    placeholderData: (previousData) => previousData,
  });
}


