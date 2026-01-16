'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// Query Keys
// v2: Removed serviceLine/subServiceLineGroup from cache key (all clients shown)
export const clientKeys = {
  all: ['clients', 'v2'] as const,
  list: (params?: Record<string, string | number | null | undefined>) => [...clientKeys.all, 'list', params] as const,
  detail: (id: string | number, params?: Record<string, string | number | boolean | null | undefined>) => 
    params ? [...clientKeys.all, id, params] as const : [...clientKeys.all, id] as const,
};

// Types
export interface Client {
  id: number;
  GSClientID: string;
  clientCode: string;
  clientNameFull: string | null;
  groupCode: string;
  groupDesc: string;
  clientPartner: string;
  clientPartnerName?: string;
  clientPartnerStatus?: {
    isActive: boolean;
    hasUserAccount: boolean;
  };
  clientManager: string;
  clientManagerName?: string;
  clientManagerStatus?: {
    isActive: boolean;
    hasUserAccount: boolean;
  };
  clientIncharge: string;
  clientInchargeName?: string;
  clientInchargeStatus?: {
    isActive: boolean;
    hasUserAccount: boolean;
  };
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

export interface ClientWithTasks extends Omit<Client, 'clientPartnerName' | 'clientManagerName' | 'clientInchargeName'> {
  clientPartnerName?: string;
  clientManagerName?: string;
  clientInchargeName?: string;
  tasks: Array<{
    id: number;
    TaskDesc: string;
    TaskCode: string;
    Active: string;
    createdAt: string;
    updatedAt: string;
    ServLineCode: string;
    ServLineDesc?: string;
    SLGroup: string;
    subServiceLineGroupCode?: string | null;
    subServiceLineGroupDesc?: string | null;
    GSTaskID: string;
    TaskDateOpen: string;
    TaskDateTerminate?: string | null;
    TaskPartner: string;
    TaskPartnerName: string;
    TaskManager: string;
    TaskManagerName: string;
    masterServiceLine: string | null;
    masterServiceLineDesc?: string | null;
    wip?: {
      balWIP: number;
      balTime: number;
      balDisb: number;
    };
    _count: {
      MappedAccount: number;
      TaxAdjustment: number;
    };
  }>;
  taskPagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  taskCountsByServiceLine?: {
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
  limit?: number; // Note: For virtual scrolling, use higher limits (100-500) to minimize API calls
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  subServiceLineGroup?: string;
  serviceLine?: string;
  clientCodes?: string[]; // Filter by specific client codes
  partners?: string[]; // Filter by specific client partners
  managers?: string[]; // Filter by specific client managers
  groups?: string[]; // Filter by specific group codes
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
    clientCodes = [],
    partners = [],
    managers = [],
    groups = [],
    enabled = true,
  } = params;

  return useQuery<ClientsResponse>({
    // NOTE: Cache key excludes subServiceLineGroup and serviceLine because
    // the API now returns ALL clients regardless of service line
    // Includes array filters for proper cache segmentation
    queryKey: clientKeys.list({ search, page, limit, sortBy, sortOrder, clientCodes: clientCodes.join(','), partners: partners.join(','), managers: managers.join(','), groups: groups.join(',') }),
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      if (search) searchParams.set('search', search);
      searchParams.set('page', page.toString());
      searchParams.set('limit', limit.toString());
      searchParams.set('sortBy', sortBy);
      searchParams.set('sortOrder', sortOrder);
      if (subServiceLineGroup) searchParams.set('subServiceLineGroup', subServiceLineGroup);
      if (serviceLine) searchParams.set('serviceLine', serviceLine);
      
      // Add array filters
      clientCodes.forEach(code => searchParams.append('clientCodes[]', code));
      partners.forEach(partner => searchParams.append('partners[]', partner));
      managers.forEach(manager => searchParams.append('managers[]', manager));
      groups.forEach(grp => searchParams.append('groups[]', grp));
      
      const url = `/api/clients?${searchParams.toString()}`;
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch clients');
      
      const result = await response.json();
      return result.success ? result.data : result;
    },
    enabled,
    staleTime: 10 * 60 * 1000, // 10 minutes - clients don't change frequently (increased from 5)
    gcTime: 15 * 60 * 1000, // 15 minutes cache retention (increased from 10)
    refetchOnMount: false, // Don't refetch if data is fresh
    refetchOnWindowFocus: false, // Don't refetch on window focus
    refetchOnReconnect: false, // Don't refetch on reconnect
    placeholderData: (previousData) => previousData,
  });
}

export interface UseClientParams {
  taskPage?: number;
  taskLimit?: number;
  serviceLine?: string;
  includeArchived?: boolean;
  enabled?: boolean;
}

/**
 * Fetch a single client with paginated projects
 */
export function useClient(
  GSClientID: string | number,
  params: UseClientParams = {}
) {
  const {
    taskPage = 1,
    taskLimit = 20,
    serviceLine,
    includeArchived = false,
    enabled = true,
  } = params;

  return useQuery<ClientWithTasks>({
    queryKey: clientKeys.detail(GSClientID, {
      taskPage,
      taskLimit,
      serviceLine,
      includeArchived,
    }),
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      searchParams.set('taskPage', taskPage.toString());
      searchParams.set('taskLimit', taskLimit.toString());
      if (serviceLine) searchParams.set('serviceLine', serviceLine);
      if (includeArchived) searchParams.set('includeArchived', 'true');

      const url = `/api/clients/${GSClientID}?${searchParams.toString()}`;
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch client');
      
      const result = await response.json();
      
      return result.success ? result.data : result;
    },
    enabled: enabled && !!GSClientID,
    staleTime: 10 * 60 * 1000, // 10 minutes - aligned with Redis cache TTL (increased from 5)
    gcTime: 15 * 60 * 1000, // 15 minutes cache retention (increased from 10)
    refetchOnMount: false, // Don't refetch if data is fresh
    refetchOnWindowFocus: false, // Don't refetch on window focus
    refetchOnReconnect: false, // Don't refetch on reconnect
    placeholderData: (previousData) => previousData, // Keep previous data while fetching new data
  });
}

/**
 * Update a client
 */
export function useUpdateClient(GSClientID: string | number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Partial<Client>) => {
      const response = await fetch(`/api/clients/${GSClientID}`, {
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
      queryClient.invalidateQueries({ queryKey: clientKeys.detail(GSClientID) });
      queryClient.invalidateQueries({ queryKey: clientKeys.all });
      // Invalidate workspace counts
      queryClient.invalidateQueries({ queryKey: ['workspace-counts'] });
    },
  });
}

/**
 * Delete a client
 */
export function useDeleteClient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (GSClientID: string | number) => {
      const response = await fetch(`/api/clients/${GSClientID}`, {
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
      // Invalidate workspace counts
      queryClient.invalidateQueries({ queryKey: ['workspace-counts'] });
    },
  });
}


