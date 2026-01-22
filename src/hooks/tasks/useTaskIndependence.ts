'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ServiceLineRole } from '@/types';

// Query Keys
export const independenceKeys = {
  all: (taskId: string) => ['tasks', taskId, 'independence'] as const,
};

// Types
export interface TaskIndependenceConfirmation {
  id: number;
  taskTeamId: number;
  confirmed: boolean;
  confirmedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface TaskTeamWithIndependence {
  id: number;
  userId: string | null;
  role: ServiceLineRole | string;
  createdAt: Date | string;
  User: {
    id: string;
    name: string;
    email: string;
    image?: string | null;
  } | null;
  Employee?: {
    EmpCode: string;
    EmpName: string;
    EmpNameFull: string;
    WinLogon: string | null;
    OfficeCode: string;
    EmpCatDesc: string;
  } | null;
  hasAccount?: boolean;
  independenceConfirmation: TaskIndependenceConfirmation | null;
}

interface IndependenceResponse {
  teamMembers: TaskTeamWithIndependence[];
}

/**
 * Fetch independence confirmations for all team members on a task
 */
export function useTaskIndependence(taskId: string, enabled = true) {
  return useQuery<IndependenceResponse>({
    queryKey: independenceKeys.all(taskId),
    queryFn: async () => {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/b3aab070-f6ba-47bb-8f83-44bc48c48d0b',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useTaskIndependence.ts:48',message:'Query function start',data:{taskId,url:`/api/tasks/${taskId}/independence`},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'C,D,E'})}).catch(()=>{});
      // #endregion
      const response = await fetch(`/api/tasks/${taskId}/independence`);
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/b3aab070-f6ba-47bb-8f83-44bc48c48d0b',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useTaskIndependence.ts:49',message:'Fetch response received',data:{ok:response.ok,status:response.status,statusText:response.statusText},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'D'})}).catch(()=>{});
      // #endregion
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch independence confirmations');
      }
      
      const result = await response.json();
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/b3aab070-f6ba-47bb-8f83-44bc48c48d0b',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useTaskIndependence.ts:55',message:'Response JSON parsed',data:{hasData:!!result.data,hasTeamMembers:!!result.teamMembers,dataTeamMembersCount:result.data?.teamMembers?.length,directTeamMembersCount:result.teamMembers?.length},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'C'})}).catch(()=>{});
      // #endregion
      return result.data || result;
    },
    enabled: enabled && !!taskId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
}

/**
 * Confirm independence for the current user
 */
export function useConfirmIndependence(taskId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (taskTeamId: number) => {
      const response = await fetch(`/api/tasks/${taskId}/independence`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskTeamId }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to confirm independence');
      }
      
      return response.json();
    },
    onSuccess: () => {
      // Invalidate independence queries to refetch data
      queryClient.invalidateQueries({ queryKey: independenceKeys.all(taskId) });
      // Invalidate approvals queries so the item disappears from My Approvals
      queryClient.invalidateQueries({ queryKey: ['approvals'] });
    },
  });
}
