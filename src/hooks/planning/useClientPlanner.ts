import { useQuery } from '@tanstack/react-query';
import { ServiceLineRole } from '@/types';

interface UseClientPlannerOptions {
  serviceLine: string;
  subServiceLineGroup: string;
  clientCodes?: string[];
  groupDescs?: string[];
  partnerCodes?: string[];
  taskCodes?: string[];
  managerCodes?: string[];
  page?: number;
  limit?: number;
  enabled?: boolean;
}

export interface AllocationData {
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

export interface TaskPlannerRow {
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
  allocations: AllocationData[];
}

export interface PaginationMetadata {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasMore: boolean;
}

export interface ClientPlannerResponse {
  tasks: TaskPlannerRow[];
  pagination: PaginationMetadata;
}

/**
 * Hook to fetch client planner data with pagination support
 * Returns flat array of tasks with employee allocations
 * 
 * Performance optimizations:
 * - Server-side Redis caching (5min TTL)
 * - Array-based filters with OR logic
 * - Reduced staleTime (90s) for multi-user consistency
 */
export function useClientPlanner({
  serviceLine,
  subServiceLineGroup,
  clientCodes = [],
  groupDescs = [],
  partnerCodes = [],
  taskCodes = [],
  managerCodes = [],
  page = 1,
  limit = 50,
  enabled = true
}: UseClientPlannerOptions) {
  return useQuery<ClientPlannerResponse>({
    queryKey: ['planner', 'tasks', 'v2', serviceLine, subServiceLineGroup, clientCodes, groupDescs, partnerCodes, taskCodes, managerCodes, page, limit],
    queryFn: async () => {
      const params = new URLSearchParams();
      
      // Add array-based filters
      clientCodes.forEach(code => params.append('clientCodes[]', code));
      groupDescs.forEach(desc => params.append('groupDescs[]', desc));
      partnerCodes.forEach(code => params.append('partnerCodes[]', code));
      taskCodes.forEach(code => params.append('taskCodes[]', code));
      managerCodes.forEach(code => params.append('managerCodes[]', code));
      
      params.set('page', page.toString());
      params.set('limit', limit.toString());

      const response = await fetch(
        `/api/service-lines/${serviceLine}/${subServiceLineGroup}/planner/clients?${params.toString()}`
      );
      
      if (!response.ok) {
        throw new Error('Failed to fetch client planner data');
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
    enabled: enabled && !!serviceLine && !!subServiceLineGroup,
    staleTime: 0, // Always check server for fresh data - fixes cache sync between views
    gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
    refetchOnMount: true, // Always refetch when view mounts - ensures data freshness after updates
    refetchOnWindowFocus: false, // Don't refetch on window focus to avoid excessive requests
    placeholderData: (previousData) => previousData, // Show stale data while refetching
  });
}












