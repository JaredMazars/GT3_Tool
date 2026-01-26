import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes - standardized for all data
      gcTime: 10 * 60 * 1000, // 10 minutes - cache retention (formerly cacheTime)
      refetchOnWindowFocus: false, // Don't refetch on tab focus - reduces unnecessary requests
      retry: 1, // Only retry once on failure
      refetchOnMount: false, // Don't refetch if data is fresh
    },
    mutations: {
      retry: 0, // Don't retry mutations - fail fast for user actions
    },
  },
});

/**
 * Query configuration presets for different data types
 * Use these in specific hooks to override defaults
 */
export const queryPresets = {
  // For relatively static data (clients, service lines)
  static: {
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 15 * 60 * 1000, // 15 minutes
  },
  // For frequently changing data (projects list, notifications)
  dynamic: {
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  },
  // For real-time or always fresh data
  realtime: {
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
  },
  // For detail pages that don't change often
  detail: {
    staleTime: 3 * 60 * 1000, // 3 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  },
};























