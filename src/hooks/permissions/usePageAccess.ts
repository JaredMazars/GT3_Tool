/**
 * Page Access Hook
 * Client-side hook for checking page access level
 */

'use client';

import { usePageAccessContext } from '@/components/providers/PageAccessProvider';
import { PageAccessLevel } from '@/types/pagePermissions';

/**
 * Hook to get current page's access level
 * Must be used within PageAccessProvider (wrapped by PageAccessGuard)
 * 
 * @returns Object with access level and convenience flags
 * 
 * @example
 * const { isViewOnly, canEdit } = usePageAccess();
 * 
 * // Hide edit button for view-only users
 * {canEdit && <button>Edit</button>}
 * 
 * // Show read-only badge
 * {isViewOnly && <ViewOnlyBadge />}
 */
export function usePageAccess() {
  return usePageAccessContext();
}

/**
 * Check if current page has specific access level
 * @param level - Access level to check
 * @returns true if page has the specified access level
 */
export function useHasAccessLevel(level: PageAccessLevel): boolean {
  const { accessLevel } = usePageAccessContext();
  return accessLevel === level;
}






















