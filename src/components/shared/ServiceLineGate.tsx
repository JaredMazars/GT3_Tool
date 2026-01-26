'use client';

import { ReactNode } from 'react';
import { useServiceLineAccess } from '@/hooks/permissions/useServiceLineAccess';

interface ServiceLineGateProps {
  /** Service line to check access for */
  serviceLine: string;
  /** Minimum role required in service line */
  minimumRole?: string;
  /** Children to render if user has access */
  children: ReactNode;
  /** Optional: Content to render if user doesn't have access */
  fallback?: ReactNode;
  /** Optional: Show loading state */
  showLoading?: boolean;
  /** Optional: Loading component to show */
  loadingComponent?: ReactNode;
}

/**
 * ServiceLineGate component
 * Conditionally renders children based on user's service line access
 * 
 * @example
 * <ServiceLineGate serviceLine="TAX" minimumRole="MANAGER">
 *   <AdminFeatures />
 * </ServiceLineGate>
 */
export function ServiceLineGate({
  serviceLine,
  minimumRole,
  children,
  fallback = null,
  showLoading = false,
  loadingComponent = null,
}: ServiceLineGateProps) {
  const { hasAccess, isLoading } = useServiceLineAccess(serviceLine, minimumRole);

  if (isLoading && showLoading) {
    return <>{loadingComponent}</>;
  }

  if (!hasAccess) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}


