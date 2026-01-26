/**
 * Page Permission Matrix
 * Centralized configuration for page-level access control
 */

import { SystemRole } from '@/types';
import { PageAccessLevel, PagePermissionMap } from '@/types/pagePermissions';

/**
 * Page Permission Matrix
 * Maps page paths (with wildcard support) to role-based access levels
 * 
 * Pattern matching:
 * - Exact match: '/dashboard/admin/users'
 * - Wildcard: '/dashboard/admin/*' matches all admin pages
 * - Dynamic params: '/dashboard/tasks/:id' matches task detail pages
 * - Multiple params: '/dashboard/:serviceLine/:subServiceLineGroup/clients'
 */
export const PAGE_PERMISSIONS = {
  // ========================================
  // ADMIN PAGES (System Admin Only)
  // ========================================
  '/dashboard/admin/users': {
    [SystemRole.SYSTEM_ADMIN]: PageAccessLevel.FULL,
    [SystemRole.USER]: PageAccessLevel.NONE,
  },
  '/dashboard/admin/tools': {
    [SystemRole.SYSTEM_ADMIN]: PageAccessLevel.FULL,
    [SystemRole.USER]: PageAccessLevel.NONE,
  },
  '/dashboard/admin/service-lines': {
    [SystemRole.SYSTEM_ADMIN]: PageAccessLevel.FULL,
    [SystemRole.USER]: PageAccessLevel.NONE,
  },
  '/dashboard/admin/service-line-master': {
    [SystemRole.SYSTEM_ADMIN]: PageAccessLevel.FULL,
    [SystemRole.USER]: PageAccessLevel.NONE,
  },
  '/dashboard/admin/service-line-mapping': {
    [SystemRole.SYSTEM_ADMIN]: PageAccessLevel.FULL,
    [SystemRole.USER]: PageAccessLevel.NONE,
  },
  '/dashboard/admin/external-links': {
    [SystemRole.SYSTEM_ADMIN]: PageAccessLevel.FULL,
    [SystemRole.USER]: PageAccessLevel.NONE,
  },
  
  // Templates - Users can view but not edit
  '/dashboard/admin/templates': {
    [SystemRole.SYSTEM_ADMIN]: PageAccessLevel.FULL,
    [SystemRole.USER]: PageAccessLevel.VIEW,
  },
  '/dashboard/admin/templates/:id': {
    [SystemRole.SYSTEM_ADMIN]: PageAccessLevel.FULL,
    [SystemRole.USER]: PageAccessLevel.VIEW,
  },

  // ========================================
  // DASHBOARD & MAIN PAGES (All Users)
  // ========================================
  '/dashboard': {
    [SystemRole.SYSTEM_ADMIN]: PageAccessLevel.FULL,
    [SystemRole.USER]: PageAccessLevel.FULL,
  },
  '/dashboard/notifications': {
    [SystemRole.SYSTEM_ADMIN]: PageAccessLevel.FULL,
    [SystemRole.USER]: PageAccessLevel.FULL,
  },

  // ========================================
  // BUSINESS DEVELOPMENT (All Users)
  // ========================================
  '/dashboard/business_dev/news': {
    [SystemRole.SYSTEM_ADMIN]: PageAccessLevel.FULL,
    [SystemRole.USER]: PageAccessLevel.FULL,
  },

  // ========================================
  // DOCUMENT VAULT (All Users Can View)
  // ========================================
  '/dashboard/document-vault': {
    [SystemRole.SYSTEM_ADMIN]: PageAccessLevel.FULL,
    [SystemRole.USER]: PageAccessLevel.FULL,
  },
  '/dashboard/document-vault/:id': {
    [SystemRole.SYSTEM_ADMIN]: PageAccessLevel.FULL,
    [SystemRole.USER]: PageAccessLevel.FULL,
  },
  
  // Document Vault Admin (System Admin only)
  '/dashboard/admin/document-vault': {
    [SystemRole.SYSTEM_ADMIN]: PageAccessLevel.FULL,
    [SystemRole.USER]: PageAccessLevel.NONE,
  },
  '/dashboard/admin/document-vault/upload': {
    [SystemRole.SYSTEM_ADMIN]: PageAccessLevel.FULL,
    [SystemRole.USER]: PageAccessLevel.NONE,
  },
  '/dashboard/admin/document-vault/categories': {
    [SystemRole.SYSTEM_ADMIN]: PageAccessLevel.FULL,
    [SystemRole.USER]: PageAccessLevel.NONE,
  },

  // ========================================
  // SERVICE LINE PAGES (All Users)
  // ========================================
  '/dashboard/:serviceLine': {
    [SystemRole.SYSTEM_ADMIN]: PageAccessLevel.FULL,
    [SystemRole.USER]: PageAccessLevel.FULL,
  },
  '/dashboard/:serviceLine/bd': {
    [SystemRole.SYSTEM_ADMIN]: PageAccessLevel.FULL,
    [SystemRole.USER]: PageAccessLevel.FULL,
  },
  '/dashboard/:serviceLine/bd/:id': {
    [SystemRole.SYSTEM_ADMIN]: PageAccessLevel.FULL,
    [SystemRole.USER]: PageAccessLevel.FULL,
  },
  '/dashboard/:serviceLine/internal': {
    [SystemRole.SYSTEM_ADMIN]: PageAccessLevel.FULL,
    [SystemRole.USER]: PageAccessLevel.FULL,
  },
  '/dashboard/:serviceLine/internal/tasks/:taskId': {
    [SystemRole.SYSTEM_ADMIN]: PageAccessLevel.FULL,
    [SystemRole.USER]: PageAccessLevel.FULL,
  },
  '/dashboard/:serviceLine/:subServiceLineGroup': {
    [SystemRole.SYSTEM_ADMIN]: PageAccessLevel.FULL,
    [SystemRole.USER]: PageAccessLevel.FULL,
  },
  '/dashboard/:serviceLine/:subServiceLineGroup/clients': {
    [SystemRole.SYSTEM_ADMIN]: PageAccessLevel.FULL,
    [SystemRole.USER]: PageAccessLevel.FULL,
  },
  '/dashboard/:serviceLine/:subServiceLineGroup/clients/:id': {
    [SystemRole.SYSTEM_ADMIN]: PageAccessLevel.FULL,
    [SystemRole.USER]: PageAccessLevel.FULL,
  },
  '/dashboard/:serviceLine/:subServiceLineGroup/clients/:id/documents': {
    [SystemRole.SYSTEM_ADMIN]: PageAccessLevel.FULL,
    [SystemRole.USER]: PageAccessLevel.FULL,
  },
  '/dashboard/:serviceLine/:subServiceLineGroup/clients/:id/analytics': {
    [SystemRole.SYSTEM_ADMIN]: PageAccessLevel.FULL,
    [SystemRole.USER]: PageAccessLevel.FULL,
  },
  '/dashboard/:serviceLine/:subServiceLineGroup/clients/:id/tasks/:taskId': {
    [SystemRole.SYSTEM_ADMIN]: PageAccessLevel.FULL,
    [SystemRole.USER]: PageAccessLevel.FULL,
  },
  '/dashboard/:serviceLine/:subServiceLineGroup/groups/:groupCode': {
    [SystemRole.SYSTEM_ADMIN]: PageAccessLevel.FULL,
    [SystemRole.USER]: PageAccessLevel.FULL,
  },
  '/dashboard/:serviceLine/:subServiceLineGroup/groups/:groupCode/analytics': {
    [SystemRole.SYSTEM_ADMIN]: PageAccessLevel.FULL,
    [SystemRole.USER]: PageAccessLevel.FULL,
  },

  // ========================================
  // TASK PAGES (All Users)
  // ========================================
  '/dashboard/tasks/:id': {
    [SystemRole.SYSTEM_ADMIN]: PageAccessLevel.FULL,
    [SystemRole.USER]: PageAccessLevel.FULL,
  },
  '/dashboard/tasks/:id/users': {
    [SystemRole.SYSTEM_ADMIN]: PageAccessLevel.FULL,
    [SystemRole.USER]: PageAccessLevel.FULL,
  },
  '/dashboard/tasks/:id/document-management': {
    [SystemRole.SYSTEM_ADMIN]: PageAccessLevel.FULL,
    [SystemRole.USER]: PageAccessLevel.FULL,
  },
  '/dashboard/tasks/:id/mapping': {
    [SystemRole.SYSTEM_ADMIN]: PageAccessLevel.FULL,
    [SystemRole.USER]: PageAccessLevel.FULL,
  },
  '/dashboard/tasks/:id/balance-sheet': {
    [SystemRole.SYSTEM_ADMIN]: PageAccessLevel.FULL,
    [SystemRole.USER]: PageAccessLevel.FULL,
  },
  '/dashboard/tasks/:id/income-statement': {
    [SystemRole.SYSTEM_ADMIN]: PageAccessLevel.FULL,
    [SystemRole.USER]: PageAccessLevel.FULL,
  },
  '/dashboard/tasks/:id/tax-calculation': {
    [SystemRole.SYSTEM_ADMIN]: PageAccessLevel.FULL,
    [SystemRole.USER]: PageAccessLevel.FULL,
  },
  '/dashboard/tasks/:id/tax-calculation/adjustments': {
    [SystemRole.SYSTEM_ADMIN]: PageAccessLevel.FULL,
    [SystemRole.USER]: PageAccessLevel.FULL,
  },
  '/dashboard/tasks/:id/tax-calculation/adjustments/new': {
    [SystemRole.SYSTEM_ADMIN]: PageAccessLevel.FULL,
    [SystemRole.USER]: PageAccessLevel.FULL,
  },
  '/dashboard/tasks/:id/tax-calculation/adjustments/:adjustmentId': {
    [SystemRole.SYSTEM_ADMIN]: PageAccessLevel.FULL,
    [SystemRole.USER]: PageAccessLevel.FULL,
  },
  '/dashboard/tasks/:id/compliance-checklist': {
    [SystemRole.SYSTEM_ADMIN]: PageAccessLevel.FULL,
    [SystemRole.USER]: PageAccessLevel.FULL,
  },
  '/dashboard/tasks/:id/filing-status': {
    [SystemRole.SYSTEM_ADMIN]: PageAccessLevel.FULL,
    [SystemRole.USER]: PageAccessLevel.FULL,
  },
  '/dashboard/tasks/:id/sars-responses': {
    [SystemRole.SYSTEM_ADMIN]: PageAccessLevel.FULL,
    [SystemRole.USER]: PageAccessLevel.FULL,
  },
  '/dashboard/tasks/:id/reporting': {
    [SystemRole.SYSTEM_ADMIN]: PageAccessLevel.FULL,
    [SystemRole.USER]: PageAccessLevel.FULL,
  },
  '/dashboard/tasks/:id/opinion-drafting': {
    [SystemRole.SYSTEM_ADMIN]: PageAccessLevel.FULL,
    [SystemRole.USER]: PageAccessLevel.FULL,
  },
} as PagePermissionMap;

/**
 * Get default access level for pages not in the matrix
 * Default: FULL for SYSTEM_ADMIN, FULL for USER (fail-open for regular pages)
 */
export function getDefaultAccessLevel(role: SystemRole): PageAccessLevel {
  // System admins always have full access
  if (role === SystemRole.SYSTEM_ADMIN) {
    return PageAccessLevel.FULL;
  }
  
  // Regular users have full access by default
  // (specific restrictions are defined in the matrix above)
  return PageAccessLevel.FULL;
}

