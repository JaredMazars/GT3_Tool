import { useQuery } from '@tanstack/react-query';

export interface SubServiceLineUserAllocation {
  id: number;
  taskId: number;
  taskName: string;
  taskCode: string;
  clientName: string | null;
  clientCode: string | null;
  role: string;
  startDate: Date;
  endDate: Date;
  allocatedHours: number | null;
  allocatedPercentage: number | null;
  actualHours: number | null;
  isCurrentTask: boolean;
}

export interface SubServiceLineUser {
  employeeId: number;
  userId: string | null;
  hasUserAccount: boolean;
  serviceLineRole: string;
  user: {
    id: string;
    name: string | null;
    email: string;
    image: string | null;
    jobTitle: string | null;
    jobGradeCode: string | null;
    officeLocation: string | null;
  };
  allocations: SubServiceLineUserAllocation[];
}

interface UseSubServiceLineUsersOptions {
  serviceLine: string;
  subServiceLineGroup: string;
  enabled?: boolean;
}

export function useSubServiceLineUsers({
  serviceLine,
  subServiceLineGroup,
  enabled = true
}: UseSubServiceLineUsersOptions) {
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/b3aab070-f6ba-47bb-8f83-44bc48c48d0b',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useSubServiceLineUsers.ts:45',message:'Hook called',data:{serviceLine:serviceLine,subServiceLineGroup:subServiceLineGroup,enabled:enabled},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'E'})}).catch(()=>{});
  // #endregion
  
  return useQuery<SubServiceLineUser[]>({
    queryKey: ['service-lines', serviceLine, subServiceLineGroup, 'users', 'allocations'],
    queryFn: async () => {
      const url = `/api/service-lines/${encodeURIComponent(serviceLine)}/${encodeURIComponent(subServiceLineGroup)}/users`;
      
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/b3aab070-f6ba-47bb-8f83-44bc48c48d0b',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useSubServiceLineUsers.ts:53',message:'Making API call',data:{url:url},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'E'})}).catch(()=>{});
      // #endregion
      
      const response = await fetch(url);

      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/b3aab070-f6ba-47bb-8f83-44bc48c48d0b',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useSubServiceLineUsers.ts:59',message:'API response received',data:{status:response.status,ok:response.ok},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'E'})}).catch(()=>{});
      // #endregion

      if (!response.ok) {
        throw new Error('Failed to fetch sub-service line users');
      }

      const result = await response.json();
      const users = result.success ? result.data.users : result.users || [];
      
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/b3aab070-f6ba-47bb-8f83-44bc48c48d0b',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useSubServiceLineUsers.ts:72',message:'Users parsed',data:{userCount:users.length,sampleUser:users[0]||null},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'E'})}).catch(()=>{});
      // #endregion
      
      return users;
    },
    enabled: enabled && !!subServiceLineGroup && !!serviceLine,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false
  });
}
