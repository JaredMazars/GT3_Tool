import { useQuery } from '@tanstack/react-query';
import { TaskRole } from '@/types';

interface UseClientPlannerOptions {
  serviceLine: string;
  subServiceLineGroup: string;
  clientSearch?: string;
  groupFilter?: string;
  partnerFilter?: string;
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
  role: TaskRole;
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
 * - Conditional pagination (50 limit without filters, unlimited with filters)
 * - Increased staleTime to match server cache (5 min)
 */
export function useClientPlanner({
  serviceLine,
  subServiceLineGroup,
  clientSearch = '',
  groupFilter = '',
  partnerFilter = '',
  page = 1,
  limit = 50,
  enabled = true
}: UseClientPlannerOptions) {
  return useQuery<ClientPlannerResponse>({
    queryKey: ['planner', 'tasks', serviceLine, subServiceLineGroup, clientSearch, groupFilter, partnerFilter, page, limit],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (clientSearch) params.set('clientSearch', clientSearch);
      if (groupFilter) params.set('groupFilter', groupFilter);
      if (partnerFilter) params.set('partnerFilter', partnerFilter);
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
    staleTime: 5 * 60 * 1000, // Match Redis TTL (5 minutes)
    gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
  });
}


