/**
 * Permission utility functions
 * Helper functions for working with roles and permissions
 */

/**
 * Format service line role for display
 * Maps technical role names to business titles
 */
export function formatServiceLineRole(role: string): string {
  const roleMap: Record<string, string> = {
    ADMIN: 'Partner',
    MANAGER: 'Manager',
    USER: 'Staff',
    VIEWER: 'Viewer',
  };

  return roleMap[role] || role;
}

/**
 * Format system role for display
 */
export function formatSystemRole(role: string): string {
  const roleMap: Record<string, string> = {
    SUPERUSER: 'System Administrator',
    USER: 'User',
  };

  return roleMap[role] || role;
}

/**
 * Get service line role description
 */
export function getServiceLineRoleDescription(role: string): string {
  const descriptionMap: Record<string, string> = {
    ADMIN: 'Partner - Can approve acceptance and engagement letters',
    MANAGER: 'Manager - Can manage projects',
    USER: 'Staff - Can complete work',
    VIEWER: 'Viewer - Read-only access',
  };

  return descriptionMap[role] || 'No description available';
}

/**
 * Get system role description
 */
export function getSystemRoleDescription(role: string): string {
  const descriptionMap: Record<string, string> = {
    SUPERUSER: 'System-wide access to all features and service lines',
    USER: 'Regular user - requires service line access',
  };

  return descriptionMap[role] || 'No description available';
}

/**
 * Get role badge color
 */
export function getRoleBadgeColor(role: string): string {
  const colorMap: Record<string, string> = {
    // System roles
    SUPERUSER: 'bg-purple-100 text-purple-800 border-purple-200',
    // Service line roles
    ADMIN: 'bg-blue-100 text-blue-800 border-blue-200',
    MANAGER: 'bg-green-100 text-green-800 border-green-200',
    USER: 'bg-gray-100 text-gray-800 border-gray-200',
    VIEWER: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    // Project roles
    EDITOR: 'bg-indigo-100 text-indigo-800 border-indigo-200',
    REVIEWER: 'bg-teal-100 text-teal-800 border-teal-200',
  };

  return colorMap[role] || 'bg-gray-100 text-gray-800 border-gray-200';
}

/**
 * Get available system roles
 */
export function getSystemRoleOptions() {
  return [
    { value: 'USER', label: 'User', description: 'Regular user - requires service line access' },
    { value: 'SUPERUSER', label: 'System Administrator', description: 'System-wide access to all features' },
  ];
}

/**
 * Get available service line roles
 */
export function getServiceLineRoleOptions() {
  return [
    { value: 'VIEWER', label: 'Viewer (View-only)', description: 'Read-only access' },
    { value: 'USER', label: 'Staff', description: 'Can complete work' },
    { value: 'MANAGER', label: 'Manager', description: 'Can manage projects' },
    { value: 'ADMIN', label: 'Partner', description: 'Can approve acceptance and engagement letters' },
  ];
}

