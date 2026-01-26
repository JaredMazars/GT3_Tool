/**
 * React Hook for Feature Permissions
 * Client-side permission checking using feature flags with React Query caching
 */

'use client';

import { useQuery } from '@tanstack/react-query';
import { Feature } from '@/lib/permissions/features';

interface FeatureCheckResult {
  hasFeature: boolean;
  isLoading: boolean;
  error: Error | null;
}

/**
 * Query keys for feature permissions
 */
export const featureKeys = {
  feature: (feature: Feature, serviceLine?: string) => 
    ['feature', feature, serviceLine] as const,
  features: (features: Feature[], mode: 'any' | 'all', serviceLine?: string) => 
    ['features', mode, features.join(','), serviceLine] as const,
};

/**
 * Check if the current user has a specific feature
 * Uses React Query for automatic caching and deduplication
 * 
 * @param feature - The feature to check
 * @param serviceLine - Optional service line context
 * @returns Object with hasFeature, isLoading, and error
 */
export function useFeature(
  feature: Feature,
  serviceLine?: string
): FeatureCheckResult {
  const { data, isLoading, error } = useQuery({
    queryKey: featureKeys.feature(feature, serviceLine),
    queryFn: async (): Promise<boolean> => {
      const params = new URLSearchParams({ feature });
      if (serviceLine) {
        params.append('serviceLine', serviceLine);
      }

      const response = await fetch(`/api/permissions/check?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error('Failed to check feature permission');
      }

      const result = await response.json();
      // successResponse wraps data in { success: true, data: { hasFeature: ... } }
      return result.data?.hasFeature || false;
    },
    staleTime: 10 * 60 * 1000, // 10 minutes - matches Redis cache TTL
    gcTime: 15 * 60 * 1000, // 15 minutes
    refetchOnWindowFocus: false, // Don't refetch on focus - permissions rarely change
    refetchOnMount: false, // Don't refetch if data is fresh
  });

  return { 
    hasFeature: data ?? false, 
    isLoading, 
    error: error as Error | null 
  };
}

/**
 * Check if user has ANY of the specified features
 * Uses React Query for automatic caching and deduplication
 * 
 * @param features - Array of features to check
 * @param serviceLine - Optional service line context
 * @returns Object with hasFeature (true if any feature exists), isLoading, and error
 */
export function useAnyFeature(
  features: Feature[],
  serviceLine?: string
): FeatureCheckResult {
  const { data, isLoading, error } = useQuery({
    queryKey: featureKeys.features(features, 'any', serviceLine),
    queryFn: async (): Promise<boolean> => {
      if (features.length === 0) {
        return false;
      }

      const params = new URLSearchParams({
        features: features.join(','),
        mode: 'any',
      });
      if (serviceLine) {
        params.append('serviceLine', serviceLine);
      }

      const response = await fetch(`/api/permissions/check?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error('Failed to check feature permissions');
      }

      const result = await response.json();
      // successResponse wraps data in { success: true, data: { hasFeature: ... } }
      return result.data?.hasFeature || false;
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 15 * 60 * 1000, // 15 minutes
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    enabled: features.length > 0,
  });

  return { 
    hasFeature: data ?? false, 
    isLoading, 
    error: error as Error | null 
  };
}

/**
 * Check if user has ALL of the specified features
 * Uses React Query for automatic caching and deduplication
 * 
 * @param features - Array of features to check
 * @param serviceLine - Optional service line context
 * @returns Object with hasFeature (true if all features exist), isLoading, and error
 */
export function useAllFeatures(
  features: Feature[],
  serviceLine?: string
): FeatureCheckResult {
  const { data, isLoading, error } = useQuery({
    queryKey: featureKeys.features(features, 'all', serviceLine),
    queryFn: async (): Promise<boolean> => {
      if (features.length === 0) {
        return false;
      }

      const params = new URLSearchParams({
        features: features.join(','),
        mode: 'all',
      });
      if (serviceLine) {
        params.append('serviceLine', serviceLine);
      }

      const response = await fetch(`/api/permissions/check?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error('Failed to check feature permissions');
      }

      const result = await response.json();
      // successResponse wraps data in { success: true, data: { hasFeature: ... } }
      return result.data?.hasFeature || false;
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 15 * 60 * 1000, // 15 minutes
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    enabled: features.length > 0,
  });

  return { 
    hasFeature: data ?? false, 
    isLoading, 
    error: error as Error | null 
  };
}




























