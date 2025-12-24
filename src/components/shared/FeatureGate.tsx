/**
 * FeatureGate Component
 * Conditionally render content based on user features
 */

'use client';

import { ReactNode } from 'react';
import { useFeature, useAnyFeature, useAllFeatures } from '@/hooks/permissions/useFeature';
import { Feature } from '@/lib/permissions/features';

interface FeatureGateProps {
  /** The feature to check */
  feature: Feature;
  /** Optional service line context */
  serviceLine?: string;
  /** Children to render if user has feature */
  children: ReactNode;
  /** Optional: Content to render if user doesn't have feature */
  fallback?: ReactNode;
  /** Optional: Show loading state */
  showLoading?: boolean;
  /** Optional: Loading component to show */
  loadingComponent?: ReactNode;
}

/**
 * FeatureGate component
 * Conditionally renders children based on user features
 * 
 * @example
 * <FeatureGate feature={Feature.MANAGE_TASKS}>
 *   <button>Create Task</button>
 * </FeatureGate>
 */
export function FeatureGate({
  feature,
  serviceLine,
  children,
  fallback = null,
  showLoading = false,
  loadingComponent = null,
}: FeatureGateProps) {
  const { hasFeature, isLoading } = useFeature(feature, serviceLine);

  if (isLoading && showLoading) {
    return <>{loadingComponent}</>;
  }

  if (!hasFeature) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

interface MultiFeatureGateProps {
  /** The features to check */
  features: Feature[];
  /** Mode: 'any' (at least one) or 'all' (must have all) */
  mode?: 'any' | 'all';
  /** Optional service line context */
  serviceLine?: string;
  /** Children to render if user has feature(s) */
  children: ReactNode;
  /** Optional: Content to render if user doesn't have feature(s) */
  fallback?: ReactNode;
  /** Optional: Show loading state */
  showLoading?: boolean;
  /** Optional: Loading component to show */
  loadingComponent?: ReactNode;
}

/**
 * MultiFeatureGate component
 * Conditionally renders children based on multiple feature checks
 * 
 * @example
 * // Requires MANAGE_TASKS OR ASSIGN_TASK_TEAM feature
 * <MultiFeatureGate features={[Feature.MANAGE_TASKS, Feature.ASSIGN_TASK_TEAM]} mode="any">
 *   <button>Manage Task</button>
 * </MultiFeatureGate>
 * 
 * @example
 * // Requires both MANAGE_TASKS AND APPROVE_ACCEPTANCE features
 * <MultiFeatureGate features={[Feature.MANAGE_TASKS, Feature.APPROVE_ACCEPTANCE]} mode="all">
 *   <button>Advanced Actions</button>
 * </MultiFeatureGate>
 */
export function MultiFeatureGate({
  features,
  mode = 'any',
  serviceLine,
  children,
  fallback = null,
  showLoading = false,
  loadingComponent = null,
}: MultiFeatureGateProps) {
  // Always call both hooks unconditionally (required by React Hooks rules)
  const anyResult = useAnyFeature(features, serviceLine);
  const allResult = useAllFeatures(features, serviceLine);
  
  // Choose which result to use based on mode
  const { hasFeature, isLoading } = mode === 'any' ? anyResult : allResult;

  if (isLoading && showLoading) {
    return <>{loadingComponent}</>;
  }

  if (!hasFeature) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}




























