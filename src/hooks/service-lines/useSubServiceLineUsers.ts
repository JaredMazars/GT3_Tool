import { useQuery } from '@tanstack/react-query';

export interface SubServiceLineUserAllocation {
  id: number;
  taskId: number | null;
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
  isNonClientEvent?: boolean;
  nonClientEventType?: string;
  notes?: string | null;
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
  return useQuery<SubServiceLineUser[]>({
    queryKey: ['service-lines', serviceLine, subServiceLineGroup, 'users', 'allocations'],
    queryFn: async () => {
      const url = `/api/service-lines/${encodeURIComponent(serviceLine)}/${encodeURIComponent(subServiceLineGroup)}/users`;      
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('Failed to fetch sub-service line users');
      }

      const result = await response.json();
      const users = result.success ? result.data.users : result.users || [];      
      return users;
    },
    enabled: enabled && !!subServiceLineGroup && !!serviceLine,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false
  });
}








