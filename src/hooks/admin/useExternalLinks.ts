/**
 * Hook for fetching external links
 * Uses React Query for automatic caching and deduplication
 */

import { useQuery, useQueryClient } from '@tanstack/react-query';

export interface ExternalLink {
  id: number;
  name: string;
  url: string;
  icon: string;
}

/**
 * Query keys for external links
 */
export const externalLinksKeys = {
  all: ['externalLinks'] as const,
  active: ['externalLinks', 'active'] as const,
};

/**
 * Fetch active external links
 * Cached for 10 minutes to reduce API calls during navigation
 */
export function useExternalLinks() {
  return useQuery({
    queryKey: externalLinksKeys.active,
    queryFn: async (): Promise<ExternalLink[]> => {
      const response = await fetch('/api/admin/external-links?activeOnly=true');
      
      if (!response.ok) {
        throw new Error('Failed to fetch external links');
      }

      const data = await response.json();
      return data.success ? data.data : [];
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 15 * 60 * 1000, // 15 minutes
    refetchOnWindowFocus: false, // Don't refetch on focus
    refetchOnMount: false, // Don't refetch if data is fresh
    // Silently fail - links just won't show
    retry: 1,
  });
}

/**
 * Hook to manually refresh external links
 * Useful for after adding/editing/deleting links
 */
export function useRefreshExternalLinks() {
  const queryClient = useQueryClient();
  
  return () => {
    queryClient.invalidateQueries({ queryKey: externalLinksKeys.active });
  };
}

