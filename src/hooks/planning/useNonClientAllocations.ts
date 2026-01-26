import { useMutation, useQuery, useQueryClient, UseMutationResult, UseQueryResult } from '@tanstack/react-query';
import { NonClientAllocation, NonClientEventType } from '@/types';

// Query Keys
export const nonClientAllocationKeys = {
  all: ['non-client-allocations'] as const,
  byUser: (userId: string) => [...nonClientAllocationKeys.all, 'user', userId] as const,
  byDateRange: (userId: string, startDate: string, endDate: string) => 
    [...nonClientAllocationKeys.byUser(userId), 'range', startDate, endDate] as const,
};

interface DateRange {
  startDate: string;
  endDate: string;
}

/**
 * Fetch non-client allocations for an employee
 * Optionally filter by date range and event type
 */
export function useNonClientAllocations(
  employeeId: number | null,
  dateRange?: DateRange,
  eventType?: NonClientEventType
): UseQueryResult<NonClientAllocation[], Error> {
  return useQuery({
    queryKey: dateRange 
      ? [...nonClientAllocationKeys.all, 'employee', employeeId, 'range', dateRange.startDate, dateRange.endDate]
      : [...nonClientAllocationKeys.all, 'employee', employeeId],
    queryFn: async () => {
      if (!employeeId) throw new Error('Employee ID is required');
      
      const params = new URLSearchParams({ employeeId: employeeId.toString() });
      
      if (dateRange) {
        params.append('startDate', dateRange.startDate);
        params.append('endDate', dateRange.endDate);
      }
      
      if (eventType) {
        params.append('eventType', eventType);
      }

      const response = await fetch(`/api/non-client-allocations?${params.toString()}`);
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch non-client allocations');
      }

      const result = await response.json();
      return result.data || result;
    },
    enabled: !!employeeId && employeeId > 0,
  });
}

interface MutationContext {
  serviceLine?: string;
  subServiceLineGroup?: string;
}

interface CreateNonClientAllocationData {
  employeeId: number;
  eventType: NonClientEventType;
  startDate: string | Date;
  endDate: string | Date;
  notes?: string;
  context?: MutationContext;
}

interface CreateNonClientAllocationResponse {
  allocation: NonClientAllocation;
  warnings?: string[];
}

/**
 * Create a new non-client allocation
 * Automatically calculates hours and sets 100% utilization
 */
export function useCreateNonClientAllocation(): UseMutationResult<
  CreateNonClientAllocationResponse,
  Error,
  CreateNonClientAllocationData
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateNonClientAllocationData) => {
      const { context, ...requestData } = data;
      const response = await fetch('/api/non-client-allocations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create non-client allocation');
      }

      return response.json();
    },
    onMutate: async (variables) => {
      const { context, employeeId } = variables;
      
      // Only do optimistic update if we have context
      if (!context?.serviceLine || !context?.subServiceLineGroup) {
        return { previousData: null };
      }

      const queryKey = ['service-lines', context.serviceLine, context.subServiceLineGroup, 'users', 'allocations'];
      
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey });

      // Snapshot previous value
      const previousData = queryClient.getQueryData(queryKey);

      // Optimistically update cache
      const tempId = -Date.now(); // Temporary negative ID
      queryClient.setQueryData(queryKey, (old: any) => {
        if (!old || !Array.isArray(old)) return old;

        return old.map((user: any) => {
          if (user.employeeId !== employeeId) return user;

          // Add the new allocation to this employee's allocations
          const newAllocation = {
            id: tempId,
            taskId: null,
            taskName: variables.eventType,
            taskCode: '',
            clientName: null,
            clientCode: null,
            role: 'VIEWER',
            startDate: new Date(variables.startDate),
            endDate: new Date(variables.endDate),
            allocatedHours: null, // Will be calculated by server
            allocatedPercentage: 100,
            actualHours: null,
            isCurrentTask: true,
            isNonClientEvent: true,
            nonClientEventType: variables.eventType,
            notes: variables.notes || null
          };

          return {
            ...user,
            allocations: [...user.allocations, newAllocation]
          };
        });
      });

      return { previousData, queryKey, tempId };
    },
    onError: (err, variables, context) => {
      // Rollback on error
      if (context?.previousData && context?.queryKey) {
        queryClient.setQueryData(context.queryKey, context.previousData);
      }
    },
    onSuccess: (data, variables, context) => {
      const { context: mutationContext, employeeId } = variables;

      if (mutationContext?.serviceLine && mutationContext?.subServiceLineGroup && context?.tempId) {
        // Replace temporary ID with real ID from server
        const queryKey = ['service-lines', mutationContext.serviceLine, mutationContext.subServiceLineGroup, 'users', 'allocations'];
        
        queryClient.setQueryData(queryKey, (old: any) => {
          if (!old || !Array.isArray(old)) return old;

          return old.map((user: any) => {
            if (user.employeeId !== employeeId) return user;

            return {
              ...user,
              allocations: user.allocations.map((alloc: any) => {
                // Replace the temporary allocation with the real one from server
                if (alloc.id === context.tempId) {
                  return {
                    id: data.allocation.id,
                    taskId: null,
                    taskName: data.allocation.eventType,
                    taskCode: '',
                    clientName: null,
                    clientCode: null,
                    role: 'VIEWER',
                    startDate: new Date(data.allocation.startDate),
                    endDate: new Date(data.allocation.endDate),
                    allocatedHours: data.allocation.allocatedHours,
                    allocatedPercentage: data.allocation.allocatedPercentage,
                    actualHours: null,
                    isCurrentTask: true,
                    isNonClientEvent: true,
                    nonClientEventType: data.allocation.eventType,
                    notes: data.allocation.notes
                  };
                }
                return alloc;
              })
            };
          });
        });
        
        // Then invalidate to ensure consistency (but UI already updated)
        queryClient.invalidateQueries({ queryKey, exact: true });
      } else {
        // Fallback: invalidate broader queries if context not provided
        queryClient.invalidateQueries({
          queryKey: [...nonClientAllocationKeys.all, 'employee', employeeId]
        });
        queryClient.invalidateQueries({
          queryKey: nonClientAllocationKeys.all
        });
      }
    },
  });
}

