'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ServiceLineWithStats } from '@/types/dto';
import { ServiceLineRole } from '@/types';

// Query Keys
export const serviceLineKeys = {
  all: ['service-lines'] as const,
  user: (userId?: string) => [...serviceLineKeys.all, 'user', userId] as const,
  admin: ['service-lines', 'admin'] as const,
};

/**
 * Fetch service lines available to current user
 * Optimized settings match Redis cache TTL (10 minutes) to reduce unnecessary refetches
 */
export function useServiceLines() {
  return useQuery<ServiceLineWithStats[]>({
    queryKey: serviceLineKeys.all,
    queryFn: async () => {
      const response = await fetch('/api/service-lines', {
        credentials: 'include', // Ensure cookies are sent
      });
      if (!response.ok) throw new Error('Failed to fetch service lines');
      
      const result = await response.json();
      const data = result.success ? result.data : result;
      return Array.isArray(data) ? data : [];
    },
    staleTime: 10 * 60 * 1000, // 10 minutes - matches Redis cache TTL
    gcTime: 15 * 60 * 1000, // 15 minutes
    refetchOnWindowFocus: false, // Don't refetch on focus - data is cached
    refetchOnMount: false, // Don't refetch if data is fresh
  });
}

/**
 * Grant service line access to a user (Admin only)
 */
export function useGrantServiceLineAccess() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      userId: string;
      serviceLine: string;
      role: ServiceLineRole;
    }) => {
      const response = await fetch('/api/admin/service-line-access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to grant access');
      }
      return response.json();
    },
    onSuccess: () => {
      // Invalidate both admin view and user's service lines
      queryClient.invalidateQueries({ queryKey: serviceLineKeys.admin });
      queryClient.invalidateQueries({ queryKey: serviceLineKeys.all });
    },
  });
}

/**
 * Update service line role (Admin only)
 */
export function useUpdateServiceLineRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      id: number;
      role: ServiceLineRole;
    }) => {
      const response = await fetch('/api/admin/service-line-access', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update role');
      }
      return response.json();
    },
    onSuccess: () => {
      // Invalidate both admin view and user's service lines
      queryClient.invalidateQueries({ queryKey: serviceLineKeys.admin });
      queryClient.invalidateQueries({ queryKey: serviceLineKeys.all });
    },
  });
}

/**
 * Revoke service line access (Admin only)
 */
export function useRevokeServiceLineAccess() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (serviceLineUserId: number) => {
      const response = await fetch(
        `/api/admin/service-line-access?id=${serviceLineUserId}`,
        { method: 'DELETE' }
      );
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to revoke access');
      }
      return response.json();
    },
    onSuccess: () => {
      // Invalidate both admin view and user's service lines
      queryClient.invalidateQueries({ queryKey: serviceLineKeys.admin });
      queryClient.invalidateQueries({ queryKey: serviceLineKeys.all });
    },
  });
}


