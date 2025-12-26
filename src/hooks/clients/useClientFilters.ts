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
  partners: { code: string; name: string }[];
  managers: { code: string; name: string }[];
  groups: { code: string; name: string }[];
  metadata?: {
    partners?: FilterMetadata;
    managers?: FilterMetadata;
    groups?: FilterMetadata;
  };
}

export interface UseClientFiltersParams {
  partnerSearch?: string;
  managerSearch?: string;
  groupSearch?: string;
  enabled?: boolean;
}

/**
 * Fetch client filter options (partners, managers, and groups)
 * Used to populate filter dropdowns independently from the main client list
 * Supports separate searches for partners, managers, and groups
 * 
 * Requires minimum 2 characters for search queries
 */
export function useClientFilters(params: UseClientFiltersParams = {}) {
  const {
    partnerSearch = '',
    managerSearch = '',
    groupSearch = '',
    enabled = true,
  } = params;

  // Don't execute query if all searches are too short
  const partnerValid = !partnerSearch || partnerSearch.length >= 2;
  const managerValid = !managerSearch || managerSearch.length >= 2;
  const groupValid = !groupSearch || groupSearch.length >= 2;
  const shouldExecute = enabled && (partnerValid || managerValid || groupValid);

  return useQuery<ClientFilterOptions>({
    queryKey: clientFilterKeys.list({ partnerSearch, managerSearch, groupSearch }),
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      if (partnerSearch) searchParams.set('partnerSearch', partnerSearch);
      if (managerSearch) searchParams.set('managerSearch', managerSearch);
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


