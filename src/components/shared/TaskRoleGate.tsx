'use client';

import { ReactNode } from 'react';
import { useTaskAccess } from '@/hooks/permissions/useTaskAccess';

interface TaskRoleGateProps {
  /** Task ID to check access for */
  taskId: number;
  /** Minimum role required in task */
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
 * TaskRoleGate component
 * Conditionally renders children based on user's task role
 * 
 * @example
 * <TaskRoleGate taskId={123} minimumRole="EDITOR">
 *   <EditButton />
 * </TaskRoleGate>
 */
export function TaskRoleGate({
  taskId,
  minimumRole,
  children,
  fallback = null,
  showLoading = false,
  loadingComponent = null,
}: TaskRoleGateProps) {
  const { hasAccess, isLoading } = useTaskAccess(taskId, minimumRole);

  if (isLoading && showLoading) {
    return <>{loadingComponent}</>;
  }

  if (!hasAccess) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}





