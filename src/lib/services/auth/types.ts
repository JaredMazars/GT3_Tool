/**
 * Authentication type definitions
 * Shared across Edge and Node runtimes
 */

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role?: string; // Deprecated - use systemRole instead
  systemRole?: string; // SYSTEM_ADMIN or USER
}

export interface Session {
  user: SessionUser;
  exp: number;
}

/**
 * Permission check result
 */
export interface PermissionCheckResult {
  allowed: boolean;
  reason?: string;
}
