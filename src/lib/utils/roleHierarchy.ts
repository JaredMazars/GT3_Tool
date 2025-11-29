/**
 * Role Hierarchy Utility
 * 
 * Centralized role hierarchy logic for the three-tier security model:
 * 1. System Level (User.role) - SYSTEM_ADMIN, USER
 * 2. Service Line Level (ServiceLineUser.role) - ADMINISTRATOR, PARTNER, MANAGER, SUPERVISOR, USER, VIEWER
 * 3. Project Level (ProjectUser.role) - ADMIN, REVIEWER, EDITOR, VIEWER
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
 * Project Roles - ProjectUser.role
 * Used to control access within a specific project
 */
export enum ProjectRole {
  ADMIN = 'ADMIN',       // Full project control
  REVIEWER = 'REVIEWER', // Can review and approve work
  EDITOR = 'EDITOR',     // Can edit project data
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
 * Project Role Hierarchy
 * Higher numbers = more privileges
 */
const PROJECT_ROLE_HIERARCHY: Record<string, number> = {
  [ProjectRole.VIEWER]: 1,
  [ProjectRole.EDITOR]: 2,
  [ProjectRole.REVIEWER]: 3,
  [ProjectRole.ADMIN]: 4,
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
 * Check if a project role meets or exceeds the required role
 * @param userRole - The user's current role
 * @param requiredRole - The minimum required role
 * @returns true if user role is sufficient
 */
export function hasProjectRole(
  userRole: string,
  requiredRole: string
): boolean {
  const userLevel = PROJECT_ROLE_HIERARCHY[userRole] || 0;
  const requiredLevel = PROJECT_ROLE_HIERARCHY[requiredRole] || 0;
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
 * Get project role hierarchy level
 * @param role - The role to check
 * @returns Numeric level (higher = more privileges)
 */
export function getProjectRoleLevel(role: string): number {
  return PROJECT_ROLE_HIERARCHY[role] || 0;
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
 * Check if role is a valid project role
 * @param role - The role to validate
 * @returns true if valid project role
 */
export function isValidProjectRole(role: string): boolean {
  return role in PROJECT_ROLE_HIERARCHY;
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
 * Format project role for display
 * @param role - The role to format
 * @returns Formatted role name
 */
export function formatProjectRole(role: string): string {
  switch (role) {
    case ProjectRole.ADMIN:
      return 'Admin';
    case ProjectRole.REVIEWER:
      return 'Reviewer';
    case ProjectRole.EDITOR:
      return 'Editor';
    case ProjectRole.VIEWER:
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
 * Get all project roles in hierarchy order (lowest to highest)
 * @returns Array of project roles
 */
export function getProjectRolesOrdered(): ProjectRole[] {
  return [
    ProjectRole.VIEWER,
    ProjectRole.EDITOR,
    ProjectRole.REVIEWER,
    ProjectRole.ADMIN,
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
 * Check if a service line role can manage projects
 * Manager and above can manage projects
 * @param role - The role to check
 * @returns true if can manage projects
 */
export function canManageProjects(role: string): boolean {
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
 * Check if user is system administrator
 * @param role - The user's system role
 * @returns true if system administrator
 */
export function isSystemAdmin(role: string): boolean {
  return role === SystemRole.SYSTEM_ADMIN;
}
