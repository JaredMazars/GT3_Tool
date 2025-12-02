'use client';

import { ReactNode } from 'react';
import { usePermission, usePermissionAny, usePermissionAll } from '@/hooks/permissions/usePermission';

type PermissionAction = 'CREATE' | 'READ' | 'UPDATE' | 'DELETE';

interface PermissionGateProps {
  /** The resource to check permission for */
  resource: string;
  /** The action to check permission for */
  action: PermissionAction;
  /** Children to render if user has permission */
  children: ReactNode;
  /** Optional: Content to render if user doesn't have permission */
  fallback?: ReactNode;
  /** Optional: Show loading state */
  showLoading?: boolean;
  /** Optional: Loading component to show */
  loadingComponent?: ReactNode;
}

/**
 * PermissionGate component
 * Conditionally renders children based on user permissions
 * 
 * @example
 * <PermissionGate resource="clients" action="CREATE">
 *   <button>Create Client</button>
 * </PermissionGate>
 */
export function PermissionGate({
  resource,
  action,
  children,
  fallback = null,
  showLoading = false,
  loadingComponent = null,
}: PermissionGateProps) {
  const { hasPermission, isLoading } = usePermission(resource, action);

  if (isLoading && showLoading) {
    return <>{loadingComponent}</>;
  }

  if (!hasPermission) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

interface MultiPermissionGateProps {
  /** The resource to check permission for */
  resource: string;
  /** The actions to check permission for */
  actions: PermissionAction[];
  /** Mode: 'any' (at least one) or 'all' (must have all) */
  mode?: 'any' | 'all';
  /** Children to render if user has permission */
  children: ReactNode;
  /** Optional: Content to render if user doesn't have permission */
  fallback?: ReactNode;
  /** Optional: Show loading state */
  showLoading?: boolean;
  /** Optional: Loading component to show */
  loadingComponent?: ReactNode;
}

/**
 * MultiPermissionGate component
 * Conditionally renders children based on multiple permission checks
 * 
 * @example
 * // Requires CREATE OR UPDATE permission
 * <MultiPermissionGate resource="clients" actions={['CREATE', 'UPDATE']} mode="any">
 *   <button>Manage Client</button>
 * </MultiPermissionGate>
 * 
 * @example
 * // Requires both CREATE AND DELETE permission
 * <MultiPermissionGate resource="projects" actions={['CREATE', 'DELETE']} mode="all">
 *   <button>Advanced Actions</button>
 * </MultiPermissionGate>
 */
export function MultiPermissionGate({
  resource,
  actions,
  mode = 'any',
  children,
  fallback = null,
  showLoading = false,
  loadingComponent = null,
}: MultiPermissionGateProps) {
  // Always call both hooks unconditionally (required by React Hooks rules)
  const anyResult = usePermissionAny(resource, actions);
  const allResult = usePermissionAll(resource, actions);
  
  // Choose which result to use based on mode
  const { hasPermission, isLoading } = mode === 'any' ? anyResult : allResult;

  if (isLoading && showLoading) {
    return <>{loadingComponent}</>;
  }

  if (!hasPermission) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

