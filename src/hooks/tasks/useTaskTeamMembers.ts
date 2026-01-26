import { useQuery } from '@tanstack/react-query';

interface TaskTeamMember {
  id: number;
  taskId: number;
  userId: string;
  role: string;
  startDate: Date | null;
  endDate: Date | null;
  allocatedHours: number | null;
  allocatedPercentage: number | null;
  actualHours: number | null;
  createdAt: Date;
  User: {
    id: string;
    name: string | null;
    email: string;
    image: string | null;
  };
}

interface UseTaskTeamMembersOptions {
  taskId: number;
  enabled?: boolean;
}

export function useTaskTeamMembers({ taskId, enabled = true }: UseTaskTeamMembersOptions) {
  return useQuery<TaskTeamMember[]>({
    queryKey: ['task-team-members', taskId],
    queryFn: async () => {
      const response = await fetch(`/api/tasks/${taskId}/users`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch task team members');
      }
      
      const data = await response.json();
      return data.data || [];
    },
    enabled: enabled && !!taskId,
    staleTime: 30000, // 30 seconds
    refetchOnWindowFocus: false
  });
}

