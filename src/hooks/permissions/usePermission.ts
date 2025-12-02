import { useQuery, useQueries } from '@tanstack/react-query';

type PermissionAction = 'CREATE' | 'READ' | 'UPDATE' | 'DELETE';

interface UsePermissionResult {
  hasPermission: boolean;
  isLoading: boolean;
  isError: boolean;
}

/**
 * Hook to check if the current user has permission for a specific action
 * @param resourceKey - The resource identifier (e.g., "clients", "projects.create")
 * @param action - The action to check (CREATE, READ, UPDATE, DELETE)
 * @returns Object with hasPermission, isLoading, and isError
 */
export function usePermission(
  resourceKey: string,
  action: PermissionAction
): UsePermissionResult {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['permission', resourceKey, action],
    queryFn: async () => {
      const res = await fetch('/api/permissions/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resourceKey, action }),
      });
      
      if (!res.ok) {
        throw new Error('Failed to check permission');
      }
      
      const json = await res.json();
      return json.data as { hasPermission: boolean };
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
  });

  return {
    hasPermission: data?.hasPermission ?? false,
    isLoading,
    isError,
  };
}

/**
 * Hook to check if user has any of the specified permissions
 * @param resourceKey - The resource identifier
 * @param actions - Array of actions to check
 * @returns Object with hasPermission (true if any action is allowed), isLoading, and isError
 */
export function usePermissionAny(
  resourceKey: string,
  actions: PermissionAction[]
): UsePermissionResult {
  const results = useQueries({
    queries: actions.map(action => ({
      queryKey: ['permission', resourceKey, action],
      queryFn: async () => {
        const res = await fetch('/api/permissions/check', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ resourceKey, action }),
        });
        
        if (!res.ok) {
          throw new Error('Failed to check permission');
        }
        
        const json = await res.json();
        return json.data as { hasPermission: boolean };
      },
      staleTime: 5 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
    })),
  });

  const isLoading = results.some(r => r.isLoading);
  const isError = results.some(r => r.isError);
  const hasPermission = results.some(r => r.data?.hasPermission ?? false);

  return {
    hasPermission,
    isLoading,
    isError,
  };
}

/**
 * Hook to check if user has all of the specified permissions
 * @param resourceKey - The resource identifier
 * @param actions - Array of actions to check
 * @returns Object with hasPermission (true if all actions are allowed), isLoading, and isError
 */
export function usePermissionAll(
  resourceKey: string,
  actions: PermissionAction[]
): UsePermissionResult {
  const results = useQueries({
    queries: actions.map(action => ({
      queryKey: ['permission', resourceKey, action],
      queryFn: async () => {
        const res = await fetch('/api/permissions/check', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ resourceKey, action }),
        });
        
        if (!res.ok) {
          throw new Error('Failed to check permission');
        }
        
        const json = await res.json();
        return json.data as { hasPermission: boolean };
      },
      staleTime: 5 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
    })),
  });

  const isLoading = results.some(r => r.isLoading);
  const isError = results.some(r => r.isError);
  const hasPermission = results.every(r => r.data?.hasPermission ?? false);

  return {
    hasPermission,
    isLoading,
    isError,
  };
}

