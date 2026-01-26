/**
 * Edit Action Wrapper
 * Conditionally renders children based on page access level
 */

'use client';

import { ReactNode } from 'react';
import { usePageAccess } from '@/hooks/permissions/usePageAccess';

interface EditActionWrapperProps {
  children: ReactNode;
  /**
   * Optional: Show a placeholder when user can't edit
   */
  fallback?: ReactNode;
}

/**
 * Wrapper component that hides edit/create/delete actions in VIEW mode
 * Only renders children if user has FULL access
 * 
 * @example
 * <EditActionWrapper>
 *   <button onClick={handleEdit}>Edit</button>
 * </EditActionWrapper>
 */
export function EditActionWrapper({ children, fallback = null }: EditActionWrapperProps) {
  const { canEdit } = usePageAccess();

  if (!canEdit) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

/**
 * Wrapper for delete actions (same as EditActionWrapper but more semantic)
 */
export function DeleteActionWrapper({ children, fallback = null }: EditActionWrapperProps) {
  const { canEdit } = usePageAccess();

  if (!canEdit) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

/**
 * Wrapper for create actions (same as EditActionWrapper but more semantic)
 */
export function CreateActionWrapper({ children, fallback = null }: EditActionWrapperProps) {
  const { canEdit } = usePageAccess();

  if (!canEdit) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}






















