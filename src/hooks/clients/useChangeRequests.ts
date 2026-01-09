'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { clientKeys } from './useClients';

// Query Keys
export const changeRequestKeys = {
  all: ['change-requests'] as const,
  client: (clientId: number) => [...changeRequestKeys.all, 'client', clientId] as const,
  detail: (requestId: number) => [...changeRequestKeys.all, 'detail', requestId] as const,
};

// Types
export interface ChangeRequest {
  id: number;
  clientId: number;
  changeType: 'PARTNER' | 'MANAGER';
  currentEmployeeCode: string;
  currentEmployeeName: string | null;
  proposedEmployeeCode: string;
  proposedEmployeeName: string | null;
  reason: string | null;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  requestedById: string;
  requestedAt: string;
  resolvedById: string | null;
  resolvedAt: string | null;
  resolutionComment: string | null;
  Client?: {
    clientCode: string;
    clientNameFull: string | null;
    GSClientID: string;
  };
  RequestedBy?: {
    name: string | null;
  };
  ResolvedBy?: {
    name: string | null;
  };
}

export interface CreateChangeRequestInput {
  changeType: 'PARTNER' | 'MANAGER';
  proposedEmployeeCode: string;
  reason?: string;
}

export interface ResolveChangeRequestInput {
  comment?: string;
}

/**
 * Hook to fetch change requests for a client
 */
export function useChangeRequests(
  clientId: number,
  options?: {
    status?: 'PENDING' | 'APPROVED' | 'REJECTED';
    page?: number;
    limit?: number;
    enabled?: boolean;
  }
) {
  const { status, page = 1, limit = 20, enabled = true } = options || {};

  return useQuery({
    queryKey: changeRequestKeys.client(clientId),
    queryFn: async () => {
      const params = new URLSearchParams();
      if (status) params.append('status', status);
      params.append('page', page.toString());
      params.append('limit', limit.toString());

      const response = await fetch(
        `/api/clients/${clientId}/change-requests?${params.toString()}`
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'Failed to fetch change requests');
      }

      return response.json();
    },
    enabled,
  });
}

/**
 * Hook to create a change request
 */
export function useCreateChangeRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      clientId,
      data,
    }: {
      clientId: number;
      data: CreateChangeRequestInput;
    }) => {
      const response = await fetch(`/api/clients/${clientId}/change-requests`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'Failed to create change request');
      }

      return response.json();
    },
    onSuccess: (data, variables) => {
      // Invalidate change requests list for this client
      queryClient.invalidateQueries({
        queryKey: changeRequestKeys.client(variables.clientId),
      });

      // Invalidate client detail cache
      if (data.data?.Client?.GSClientID) {
        queryClient.invalidateQueries({
          queryKey: clientKeys.detail(data.data.Client.GSClientID),
        });
      }

      // Invalidate client list cache
      queryClient.invalidateQueries({
        queryKey: clientKeys.list(),
      });
    },
  });
}

/**
 * Hook to approve a change request
 */
export function useApproveChangeRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      requestId,
      data,
    }: {
      requestId: number;
      data?: ResolveChangeRequestInput;
    }) => {
      const response = await fetch(`/api/change-requests/${requestId}/approve`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data || {}),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'Failed to approve change request');
      }

      return response.json();
    },
    onSuccess: (data) => {
      // Invalidate change requests
      if (data.data?.clientId) {
        queryClient.invalidateQueries({
          queryKey: changeRequestKeys.client(data.data.clientId),
        });
      }

      // Invalidate client detail and list caches
      if (data.data?.Client?.GSClientID) {
        queryClient.invalidateQueries({
          queryKey: clientKeys.detail(data.data.Client.GSClientID),
        });
      }

      queryClient.invalidateQueries({
        queryKey: clientKeys.list(),
      });

      queryClient.invalidateQueries({
        queryKey: clientKeys.all,
      });

      // Invalidate approvals to refresh the approvals list
      queryClient.invalidateQueries({
        queryKey: ['approvals'],
      });
    },
  });
}

/**
 * Hook to reject a change request
 */
export function useRejectChangeRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      requestId,
      data,
    }: {
      requestId: number;
      data?: ResolveChangeRequestInput;
    }) => {
      const response = await fetch(`/api/change-requests/${requestId}/reject`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data || {}),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'Failed to reject change request');
      }

      return response.json();
    },
    onSuccess: (data) => {
      // Invalidate change requests
      if (data.data?.clientId) {
        queryClient.invalidateQueries({
          queryKey: changeRequestKeys.client(data.data.clientId),
        });
      }

      queryClient.invalidateQueries({
        queryKey: changeRequestKeys.all,
      });

      // Invalidate approvals to refresh the approvals list
      queryClient.invalidateQueries({
        queryKey: ['approvals'],
      });
    },
  });
}
