import { useQuery } from '@tanstack/react-query';

interface TaskAccessResult {
  hasAccess: boolean;
  isLoading: boolean;
  accessType?: string;
  taskRole?: string;
  serviceLineRole?: string;
}

/**
 * Hook to check if user has access to a task
 * @param taskId - Task ID to check
 * @param requiredRole - Optional minimum task role required
 * @returns Object with hasAccess and isLoading
 */
export function useTaskAccess(
  taskId: number,
  requiredRole?: string
): TaskAccessResult {
  const { data, isLoading } = useQuery({
    queryKey: ['taskAccess', taskId, requiredRole],
    queryFn: async () => {
      const response = await fetch(
        `/api/tasks/${taskId}/access${requiredRole ? `?role=${requiredRole}` : ''}`
      );
      if (!response.ok) {
        throw new Error('Failed to fetch task access');
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
    taskRole: data?.taskRole,
    serviceLineRole: data?.serviceLineRole,
  };
}










































