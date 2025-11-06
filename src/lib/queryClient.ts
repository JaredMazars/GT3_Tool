import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes - data considered fresh
      gcTime: 10 * 60 * 1000, // 10 minutes - cache retention (formerly cacheTime)
      refetchOnWindowFocus: false, // Don't refetch on tab focus
      retry: 1, // Only retry once on failure
      refetchOnMount: false, // Don't refetch if data is fresh
    },
    mutations: {
      retry: 0, // Don't retry mutations
    },
  },
});











