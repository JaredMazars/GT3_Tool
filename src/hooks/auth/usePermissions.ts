/**
 * Permission hooks for UI components
 * Provides hooks to check user permissions for various features
 */

import { useQuery } from '@tanstack/react-query';
import { Project } from '@/types';

/**
 * Check if current user can approve acceptance/engagement letter for a project
 */
export function useCanApproveAcceptance(project: Project | null | undefined) {
  return useQuery({
    queryKey: ['canApproveAcceptance', project?.id],
    queryFn: async () => {
      if (!project) return false;

      const response = await fetch(`/api/projects/${project.id}/permissions/approve-acceptance`);
      if (!response.ok) return false;

      const data = await response.json();
      return data.data?.allowed || false;
    },
    enabled: !!project,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Get current user's system role
 */
export function useUserSystemRole() {
  return useQuery({
    queryKey: ['userSystemRole'],
    queryFn: async () => {
      const response = await fetch('/api/auth/me');
      if (!response.ok) return null;

      const data = await response.json();
      return data.data?.systemRole || data.data?.role || null;
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}

/**
 * Get user's role in a specific service line
 */
export function useUserServiceLineRole(serviceLine: string | null | undefined) {
  return useQuery({
    queryKey: ['userServiceLineRole', serviceLine],
    queryFn: async () => {
      if (!serviceLine) return null;

      const response = await fetch(`/api/service-lines/${serviceLine}/my-role`);
      if (!response.ok) return null;

      const data = await response.json();
      return data.data?.role || null;
    },
    enabled: !!serviceLine,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Check if user has a specific feature permission on a project
 */
export function useHasFeaturePermission(
  projectId: number | null | undefined,
  feature: string
) {
  return useQuery({
    queryKey: ['featurePermission', projectId, feature],
    queryFn: async () => {
      if (!projectId) return false;

      const response = await fetch(
        `/api/projects/${projectId}/permissions/check?feature=${feature}`
      );
      if (!response.ok) return false;

      const data = await response.json();
      return data.data?.allowed || false;
    },
    enabled: !!projectId && !!feature,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Check if user is a system superuser
 */
export function useIsSuperuser() {
  return useQuery({
    queryKey: ['isSuperuser'],
    queryFn: async () => {
      const response = await fetch('/api/auth/me');
      if (!response.ok) return false;

      const data = await response.json();
      const systemRole = data.data?.systemRole || data.data?.role;
      return systemRole === 'SUPERUSER';
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}

/**
 * Check if user is a Partner (service line ADMIN) for a specific service line
 */
export function useIsPartner(serviceLine: string | null | undefined) {
  const { data: role } = useUserServiceLineRole(serviceLine);
  return role === 'ADMIN';
}

/**
 * Check if user is a Manager in a specific service line
 */
export function useIsManager(serviceLine: string | null | undefined) {
  const { data: role } = useUserServiceLineRole(serviceLine);
  return role === 'MANAGER';
}

/**
 * Get formatted role display name
 */
export function useFormattedServiceLineRole(serviceLine: string | null | undefined) {
  const { data: role } = useUserServiceLineRole(serviceLine);

  if (!role) return null;

  const roleMap: Record<string, string> = {
    ADMIN: 'Partner',
    MANAGER: 'Manager',
    USER: 'Staff',
    VIEWER: 'Viewer',
  };

  return roleMap[role] || role;
}
















