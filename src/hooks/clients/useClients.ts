'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// Query Keys
export const clientKeys = {
  all: ['clients'] as const,
  list: (params?: Record<string, string | number | null | undefined>) => [...clientKeys.all, 'list', params] as const,
  detail: (id: string | number, params?: Record<string, string | number | boolean | null | undefined>) => 
    params ? [...clientKeys.all, id, params] as const : [...clientKeys.all, id] as const,
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
    Task: number;
  };
}

export interface ClientWithProjects extends Client {
  tasks?: Array<{
    id: number;
    TaskDesc: string;
    TaskCode: string;
    Active: string;
    createdAt: string;
    updatedAt: string;
    ServLineCode: string;
    ExternalTaskID: string;
    TaskDateOpen: string;
    TaskDateTerminate?: string | null;
    _count: {
      MappedAccount: number;
      TaxAdjustment: number;
    };
  }>;
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
  projectPagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  projectCountsByServiceLine?: {
    TAX: number;
    AUDIT: number;
    ACCOUNTING: number;
    ADVISORY: number;
    QRM: number;
    BUSINESS_DEV: number;
    IT: number;
    FINANCE: number;
    HR: number;
  };
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

export interface UseClientsParams {
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  subServiceLineGroup?: string;
  serviceLine?: string;
  enabled?: boolean;
}

/**
 * Fetch clients list with server-side pagination, search, and sorting
 */
export function useClients(params: UseClientsParams = {}) {
  const {
    search = '',
    page = 1,
    limit = 50,
    sortBy = 'clientNameFull',
    sortOrder = 'asc',
    subServiceLineGroup,
    serviceLine,
    enabled = true,
  } = params;

  return useQuery<ClientsResponse>({
    queryKey: clientKeys.list({ search, page, limit, sortBy, sortOrder, subServiceLineGroup, serviceLine }),
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      if (search) searchParams.set('search', search);
      searchParams.set('page', page.toString());
      searchParams.set('limit', limit.toString());
      searchParams.set('sortBy', sortBy);
      searchParams.set('sortOrder', sortOrder);
      if (subServiceLineGroup) searchParams.set('subServiceLineGroup', subServiceLineGroup);
      if (serviceLine) searchParams.set('serviceLine', serviceLine);
      
      const url = `/api/clients?${searchParams.toString()}`;
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch clients');
      
      const result = await response.json();
      return result.success ? result.data : result;
    },
    enabled,
    staleTime: 5 * 60 * 1000, // 5 minutes - clients don't change frequently
    gcTime: 10 * 60 * 1000, // 10 minutes cache retention
    refetchOnMount: false, // Don't refetch if data is fresh
    refetchOnWindowFocus: false, // Don't refetch on window focus
    refetchOnReconnect: false, // Don't refetch on reconnect
    placeholderData: (previousData) => previousData, // Keep previous data while fetching
  });
}

export interface UseClientParams {
  projectPage?: number;
  projectLimit?: number;
  serviceLine?: string;
  includeArchived?: boolean;
  enabled?: boolean;
}

/**
 * Fetch a single client with paginated projects
 */
export function useClient(
  clientId: string | number,
  params: UseClientParams = {}
) {
  const {
    projectPage = 1,
    projectLimit = 20,
    serviceLine,
    includeArchived = false,
    enabled = true,
  } = params;

  return useQuery<ClientWithProjects>({
    queryKey: clientKeys.detail(clientId, {
      projectPage,
      projectLimit,
      serviceLine,
      includeArchived,
    }),
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      searchParams.set('projectPage', projectPage.toString());
      searchParams.set('projectLimit', projectLimit.toString());
      if (serviceLine) searchParams.set('serviceLine', serviceLine);
      if (includeArchived) searchParams.set('includeArchived', 'true');

      const url = `/api/clients/${clientId}?${searchParams.toString()}`;
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch client');
      
      const result = await response.json();
      return result.success ? result.data : result;
    },
    enabled: enabled && !!clientId,
    staleTime: 5 * 60 * 1000, // 5 minutes - standardized
    gcTime: 10 * 60 * 1000,
    placeholderData: (previousData) => previousData, // Keep previous data while fetching new data
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


