import { useQuery } from '@tanstack/react-query';
import { hasServiceLineRole } from '@/lib/utils/roleHierarchy';

interface ServiceLineAccessResult {
  hasAccess: boolean;
  isLoading: boolean;
  role?: string;
}

/**
 * Hook to check if user has access to a service line
 * @param serviceLine - Service line to check
 * @param minimumRole - Optional minimum role required
 * @returns Object with hasAccess and isLoading
 */
export function useServiceLineAccess(
  serviceLine: string,
  minimumRole?: string
): ServiceLineAccessResult {
  const { data, isLoading } = useQuery({
    queryKey: ['serviceLineAccess', serviceLine],
    queryFn: async () => {
      const response = await fetch('/api/service-lines/access');
      if (!response.ok) {
        throw new Error('Failed to fetch service line access');
      }
      const data = await response.json();
      return data.data || [];
    },
  });

  if (isLoading) {
    return { hasAccess: false, isLoading: true };
  }

  const userServiceLines = data || [];
  const serviceLineAccess = userServiceLines.find((sl: any) => sl.serviceLine === serviceLine);

  if (!serviceLineAccess) {
    return { hasAccess: false, isLoading: false };
  }

  // If minimum role specified, check role hierarchy
  if (minimumRole) {
    const hasRequiredRole = hasServiceLineRole(serviceLineAccess.role, minimumRole);
    return {
      hasAccess: hasRequiredRole,
      isLoading: false,
      role: serviceLineAccess.role,
    };
  }

  return {
    hasAccess: true,
    isLoading: false,
    role: serviceLineAccess.role,
  };
}



