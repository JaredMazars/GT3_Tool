import { useQuery } from '@tanstack/react-query';
import { ServiceLineRole } from '@/types';

interface UseGlobalEmployeePlannerOptions {
  employees?: string[];
  jobGrades?: string[];
  offices?: string[];
  clients?: string[];
  taskCategories?: string[];
  serviceLines?: string[];
  subServiceLineGroups?: string[];
  includeUnallocated?: boolean;
  page?: number;
  limit?: number;
  enabled?: boolean;
}

export interface GlobalEmployeeAllocationData {
  allocationId: number;
  userId: string;
  employeeId: number | null;
  userName: string;
  userEmail: string;
  jobGradeCode: string | null;
  serviceLineRole: string;
  officeLocation: string | null;
  serviceLine: string | null;
  subServiceLineGroup: string | null;
  clientId: number | null;
  clientName: string;
  clientCode: string;
  taskId: number;
  taskName: string;
  taskCode: string | null;
  startDate: Date;
  endDate: Date;
  role: ServiceLineRole | string;
  allocatedHours: number | null;
  allocatedPercentage: number | null;
  actualHours: number | null;
  isNonClientEvent: boolean;
  nonClientEventType: string | null;
  notes: string | null;
  isCurrentTask?: boolean; // Whether this allocation belongs to the filtered service lines (true) or other service lines (false = read-only)
  employeeStatus?: {
    isActive: boolean;
    hasUserAccount: boolean;
  };
}

export interface GlobalPaginationMetadata {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasMore: boolean;
}

export interface GlobalEmployeePlannerResponse {
  allocations: GlobalEmployeeAllocationData[];
  pagination: GlobalPaginationMetadata;
}

/**
 * Hook to fetch global employee planner data across all service lines
 * Returns flat array of employee allocations with server-side filtering
 * 
 * Requires Country Management access
 */
export function useGlobalEmployeePlanner({
  employees = [],
  jobGrades = [],
  offices = [],
  clients = [],
  taskCategories = [],
  serviceLines = [],
  subServiceLineGroups = [],
  includeUnallocated = false,
  page = 1,
  limit = 50,
  enabled = true
}: UseGlobalEmployeePlannerOptions) {
  return useQuery<GlobalEmployeePlannerResponse>({
    queryKey: [
      'global-planner',
      'employees',
      'v1',
      employees,
      jobGrades,
      offices,
      clients,
      taskCategories,
      serviceLines,
      subServiceLineGroups,
      includeUnallocated,
      page,
      limit
    ],
    queryFn: async () => {
      const params = new URLSearchParams();
      
      // Add array-based filters
      employees.forEach(emp => params.append('employees[]', emp));
      jobGrades.forEach(grade => params.append('jobGrades[]', grade));
      offices.forEach(office => params.append('offices[]', office));
      clients.forEach(client => params.append('clients[]', client));
      taskCategories.forEach(cat => params.append('taskCategories[]', cat));
      serviceLines.forEach(sl => params.append('serviceLines[]', sl));
      subServiceLineGroups.forEach(sslg => params.append('subServiceLineGroups[]', sslg));
      
      if (includeUnallocated) {
        params.set('includeUnallocated', 'true');
      }
      
      params.set('page', page.toString());
      params.set('limit', limit.toString());

      const url = `/api/planner/employees?${params.toString()}`;
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error('Failed to fetch global employee planner data');
      }
      
      const result = await response.json();
      
      const allocations = result.data?.allocations || result.allocations || [];
      const pagination = result.data?.pagination || result.pagination || {
        page,
        limit,
        total: allocations.length,
        totalPages: 1,
        hasMore: false
      };
      
      // Convert date strings to Date objects
      const transformedAllocations = allocations.map((alloc: any) => ({
        ...alloc,
        startDate: new Date(alloc.startDate),
        endDate: new Date(alloc.endDate)
      }));

      return {
        allocations: transformedAllocations,
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
