import { useQuery } from '@tanstack/react-query';
import { TeamMemberWithAllocations } from '@/types';

interface UseTeamAllocationsOptions {
  taskId: number;
  enabled?: boolean;
}

export function useTeamAllocations({ taskId, enabled = true }: UseTeamAllocationsOptions) {
  return useQuery<TeamMemberWithAllocations[]>({
    queryKey: ['task-allocations', taskId],
    queryFn: async () => {
      const response = await fetch(`/api/tasks/${taskId}/team/allocations`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch team allocations');
      }
      
      const data = await response.json();
      return data.data.teamMembers || [];
    },
    enabled: enabled && !!taskId,
    staleTime: 30000, // 30 seconds
    refetchOnWindowFocus: false
  });
}






















