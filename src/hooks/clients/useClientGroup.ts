'use client';

import { useQuery } from '@tanstack/react-query';
import { Client } from './useClients';

// Query Keys
export const clientGroupDetailKeys = {
  all: ['client-group-detail'] as const,
  detail: (groupCode: string, params?: Record<string, string | number | null | undefined>) => 
    [...clientGroupDetailKeys.all, groupCode, params] as const,
};

// Types
export interface ClientGroupDetail {
  groupCode: string;
  groupDesc: string;
  clients?: Client[];
  tasks?: Array<{
    id: number;
    TaskDesc: string;
    TaskCode: string;
    Active: string;
    ServLineCode: string;
    ServLineDesc: string;
    SLGroup: string;
    masterServiceLine: string | null;
    subServiceLineGroupCode: string | null;
    createdAt: string;
    updatedAt: string;
    Client: {
      GSClientID: string;
      clientCode: string;
      clientNameFull: string | null;
    };
    wip?: {
      balWIP: number;
      balTime: number;
      balDisb: number;
    };
  }>;
  serviceLineMaster?: Array<{
    code: string;
    name: string;
    description: string | null;
  }>;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface UseClientGroupParams {
  search?: string;
  page?: number;
  limit?: number;
  type?: 'clients' | 'tasks';
  serviceLine?: string; // Filter tasks by master service line
  enabled?: boolean;
}

/**
 * Fetch a single client group with paginated clients or tasks
 */
export function useClientGroup(
  groupCode: string,
  params: UseClientGroupParams = {}
) {
  const {
    search = '',
    page = 1,
    limit = 20,
    type = 'clients',
    serviceLine,
    enabled = true,
  } = params;

  return useQuery<ClientGroupDetail>({
    queryKey: clientGroupDetailKeys.detail(groupCode, { search, page, limit, type, serviceLine }),
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      if (search) searchParams.set('search', search);
      searchParams.set('page', page.toString());
      searchParams.set('limit', limit.toString());
      searchParams.set('type', type);
      if (serviceLine) searchParams.set('serviceLine', serviceLine);

      const url = `/api/groups/${encodeURIComponent(groupCode)}?${searchParams.toString()}`;
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch group details');
      
      const result = await response.json();
      return result.success ? result.data : result;
    },
    enabled: enabled && !!groupCode,
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 15 * 60 * 1000, // 15 minutes cache retention
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    placeholderData: (previousData) => previousData,
  });
}

