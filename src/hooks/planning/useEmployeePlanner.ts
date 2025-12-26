import { useQuery } from '@tanstack/react-query';
import { ServiceLineRole } from '@/types';

interface UseEmployeePlannerOptions {
  serviceLine: string;
  subServiceLineGroup: string;
  employees?: string[];
  jobGrades?: string[];
  offices?: string[];
  clients?: string[];
  taskCategories?: string[];
  includeUnallocated?: boolean; // For timeline view - show all employees
  page?: number;
  limit?: number;
  enabled?: boolean;
}

export interface EmployeeAllocationData {
  allocationId: number;
  userId: string;
  employeeId: number | null;
  userName: string;
  userEmail: string;
  jobGradeCode: string | null;
  officeLocation: string | null;
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
  employeeStatus?: {
    isActive: boolean;
    hasUserAccount: boolean;
  };
}

export interface PaginationMetadata {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasMore: boolean;
}

export interface EmployeePlannerResponse {
  allocations: EmployeeAllocationData[];
  pagination: PaginationMetadata;
}

/**
 * Hook to fetch employee planner data with pagination support
 * Returns flat array of employee allocations with server-side filtering
 * 
 * Performance optimizations:
 * - Server-side Redis caching (5min TTL)
 * - Array-based filters with OR logic
 * - Increased staleTime to match server cache (5 min)
 */
export function useEmployeePlanner({
  serviceLine,
  subServiceLineGroup,
  employees = [],
  jobGrades = [],
  offices = [],
  clients = [],
  taskCategories = [],
  includeUnallocated = false,
  page = 1,
  limit = 50,
  enabled = true
}: UseEmployeePlannerOptions) {
  return useQuery<EmployeePlannerResponse>({
    queryKey: ['planner', 'employees', 'v1', serviceLine, subServiceLineGroup, employees, jobGrades, offices, clients, taskCategories, includeUnallocated, page, limit],
    queryFn: async () => {
      const params = new URLSearchParams();
      
      // Add array-based filters
      employees.forEach(emp => params.append('employees[]', emp));
      jobGrades.forEach(grade => params.append('jobGrades[]', grade));
      offices.forEach(office => params.append('offices[]', office));
      clients.forEach(client => params.append('clients[]', client));
      taskCategories.forEach(cat => params.append('taskCategories[]', cat));
      
      if (includeUnallocated) {
        params.set('includeUnallocated', 'true');
      }
      
      params.set('page', page.toString());
      params.set('limit', limit.toString());

      const url = `/api/service-lines/${serviceLine}/${subServiceLineGroup}/planner/employees?${params.toString()}`;
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error('Failed to fetch employee planner data');
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
    enabled: enabled && !!serviceLine && !!subServiceLineGroup,
    staleTime: 5 * 60 * 1000, // Match Redis TTL (5 minutes)
    gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
  });
}
