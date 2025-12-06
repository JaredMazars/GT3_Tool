/**
 * Role Hierarchy Utility
 * 
 * Centralized role hierarchy logic for the three-tier security model:
 * 1. System Level (User.role) - SYSTEM_ADMIN, USER
 * 2. Service Line Level (ServiceLineUser.role) - ADMINISTRATOR, PARTNER, MANAGER, SUPERVISOR, USER, VIEWER
 * 3. Task Level (TaskTeam.role) - ADMIN, REVIEWER, EDITOR, VIEWER
 */

/**
 * System Roles - User.role
 * ONLY these two roles should exist at the system level
 */
export enum SystemRole {
  SYSTEM_ADMIN = 'SYSTEM_ADMIN', // Full system access, bypasses all checks
  USER = 'USER',                  // Regular user, requires service line assignments
}

/**
 * Service Line Roles - ServiceLineUser.role
 * Used to control access within a service line (TAX, AUDIT, etc.)
 */
export enum ServiceLineRole {
  ADMINISTRATOR = 'ADMINISTRATOR', // Service line administrator (highest)
  PARTNER = 'PARTNER',             // Partner level (can approve letters)
  MANAGER = 'MANAGER',             // Manager level
  SUPERVISOR = 'SUPERVISOR',       // Supervisor level
  USER = 'USER',                   // Staff level
  VIEWER = 'VIEWER',               // View-only access (lowest)
}

/**
 * Task Roles - TaskTeam.role
 * Used to control access within a specific task
 */
export enum TaskRole {
  ADMIN = 'ADMIN',       // Full task control
  REVIEWER = 'REVIEWER', // Can review and approve work
  EDITOR = 'EDITOR',     // Can edit task data
  VIEWER = 'VIEWER',     // Read-only access
}

/**
 * Service Line Role Hierarchy
 * Higher numbers = more privileges
 */
const SERVICE_LINE_HIERARCHY: Record<string, number> = {
  [ServiceLineRole.VIEWER]: 1,
  [ServiceLineRole.USER]: 2,
  [ServiceLineRole.SUPERVISOR]: 3,
  [ServiceLineRole.MANAGER]: 4,
  [ServiceLineRole.PARTNER]: 5,
  [ServiceLineRole.ADMINISTRATOR]: 6, // Administrator is highest
};

/**
 * Task Role Hierarchy
 * Higher numbers = more privileges
 */
const TASK_ROLE_HIERARCHY: Record<string, number> = {
  [TaskRole.VIEWER]: 1,
  [TaskRole.EDITOR]: 2,
  [TaskRole.REVIEWER]: 3,
  [TaskRole.ADMIN]: 4,
};

/**
 * Check if a service line role meets or exceeds the required role
 * @param userRole - The user's current role
 * @param requiredRole - The minimum required role
 * @returns true if user role is sufficient
 */
export function hasServiceLineRole(
  userRole: string,
  requiredRole: string
): boolean {
  const userLevel = SERVICE_LINE_HIERARCHY[userRole] || 0;
  const requiredLevel = SERVICE_LINE_HIERARCHY[requiredRole] || 0;
  return userLevel >= requiredLevel;
}

/**
 * Check if a task role meets or exceeds the required role
 * @param userRole - The user's current role
 * @param requiredRole - The minimum required role
 * @returns true if user role is sufficient
 */
export function hasTaskRole(
  userRole: string,
  requiredRole: string
): boolean {
  const userLevel = TASK_ROLE_HIERARCHY[userRole] || 0;
  const requiredLevel = TASK_ROLE_HIERARCHY[requiredRole] || 0;
  return userLevel >= requiredLevel;
}

/**
 * Get service line role hierarchy level
 * @param role - The role to check
 * @returns Numeric level (higher = more privileges)
 */
export function getServiceLineRoleLevel(role: string): number {
  return SERVICE_LINE_HIERARCHY[role] || 0;
}

/**
 * Get task role hierarchy level
 * @param role - The role to check
 * @returns Numeric level (higher = more privileges)
 */
export function getTaskRoleLevel(role: string): number {
  return TASK_ROLE_HIERARCHY[role] || 0;
}

/**
 * Check if role is a valid system role
 * @param role - The role to validate
 * @returns true if valid system role
 */
export function isValidSystemRole(role: string): boolean {
  return role === SystemRole.SYSTEM_ADMIN || role === SystemRole.USER;
}

/**
 * Check if role is a valid service line role
 * @param role - The role to validate
 * @returns true if valid service line role
 */
