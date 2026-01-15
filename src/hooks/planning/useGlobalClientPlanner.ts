import { useQuery } from '@tanstack/react-query';
import { ServiceLineRole } from '@/types';

interface UseGlobalClientPlannerOptions {
  clientCodes?: string[];
  groupDescs?: string[];
  partnerCodes?: string[];
  taskCodes?: string[];
  managerCodes?: string[];
  serviceLines?: string[];
  subServiceLineGroups?: string[];
  page?: number;
  limit?: number;
  enabled?: boolean;
}

export interface GlobalAllocationData {
  id: number;
  taskId: number;
  userId: string;
  employeeId: number | null;
  employeeName: string;
  employeeCode: string | null;
  jobGradeCode: string | null;
  officeLocation: string | null;
  role: ServiceLineRole | string;
  startDate: Date;
  endDate: Date;
  allocatedHours: number | null;
  allocatedPercentage: number | null;
  actualHours: number | null;
}

export interface GlobalTaskPlannerRow {
  taskId: number;
  taskCode: string;
  taskName: string;
  taskManager: string;
  taskManagerName: string;
  taskPartner: string;
  taskPartnerName: string;
  clientId: number;
  clientCode: string;
  clientName: string;
  groupDesc: string | null;
  clientPartner: string | null;
  serviceLine: string | null;
  subServiceLineGroup: string | null;
  allocations: GlobalAllocationData[];
}

export interface GlobalClientPlannerResponse {
  tasks: GlobalTaskPlannerRow[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
  };
}

/**
 * Hook to fetch global client planner data across all service lines
 * Returns flat array of tasks with employee allocations
 * 
 * Requires Country Management access
 */
export function useGlobalClientPlanner({
  clientCodes = [],
  groupDescs = [],
  partnerCodes = [],
  taskCodes = [],
  managerCodes = [],
  serviceLines = [],
  subServiceLineGroups = [],
  page = 1,
  limit = 50,
  enabled = true
}: UseGlobalClientPlannerOptions) {
  return useQuery<GlobalClientPlannerResponse>({
    queryKey: [
      'global-planner',
      'clients',
      'v1',
      clientCodes,
      groupDescs,
      partnerCodes,
      taskCodes,
      managerCodes,
      serviceLines,
      subServiceLineGroups,
      page,
      limit
    ],
    queryFn: async () => {
      const params = new URLSearchParams();
      
      // Add array-based filters
      clientCodes.forEach(code => params.append('clientCodes[]', code));
      groupDescs.forEach(desc => params.append('groupDescs[]', desc));
      partnerCodes.forEach(code => params.append('partnerCodes[]', code));
      taskCodes.forEach(code => params.append('taskCodes[]', code));
      managerCodes.forEach(code => params.append('managerCodes[]', code));
      serviceLines.forEach(sl => params.append('serviceLines[]', sl));
      subServiceLineGroups.forEach(sslg => params.append('subServiceLineGroups[]', sslg));
      
      params.set('page', page.toString());
      params.set('limit', limit.toString());

      const response = await fetch(`/api/planner/clients?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch global client planner data');
      }
      
      const result = await response.json();
      const tasks = result.data?.tasks || result.tasks || [];
      const pagination = result.data?.pagination || result.pagination || {
        page,
        limit,
        total: tasks.length,
        totalPages: 1,
        hasMore: false
      };
      
      // Convert date strings to Date objects
      const transformedTasks = tasks.map((task: any) => ({
        ...task,
        allocations: task.allocations.map((alloc: any) => ({
          ...alloc,
          startDate: new Date(alloc.startDate),
          endDate: new Date(alloc.endDate)
        }))
      }));

      return {
        tasks: transformedTasks,
        pagination
      };
    },
    enabled,
    staleTime: 0,
    gcTime: 10 * 60 * 1000,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    placeholderData: (previousData) => previousData, // Show stale data while refetching
  });
}
