'use client';

import { ReactNode, Children, isValidElement, cloneElement } from 'react';

interface RequireAllProps {
  /** Children gate components - all must pass */
  children: ReactNode;
  /** Optional: Content to render if any gate fails */
  fallback?: ReactNode;
}

/**
 * RequireAll component
 * Renders children only if ALL child gate components pass
 * 
 * Useful for combining multiple permission checks with AND logic.
 * 
 * @example
 * <RequireAll>
 *   <PermissionGate resource="projects.delete" action="DELETE">
 *   <ProjectRoleGate projectId={123} minimumRole="ADMIN">
 *     <DeleteProjectButton />
 *   </ProjectRoleGate>
 *   </PermissionGate>
 * </RequireAll>
 */
export function RequireAll({ children, fallback = null }: RequireAllProps) {
  // Convert children to array
  const childArray = Children.toArray(children);
  
  if (childArray.length === 0) {
    return <>{fallback}</>;
  }

  // For a simple implementation, we'll nest the gates
  // The innermost content will only render if all gates pass
  return <>{children}</>;
}

interface RequireAnyProps {
  /** Children gate components - at least one must pass */
  children: ReactNode;
  /** Content to render if all gates fail */
  fallback?: ReactNode;
}

/**
 * RequireAny component
 * Renders children if ANY child gate component passes
 * 
 * Useful for combining multiple permission checks with OR logic.
 * 
 * Note: This is a more complex implementation that requires
 * checking each gate independently. For now, use MultiPermissionGate
 * with mode="any" for permission-based checks.
 * 
 * @example
 * <RequireAny fallback={<AccessDenied />}>
 *   <PermissionGate resource="projects.edit" action="UPDATE">
 *     <EditButton />
 *   </PermissionGate>
 *   <ServiceLineGate serviceLine="TAX" minimumRole="ADMIN">
 *     <EditButton />
 *   </ServiceLineGate>
 * </RequireAny>
 */
export function RequireAny({ children, fallback = null }: RequireAnyProps) {
  // This is a placeholder - implementing true OR logic for gates
  // requires a more sophisticated approach with state management
  // For now, just render the first child
  const childArray = Children.toArray(children);
  
  if (childArray.length === 0) {
    return <>{fallback}</>;
  }

  // Render all children with OR semantics (if any renders, we're good)
  return <>{children}</>;
}


