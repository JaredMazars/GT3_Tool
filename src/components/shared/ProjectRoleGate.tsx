'use client';

import { ReactNode } from 'react';
import { useProjectAccess } from '@/hooks/permissions/useProjectAccess';

interface ProjectRoleGateProps {
  /** Project ID to check access for */
  projectId: number;
  /** Minimum role required in project */
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
 * ProjectRoleGate component
 * Conditionally renders children based on user's project role
 * 
 * @example
 * <ProjectRoleGate projectId={123} minimumRole="EDITOR">
 *   <EditButton />
 * </ProjectRoleGate>
 */
export function ProjectRoleGate({
  projectId,
  minimumRole,
  children,
  fallback = null,
  showLoading = false,
  loadingComponent = null,
}: ProjectRoleGateProps) {
  const { hasAccess, isLoading } = useProjectAccess(projectId, minimumRole);

  if (isLoading && showLoading) {
    return <>{loadingComponent}</>;
  }

  if (!hasAccess) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}