export function isValidServiceLineRole(role: string): boolean {
  return role in SERVICE_LINE_HIERARCHY;
}

/**
 * Check if role is a valid task role
 * @param role - The role to validate
 * @returns true if valid task role
 */
export function isValidTaskRole(role: string): boolean {
  return role in TASK_ROLE_HIERARCHY;
}

/**
 * Format service line role for display
 * @param role - The role to format
 * @returns Formatted role name
 */
export function formatServiceLineRole(role: string): string {
  switch (role) {
    case ServiceLineRole.ADMINISTRATOR:
      return 'Administrator';
    case ServiceLineRole.PARTNER:
      return 'Partner';
    case ServiceLineRole.MANAGER:
      return 'Manager';
    case ServiceLineRole.SUPERVISOR:
      return 'Supervisor';
    case ServiceLineRole.USER:
      return 'Staff';
    case ServiceLineRole.VIEWER:
      return 'Viewer';
    default:
      return role;
  }
}

/**
 * Format task role for display
 * @param role - The role to format
 * @returns Formatted role name
 */
export function formatTaskRole(role: string): string {
  switch (role) {
    case TaskRole.ADMIN:
      return 'Admin';
    case TaskRole.REVIEWER:
      return 'Reviewer';
    case TaskRole.EDITOR:
      return 'Editor';
    case TaskRole.VIEWER:
      return 'Viewer';
    default:
      return role;
  }
}

/**
 * Format system role for display
 * @param role - The role to format
 * @returns Formatted role name
 */
export function formatSystemRole(role: string): string {
  switch (role) {
    case SystemRole.SYSTEM_ADMIN:
      return 'System Administrator';
    case SystemRole.USER:
      return 'User';
    default:
      return role;
  }
}

/**
 * Get all service line roles in hierarchy order (lowest to highest)
 * @returns Array of service line roles
 */
export function getServiceLineRolesOrdered(): ServiceLineRole[] {
  return [
    ServiceLineRole.VIEWER,
    ServiceLineRole.USER,
    ServiceLineRole.SUPERVISOR,
    ServiceLineRole.MANAGER,
    ServiceLineRole.PARTNER,
    ServiceLineRole.ADMINISTRATOR,
  ];
}

/**
 * Get all task roles in hierarchy order (lowest to highest)
 * @returns Array of task roles
 */
export function getTaskRolesOrdered(): TaskRole[] {
  return [
    TaskRole.VIEWER,
    TaskRole.EDITOR,
    TaskRole.REVIEWER,
    TaskRole.ADMIN,
  ];
}

/**
 * Check if a service line role can approve acceptance/engagement letters
 * ADMINISTRATOR and PARTNER can approve
 * @param role - The role to check
 * @returns true if role can approve
 */
export function canApproveLetters(role: string): boolean {
  return role === ServiceLineRole.ADMINISTRATOR || role === ServiceLineRole.PARTNER;
}

/**
 * Check if a service line role is considered administrative
 * Administrator and Partner are administrative roles
 * @param role - The role to check
 * @returns true if administrative role
 */
export function isAdministrativeRole(role: string): boolean {
  return role === ServiceLineRole.ADMINISTRATOR || role === ServiceLineRole.PARTNER;
}

/**
 * Check if a service line role can manage tasks
 * Manager and above can manage tasks
 * @param role - The role to check
 * @returns true if can manage tasks
 */
export function canManageTasks(role: string): boolean {
  return hasServiceLineRole(role, ServiceLineRole.MANAGER);
}

/**
 * Check if a service line role can supervise
 * Supervisor and above can supervise
 * @param role - The role to check
 * @returns true if can supervise
 */
export function canSupervise(role: string): boolean {
  return hasServiceLineRole(role, ServiceLineRole.SUPERVISOR);
}

/**
 * Check if user is system administrator (simple role check)
 * 
 * Use this variant when you have a role string to check.
 * For other use cases:
 * - For user objects in memory: use `isSystemAdmin()` from `@/lib/utils/systemAdmin`
 * - For database lookups by user ID: use `isSystemAdmin()` from `@/lib/services/auth/authorization`
 * 
 * @param role - The user's system role
 * @returns true if system administrator
 * @see {@link systemAdmin.isSystemAdmin} for user object checks
 * @see {@link authorization.isSystemAdmin} for database lookups
 */
export function isSystemAdmin(role: string): boolean {
  return role === SystemRole.SYSTEM_ADMIN;
}

