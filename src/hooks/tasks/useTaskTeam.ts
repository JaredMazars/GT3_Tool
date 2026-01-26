'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ServiceLineRole } from '@/types';

// Query Keys
export const taskTeamKeys = {
  all: (taskId: string) => ['tasks', taskId, 'team'] as const,
  list: (taskId: string) => [...taskTeamKeys.all(taskId), 'list'] as const,
};

// Types
export interface TaskTeamMember {
  id: number;
  userId: string;
  taskId?: number;
  role: ServiceLineRole | string;
  createdAt?: string;
  startDate?: string | null;
  endDate?: string | null;
  allocatedHours?: number | null;
  allocatedPercentage?: number | null;
  actualHours?: number | null;
  allocations?: Array<{
    id: number;
    taskId: number;
    taskName: string;
    taskCode?: string;
    clientName?: string | null;
    clientCode?: string | null;
    role: ServiceLineRole | string;
    startDate: string | Date;
    endDate: string | Date;
    allocatedHours: number | null;
    allocatedPercentage: number | null;
    actualHours: number | null;
    isCurrentTask?: boolean;
  }>;
  User?: {
    id: string;
    name: string;
    email: string;
    image?: string | null;
    jobTitle?: string | null;
    officeLocation?: string | null;
  };
  user?: {
    id: string;
    name: string;
    email: string;
    image?: string | null;
    jobTitle?: string | null;
    officeLocation?: string | null;
  };
}

/**
 * Fetch team members for a task with all their allocations (current task + other tasks)
 * Only loads when explicitly called (lazy loading)
 */
export function useTaskTeam(taskId: string, enabled = true) {
  return useQuery<TaskTeamMember[]>({
    queryKey: taskTeamKeys.list(taskId),
    queryFn: async () => {
      const response = await fetch(`/api/tasks/${taskId}/team/allocations`);
      if (!response.ok) throw new Error('Failed to fetch team members');
      
      const result = await response.json();
      const teamMembers = result.success ? result.data.teamMembers : result.teamMembers || result;      return teamMembers;
    },
    enabled: enabled && !!taskId,
    staleTime: 0, // TEMPORARILY DISABLE CACHE for debugging - change back to 5 * 60 * 1000 after fix verified
    gcTime: 0, // TEMPORARILY DISABLE CACHE for debugging - change back to 10 * 60 * 1000 after fix verified
  });
}

/**
 * Add a user to the task team
 */
export function useAddTaskTeamMember(taskId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { userId: string; role: string }) => {
      const response = await fetch(`/api/tasks/${taskId}/users`, {
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
      queryClient.invalidateQueries({ queryKey: taskTeamKeys.list(taskId) });
      // Invalidate workspace counts (affects My Tasks count)
      queryClient.invalidateQueries({ queryKey: ['workspace-counts'] });
    },
  });
}

/**
 * Update a team member's role with optimistic updates
 */
export function useUpdateTaskTeamMemberRole(taskId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      taskUserId,
      role,
    }: {
      taskUserId: number;
      role: string;
    }) => {
      const response = await fetch(
        `/api/tasks/${taskId}/users/${taskUserId}`,
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
    onMutate: async ({ taskUserId, role }) => {
      await queryClient.cancelQueries({ queryKey: taskTeamKeys.list(taskId) });
      
      const previousTeam = queryClient.getQueryData(taskTeamKeys.list(taskId));
      
      queryClient.setQueryData(taskTeamKeys.list(taskId), (old: unknown) => {
        if (!old || !Array.isArray(old)) return old;
        return old.map((member: TaskTeamMember) =>
          member.id === taskUserId ? { ...member, role } : member
        );
      });
      
      return { previousTeam };
    },
    onError: (err, variables, context) => {
      if (context?.previousTeam) {
        queryClient.setQueryData(
          taskTeamKeys.list(taskId),
          context.previousTeam
        );
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: taskTeamKeys.list(taskId) });
    },
  });
}

/**
 * Remove a team member from the task
 */
export function useRemoveTaskTeamMember(taskId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (taskUserId: number) => {
      const response = await fetch(
        `/api/tasks/${taskId}/users/${taskUserId}`,
        {
          method: 'DELETE',
        }
      );
      if (!response.ok) throw new Error('Failed to remove team member');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: taskTeamKeys.list(taskId) });
      // Invalidate workspace counts (affects My Tasks count)
      queryClient.invalidateQueries({ queryKey: ['workspace-counts'] });
    },
  });
}




