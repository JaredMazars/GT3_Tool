'use client';

import { useQuery } from '@tanstack/react-query';

// Query Keys
export const taskFilterKeys = {
  all: ['task-filters'] as const,
  list: (params?: Record<string, string | number | null | undefined>) => 
    [...taskFilterKeys.all, 'list', params] as const,
};

// Types
export interface FilterMetadata {
  hasMore: boolean;
  total: number;
  returned: number;
}

export interface TaskFilterOptions {
  clients: Array<{ id: number; code: string; name: string }>;
  taskNames: Array<{ name: string; code: string }>;
  partners: Array<{ id: string; name: string }>;
  managers: Array<{ id: string; name: string }>;
  serviceLines: string[];
  metadata?: {
    clients?: FilterMetadata;
    taskNames?: FilterMetadata;
    partners?: FilterMetadata;
    managers?: FilterMetadata;
    serviceLines?: FilterMetadata;
  };
}

export interface UseTaskFiltersParams {
  serviceLine?: string;
  subServiceLineGroup?: string;
  clientSearch?: string;
  taskNameSearch?: string;
  partnerSearch?: string;
  managerSearch?: string;
  enabled?: boolean;
}

/**
 * Fetch task filter options (clients, task names, partners, managers, service lines)
 * Used to populate filter dropdowns independently from the main task list
 * Supports separate searches for each filter type
 * 
 * Requires minimum 2 characters for search queries
 */
export function useTaskFilters(params: UseTaskFiltersParams = {}) {
  const {
    serviceLine,
    subServiceLineGroup,
    clientSearch = '',
    taskNameSearch = '',
    partnerSearch = '',
    managerSearch = '',
    enabled = true,
  } = params;

  // Don't execute query if any search is too short
  const clientValid = !clientSearch || clientSearch.length >= 2;
  const taskNameValid = !taskNameSearch || taskNameSearch.length >= 2;
  const partnerValid = !partnerSearch || partnerSearch.length >= 2;
  const managerValid = !managerSearch || managerSearch.length >= 2;
  
  const shouldExecute = enabled && (
    clientValid && 
    taskNameValid && 
    partnerValid && 
    managerValid
  );

  return useQuery<TaskFilterOptions>({
    queryKey: taskFilterKeys.list({ 
      serviceLine,
      subServiceLineGroup,
      clientSearch, 
      taskNameSearch, 
      partnerSearch, 
      managerSearch 
    }),
    queryFn: async () => {
      
      const searchParams = new URLSearchParams();
      if (serviceLine) searchParams.set('serviceLine', serviceLine);
      if (subServiceLineGroup) searchParams.set('subServiceLineGroup', subServiceLineGroup);
      if (clientSearch) searchParams.set('clientSearch', clientSearch);
      if (taskNameSearch) searchParams.set('taskNameSearch', taskNameSearch);
      if (partnerSearch) searchParams.set('partnerSearch', partnerSearch);
      if (managerSearch) searchParams.set('managerSearch', managerSearch);
      
      const url = `/api/tasks/filters?${searchParams.toString()}`;
      
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch task filter options');
      
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
