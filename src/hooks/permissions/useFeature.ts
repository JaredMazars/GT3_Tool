/**
 * React Hook for Feature Permissions
 * Client-side permission checking using feature flags
 */

'use client';

import { useEffect, useState } from 'react';
import { Feature } from '@/lib/permissions/features';

interface FeatureCheckResult {
  hasFeature: boolean;
  isLoading: boolean;
  error: Error | null;
}

/**
 * Check if the current user has a specific feature
 * Makes an API call to check user's permissions
 * 
 * @param feature - The feature to check
 * @param serviceLine - Optional service line context
 * @returns Object with hasFeature, isLoading, and error
 */
export function useFeature(
  feature: Feature,
  serviceLine?: string
): FeatureCheckResult {
  const [hasFeature, setHasFeature] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function checkFeature() {
      try {
        setIsLoading(true);
        setError(null);

        const params = new URLSearchParams({ feature });
        if (serviceLine) {
          params.append('serviceLine', serviceLine);
        }

        const response = await fetch(`/api/permissions/check?${params.toString()}`);
        
        if (!response.ok) {
          throw new Error('Failed to check feature permission');
        }

        const result = await response.json();
        
        if (isMounted) {
          // successResponse wraps data in { success: true, data: { hasFeature: ... } }
          setHasFeature(result.data?.hasFeature || false);
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err : new Error('Unknown error'));
          setHasFeature(false);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    checkFeature();

    return () => {
      isMounted = false;
    };
  }, [feature, serviceLine]);

  return { hasFeature, isLoading, error };
}

/**
 * Check if user has ANY of the specified features
 * @param features - Array of features to check
 * @param serviceLine - Optional service line context
 * @returns Object with hasFeature (true if any feature exists), isLoading, and error
 */
export function useAnyFeature(
  features: Feature[],
  serviceLine?: string
): FeatureCheckResult {
  const [hasFeature, setHasFeature] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function checkFeatures() {
      try {
        setIsLoading(true);
        setError(null);

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
        
        if (isMounted) {
          // successResponse wraps data in { success: true, data: { hasFeature: ... } }
          setHasFeature(result.data?.hasFeature || false);
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err : new Error('Unknown error'));
          setHasFeature(false);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    if (features.length > 0) {
      checkFeatures();
    } else {
      setIsLoading(false);
      setHasFeature(false);
    }

    return () => {
      isMounted = false;
    };
  }, [features.join(','), serviceLine]);

  return { hasFeature, isLoading, error };
}

/**
 * Check if user has ALL of the specified features
 * @param features - Array of features to check
 * @param serviceLine - Optional service line context
 * @returns Object with hasFeature (true if all features exist), isLoading, and error
 */
export function useAllFeatures(
  features: Feature[],
  serviceLine?: string
): FeatureCheckResult {
  const [hasFeature, setHasFeature] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function checkFeatures() {
      try {
        setIsLoading(true);
        setError(null);

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
        
        if (isMounted) {
          // successResponse wraps data in { success: true, data: { hasFeature: ... } }
          setHasFeature(result.data?.hasFeature || false);
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err : new Error('Unknown error'));
          setHasFeature(false);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    if (features.length > 0) {
      checkFeatures();
    } else {
      setIsLoading(false);
      setHasFeature(false);
    }

    return () => {
      isMounted = false;
    };
  }, [features.join(','), serviceLine]);

  return { hasFeature, isLoading, error };
}








