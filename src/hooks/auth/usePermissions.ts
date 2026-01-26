/**
 * Permission hooks for UI components
 * Provides hooks to check user permissions for various features
 */

import { useQuery } from '@tanstack/react-query';
import { Task } from '@/types';

interface CurrentUser {
  id: string;
  email: string;
  name: string;
  systemRole: string;
  employeeCode: string | null;
}

/**
 * Get current user information
 */
export function useCurrentUser() {
  return useQuery({
    queryKey: ['currentUser'],
    queryFn: async (): Promise<CurrentUser | null> => {
      const response = await fetch('/api/auth/me');
      if (!response.ok) return null;

      const data = await response.json();
      return data.data || null;
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}

/**
 * Check if current user can approve acceptance/engagement letter for a task
 */
export function useCanApproveAcceptance(task: Task | null | undefined) {
  return useQuery({
    queryKey: ['canApproveAcceptance', task?.id],
    queryFn: async () => {
      if (!task) return false;

      const response = await fetch(`/api/tasks/${task.id}/permissions/approve-acceptance`);
      if (!response.ok) return false;

      const data = await response.json();
      return data.data?.allowed || false;
    },
    enabled: !!task && !!task.id,
    retry: 2, // Limit retries to prevent infinite loading
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
 * Check if user has a specific feature permission on a task
 */
export function useHasFeaturePermission(
  taskId: number | null | undefined,
  feature: string
) {
  return useQuery({
    queryKey: ['featurePermission', taskId, feature],
    queryFn: async () => {
      if (!taskId) return false;

      const response = await fetch(
        `/api/tasks/${taskId}/permissions/check?feature=${feature}`
      );
      if (!response.ok) return false;

      const data = await response.json();
      return data.data?.allowed || false;
    },
    enabled: !!taskId && !!feature,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Check if user is a System Admin
 */
export function useIsSystemAdmin() {
  return useQuery({
    queryKey: ['isSystemAdmin'],
    queryFn: async () => {
      const response = await fetch('/api/auth/me');
      if (!response.ok) return false;

      const data = await response.json();
      const systemRole = data.data?.systemRole || data.data?.role;
      return systemRole === 'SYSTEM_ADMIN';
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}

/**
 * @deprecated Use useIsSystemAdmin instead
 */
export const useIsSuperuser = useIsSystemAdmin;

/**
 * Check if user is a Partner (service line ADMIN) for a specific service line
 */
export function useIsPartner(serviceLine: string | null | undefined) {
  const { data: role } = useUserServiceLineRole(serviceLine);
  return role === 'ADMINISTRATOR';
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

/**
 * Check if user has a specific feature permission
 * @param feature - The feature to check
 * @param serviceLine - Optional service line context
 */
export function useFeature(feature: string, serviceLine?: string) {
  return useQuery({
    queryKey: ['userFeature', feature, serviceLine],
    queryFn: async (): Promise<boolean> => {
      const params = new URLSearchParams({ feature });
      if (serviceLine) {
        params.append('serviceLine', serviceLine);
      }
      
      const response = await fetch(`/api/permissions/check?${params.toString()}`);
      if (!response.ok) return false;

      const data = await response.json();
      return data.data?.hasFeature || false;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
















