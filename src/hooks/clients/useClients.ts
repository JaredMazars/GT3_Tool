'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// Query Keys
export const clientKeys = {
  all: ['clients'] as const,
  list: (params?: Record<string, string | number | null>) => [...clientKeys.all, 'list', params] as const,
  detail: (id: string | number) => [...clientKeys.all, id] as const,
};

// Types
export interface Client {
  id: number;
  clientCode: string;
  clientNameFull: string | null;
  groupCode: string;
  groupDesc: string;
  clientPartner: string;
  clientManager: string;
  clientIncharge: string;
  industry: string | null;
  sector: string | null;
  active: string;
  typeCode: string;
  typeDesc: string;
  createdAt: string;
  updatedAt: string;
  _count: {
    Project: number;
  };
}

export interface ClientWithProjects extends Client {
  projects: Array<{
    id: number;
    name: string;
    description?: string | null;
    projectType: string;
    serviceLine: string;
    taxYear?: number | null;
    status: string;
    archived: boolean;
    createdAt: string;
    updatedAt: string;
    _count: {
      mappings: number;
      taxAdjustments: number;
    };
  }>;
}

interface ClientsResponse {
  clients: Client[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

/**
 * Fetch clients list with optional search and pagination
 */
export function useClients(searchParams?: {
  search?: string;
  page?: number;
  limit?: number;
}) {
  return useQuery<ClientsResponse>({
    queryKey: clientKeys.list(searchParams),
    queryFn: async () => {
      const params = new URLSearchParams();
      if (searchParams?.search) params.set('search', searchParams.search);
      if (searchParams?.page) params.set('page', searchParams.page.toString());
      if (searchParams?.limit) params.set('limit', searchParams.limit.toString());
      
      const url = `/api/clients${params.toString() ? `?${params.toString()}` : ''}`;
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch clients');
      
      const result = await response.json();
      return result.success ? result.data : result;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes - clients don't change frequently
    gcTime: 10 * 60 * 1000, // 10 minutes cache retention
  });
}

/**
 * Fetch a single client with projects
 */
export function useClient(clientId: string | number) {
  return useQuery<ClientWithProjects>({
    queryKey: clientKeys.detail(clientId),
    queryFn: async () => {
      const response = await fetch(`/api/clients/${clientId}`);
      if (!response.ok) throw new Error('Failed to fetch client');
      
      const result = await response.json();
      return result.success ? result.data : result;
    },
    enabled: !!clientId,
    staleTime: 3 * 60 * 1000, // 3 minutes - more dynamic with projects
    gcTime: 10 * 60 * 1000,
  });
}

/**
 * Update a client
 */
export function useUpdateClient(clientId: string | number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Partial<Client>) => {
      const response = await fetch(`/api/clients/${clientId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update client');
      }
      return response.json();
    },
    onSuccess: () => {
      // Invalidate both the client detail and the clients list
      queryClient.invalidateQueries({ queryKey: clientKeys.detail(clientId) });
      queryClient.invalidateQueries({ queryKey: clientKeys.all });
    },
  });
}

/**
 * Delete a client
 */
export function useDeleteClient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (clientId: string | number) => {
      const response = await fetch(`/api/clients/${clientId}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete client');
      }
      return response.json();
    },
    onSuccess: () => {
      // Invalidate the clients list
      queryClient.invalidateQueries({ queryKey: clientKeys.all });
    },
  });
}

