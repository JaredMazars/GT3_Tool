/**
 * System Admin Utility
 * 
 * Centralized logic for SYSTEM_ADMIN role checks and bypasses.
 * SYSTEM_ADMIN has full system access and bypasses most authorization checks.
 */

import { SystemRole } from './roleHierarchy';
import { logger } from './logger';

/**
 * User interface for system admin checks
 */
export interface UserLike {
  id?: string;
  role?: string;
}

/**
 * Check if a user is a System Admin (in-memory check)
 * 
 * Use this variant when you have a user object or role string in memory.
 * For other use cases:
 * - For simple role string checks: use `isSystemAdmin()` from `@/lib/utils/roleHierarchy`
 * - For database lookups by user ID: use `isSystemAdmin()` from `@/lib/services/auth/authorization`
 * 
 * @param user - User object or role string
 * @returns true if user is SYSTEM_ADMIN
 * @see {@link roleHierarchy.isSystemAdmin} for role string checks
 * @see {@link authorization.isSystemAdmin} for database lookups
 */
export function isSystemAdmin(user: UserLike | string | null | undefined): boolean {
  if (!user) return false;
  
  if (typeof user === 'string') {
    return user === SystemRole.SYSTEM_ADMIN;
  }
  
  return user.role === SystemRole.SYSTEM_ADMIN || user.role === 'ADMIN'; // Support legacy ADMIN role
}

/**
 * Bypass check if user is System Admin, otherwise execute the check
 * @param user - User to check
 * @param check - Function to execute if not System Admin
 * @param systemAdminDefault - Value to return for System Admin
 * @param logContext - Optional context for logging
 * @returns Result of check or systemAdminDefault
 */
export async function bypassIfSystemAdmin<T>(
  user: UserLike | null | undefined,
  check: () => Promise<T>,
  systemAdminDefault: T,
  logContext?: string
): Promise<T> {
  if (isSystemAdmin(user)) {
    if (logContext && user && 'id' in user) {
      logger.info('SYSTEM_ADMIN bypass', {
        userId: user.id,
        context: logContext,
      });
    }
    return systemAdminDefault;
  }
  
  return check();
}

/**
 * Synchronous version of bypassIfSystemAdmin
 * @param user - User to check
 * @param check - Function to execute if not System Admin
 * @param systemAdminDefault - Value to return for System Admin
 * @param logContext - Optional context for logging
 * @returns Result of check or systemAdminDefault
 */
export function bypassIfSystemAdminSync<T>(
  user: UserLike | null | undefined,
  check: () => T,
  systemAdminDefault: T,
  logContext?: string
): T {
  if (isSystemAdmin(user)) {
    if (logContext && user && 'id' in user) {
      logger.info('SYSTEM_ADMIN bypass', {
        userId: user.id,
        context: logContext,
      });
    }
    return systemAdminDefault;
  }
  
  return check();
}

/**
 * Require System Admin role, throw error if not
 * @param user - User to check
 * @param errorMessage - Optional custom error message
 * @throws Error if user is not System Admin
 */
export function requireSystemAdmin(
  user: UserLike | null | undefined,
  errorMessage = 'SYSTEM_ADMIN role required'
): asserts user is UserLike {
  if (!isSystemAdmin(user)) {
    throw new Error(errorMessage);
  }
}

/**
 * Check if user is System Admin or has alternate condition
 * @param user - User to check
 * @param alternateCheck - Condition to check if not System Admin
 * @returns true if System Admin or alternate check passes
 */
export async function isSystemAdminOr(
  user: UserLike | null | undefined,
  alternateCheck: () => Promise<boolean>
): Promise<boolean> {
  if (isSystemAdmin(user)) {
    return true;
  }
  
  return alternateCheck();
}

/**
 * Synchronous version of isSystemAdminOr
 * @param user - User to check
 * @param alternateCheck - Condition to check if not System Admin
 * @returns true if System Admin or alternate check passes
 */
export function isSystemAdminOrSync(
  user: UserLike | null | undefined,
  alternateCheck: () => boolean
): boolean {
  if (isSystemAdmin(user)) {
    return true;
  }
  
  return alternateCheck();
}

/**
 * Log System Admin access for audit trail
 * @param userId - System Admin user ID
 * @param action - Action being performed
 * @param resource - Resource being accessed
 * @param metadata - Additional metadata
 */
export function logSystemAdminAccess(
  userId: string,
  action: string,
  resource: string,
  metadata?: Record<string, any>
): void {
  logger.info('SYSTEM_ADMIN access', {
    userId,
    action,
    resource,
    timestamp: new Date().toISOString(),
    ...metadata,
  });
}

/**
 * Validate that a role value is a valid system role
 * @param role - Role to validate
 * @returns true if valid system role (SYSTEM_ADMIN or USER)
 */
export function isValidSystemRole(role: string): boolean {
  return role === SystemRole.SYSTEM_ADMIN || role === SystemRole.USER;
}