interface UpdateNonClientAllocationData {
  id: number;
  eventType?: NonClientEventType;
  startDate?: string | Date;
  endDate?: string | Date;
  notes?: string;
  context?: MutationContext;
}

/**
 * Update an existing non-client allocation
 * Recalculates hours if dates change (maintains 100% utilization)
 */
export function useUpdateNonClientAllocation(): UseMutationResult<
  NonClientAllocation,
  Error,
  UpdateNonClientAllocationData
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: UpdateNonClientAllocationData) => {
      const { id, context, ...updateData } = data;
      
      const response = await fetch(`/api/non-client-allocations/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update non-client allocation');
      }

      const result = await response.json();
      return result.data || result;
    },
    onMutate: async (variables) => {
      const { context, id } = variables;
      
      // Only do optimistic update if we have context
      if (!context?.serviceLine || !context?.subServiceLineGroup) {
        return { previousData: null };
      }

      const queryKey = ['service-lines', context.serviceLine, context.subServiceLineGroup, 'users', 'allocations'];
      
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey });

      // Snapshot previous value
      const previousData = queryClient.getQueryData(queryKey);

      // Optimistically update cache
      queryClient.setQueryData(queryKey, (old: any) => {
        if (!old || !Array.isArray(old)) return old;

        return old.map((user: any) => {
          return {
            ...user,
            allocations: user.allocations.map((alloc: any) => {
              if (alloc.id !== id || !alloc.isNonClientEvent) return alloc;

              // Update the allocation fields
              return {
                ...alloc,
                ...(variables.eventType && { 
                  nonClientEventType: variables.eventType,
                  taskName: variables.eventType 
                }),
                ...(variables.startDate && { startDate: new Date(variables.startDate) }),
                ...(variables.endDate && { endDate: new Date(variables.endDate) }),
                ...(variables.notes !== undefined && { notes: variables.notes })
              };
            })
          };
        });
      });

      return { previousData, queryKey };
    },
    onError: (err, variables, context) => {
      // Rollback on error
      if (context?.previousData && context?.queryKey) {
        queryClient.setQueryData(context.queryKey, context.previousData);
      }
    },
    onSuccess: (allocation, variables, context) => {
      const mutationContext = variables.context;

      if (mutationContext?.serviceLine && mutationContext?.subServiceLineGroup) {
        // Invalidate only the specific service line query for real data
        const queryKey = ['service-lines', mutationContext.serviceLine, mutationContext.subServiceLineGroup, 'users', 'allocations'];
        queryClient.invalidateQueries({ queryKey, exact: true });
      } else {
        // Fallback: invalidate broader queries if context not provided
        queryClient.invalidateQueries({
          queryKey: [...nonClientAllocationKeys.all, 'employee', allocation.employeeId]
        });
        queryClient.invalidateQueries({
          queryKey: nonClientAllocationKeys.all
        });
      }
    },
  });
}

/**
 * Delete a non-client allocation
 */
export function useDeleteNonClientAllocation(): UseMutationResult<
  void,
  Error,
  { id: number; employeeId: number; context?: MutationContext }
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id }: { id: number; employeeId: number; context?: MutationContext }) => {
      const response = await fetch(`/api/non-client-allocations/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete non-client allocation');
      }
    },
    onMutate: async (variables) => {
      const { context, employeeId, id } = variables;
      
      // Only do optimistic update if we have context
      if (!context?.serviceLine || !context?.subServiceLineGroup) {
        return { previousData: null };
      }

      const queryKey = ['service-lines', context.serviceLine, context.subServiceLineGroup, 'users', 'allocations'];
      
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey });

      // Snapshot previous value
      const previousData = queryClient.getQueryData(queryKey);

      // Optimistically update cache - remove the allocation
      queryClient.setQueryData(queryKey, (old: any) => {
        if (!old || !Array.isArray(old)) return old;

        return old.map((user: any) => {
          if (user.employeeId !== employeeId) return user;

          // Remove the allocation from this employee's allocations
          return {
            ...user,
            allocations: user.allocations.filter((alloc: any) => alloc.id !== id)
          };
        });
      });

      return { previousData, queryKey };
    },
    onError: (err, variables, context) => {
      // Rollback on error
      if (context?.previousData && context?.queryKey) {
        queryClient.setQueryData(context.queryKey, context.previousData);
      }
    },
    onSuccess: (_, variables, context) => {
      const { context: mutationContext, employeeId } = variables;

      if (mutationContext?.serviceLine && mutationContext?.subServiceLineGroup) {
        // Invalidate only the specific service line query for real data
        const queryKey = ['service-lines', mutationContext.serviceLine, mutationContext.subServiceLineGroup, 'users', 'allocations'];
        queryClient.invalidateQueries({ queryKey, exact: true });
      } else {
        // Fallback: invalidate broader queries if context not provided
        queryClient.invalidateQueries({
          queryKey: [...nonClientAllocationKeys.all, 'employee', employeeId]
        });
        queryClient.invalidateQueries({
          queryKey: nonClientAllocationKeys.all
        });
      }
    },
  });
}
