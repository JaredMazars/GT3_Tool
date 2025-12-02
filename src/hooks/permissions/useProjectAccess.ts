import { useQuery } from '@tanstack/react-query';

interface ProjectAccessResult {
  hasAccess: boolean;
  isLoading: boolean;
  accessType?: string;
  projectRole?: string;
  serviceLineRole?: string;
}

/**
 * Hook to check if user has access to a project
 * @param projectId - Project ID to check
 * @param requiredRole - Optional minimum project role required
 * @returns Object with hasAccess and isLoading
 */
export function useProjectAccess(
  projectId: number,
  requiredRole?: string
): ProjectAccessResult {
  const { data, isLoading } = useQuery({
    queryKey: ['projectAccess', projectId, requiredRole],
    queryFn: async () => {
      const response = await fetch(
        `/api/projects/${projectId}/access${requiredRole ? `?role=${requiredRole}` : ''}`
      );
      if (!response.ok) {
        throw new Error('Failed to fetch project access');
      }
      const data = await response.json();
      return data.data;
    },
  });

  if (isLoading) {
    return { hasAccess: false, isLoading: true };
  }

  return {
    hasAccess: data?.canAccess || false,
    isLoading: false,
    accessType: data?.accessType,
    projectRole: data?.projectRole,
    serviceLineRole: data?.serviceLineRole,
  };
}


