'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// Query Keys
export const projectTeamKeys = {
  all: (projectId: string) => ['projects', projectId, 'team'] as const,
  list: (projectId: string) => [...projectTeamKeys.all(projectId), 'list'] as const,
};

// Types
export interface ProjectTeamMember {
  id: number;
  userId: string;
  projectId: number;
  role: 'ADMIN' | 'EDITOR' | 'VIEWER';
  createdAt: string;
  User: {
    id: string;
    name: string;
    email: string;
    image?: string | null;
  };
}

/**
 * Fetch team members for a project
 * Only loads when explicitly called (lazy loading)
 */
export function useProjectTeam(projectId: string, enabled = true) {
  return useQuery<ProjectTeamMember[]>({
    queryKey: projectTeamKeys.list(projectId),
    queryFn: async () => {
      const response = await fetch(`/api/projects/${projectId}/users`);
      if (!response.ok) throw new Error('Failed to fetch team members');
      
      const result = await response.json();
      return result.success ? result.data : result;
    },
    enabled: enabled && !!projectId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000,
  });
}

/**
 * Add a user to the project team
 */
export function useAddProjectTeamMember(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { userId: string; role: string }) => {
      const response = await fetch(`/api/projects/${projectId}/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to add team member');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectTeamKeys.list(projectId) });
    },
  });
}

/**
 * Update a team member's role with optimistic updates
 */
export function useUpdateProjectTeamMemberRole(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      projectUserId,
      role,
    }: {
      projectUserId: number;
      role: string;
    }) => {
      const response = await fetch(
        `/api/projects/${projectId}/users/${projectUserId}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ role }),
        }
      );
      if (!response.ok) throw new Error('Failed to update role');
      return response.json();
    },
    // Optimistic update
    onMutate: async ({ projectUserId, role }) => {
      await queryClient.cancelQueries({ queryKey: projectTeamKeys.list(projectId) });
      
      const previousTeam = queryClient.getQueryData(projectTeamKeys.list(projectId));
      
      queryClient.setQueryData(projectTeamKeys.list(projectId), (old: unknown) => {
        if (!old || !Array.isArray(old)) return old;
        return old.map((member: ProjectTeamMember) =>
          member.id === projectUserId ? { ...member, role } : member
        );
      });
      
      return { previousTeam };
    },
    onError: (err, variables, context) => {
      if (context?.previousTeam) {
        queryClient.setQueryData(
          projectTeamKeys.list(projectId),
          context.previousTeam
        );
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: projectTeamKeys.list(projectId) });
    },
  });
}

/**
 * Remove a team member from the project
 */
export function useRemoveProjectTeamMember(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (projectUserId: number) => {
      const response = await fetch(
        `/api/projects/${projectId}/users/${projectUserId}`,
        {
          method: 'DELETE',
        }
      );
      if (!response.ok) throw new Error('Failed to remove team member');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectTeamKeys.list(projectId) });
    },
  });
}



