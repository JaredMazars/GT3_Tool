import { ProjectType, ProjectRole } from '@/types';

/**
 * Get color classes for project type badges
 */
export function getProjectTypeColor(type: string): string {
  switch (type) {
    case 'TAX_CALCULATION':
      return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'TAX_OPINION':
      return 'bg-purple-100 text-purple-800 border-purple-200';
    case 'TAX_ADMINISTRATION':
      return 'bg-green-100 text-green-800 border-green-200';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
}

/**
 * Get border color for project type
 */
export function getProjectTypeBorderColor(type: string): string {
  switch (type) {
    case 'TAX_CALCULATION':
      return 'border-blue-500';
    case 'TAX_OPINION':
      return 'border-purple-500';
    case 'TAX_ADMINISTRATION':
      return 'border-green-500';
    default:
      return 'border-gray-300';
  }
}

/**
 * Format project type for display
 */
export function formatProjectType(type: string): string {
  switch (type) {
    case 'TAX_CALCULATION':
      return 'Tax Calculation';
    case 'TAX_OPINION':
      return 'Tax Opinion';
    case 'TAX_ADMINISTRATION':
      return 'Tax Administration';
    default:
      return type;
  }
}

/**
 * Get color classes for role badges
 */
export function getRoleBadgeColor(role: string): string {
  switch (role) {
    case 'ADMIN':
      return 'bg-purple-100 text-purple-800';
    case 'REVIEWER':
      return 'bg-blue-100 text-blue-800';
    case 'EDITOR':
      return 'bg-green-100 text-green-800';
    case 'VIEWER':
      return 'bg-gray-100 text-gray-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}

/**
 * Format role for display
 */
export function formatRole(role: string): string {
  return role.charAt(0) + role.slice(1).toLowerCase();
}

/**
 * Get role description
 */
export function getRoleDescription(role: string): string {
  switch (role) {
    case 'ADMIN':
      return 'Full control, can manage team';
    case 'REVIEWER':
      return 'Can approve/reject adjustments';
    case 'EDITOR':
      return 'Can edit data';
    case 'VIEWER':
      return 'Read-only access';
    default:
      return '';
  }
}

/**
 * Format date for display
 */
export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return 'Not set';
  const d = new Date(date);
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Format date with time
 */
export function formatDateTime(date: Date | string | null | undefined): string {
  if (!date) return 'Not set';
  const d = new Date(date);
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Get project type options for select
 */
export function getProjectTypeOptions() {
  return [
    { value: 'TAX_CALCULATION', label: 'Tax Calculation' },
    { value: 'TAX_OPINION', label: 'Tax Opinion' },
    { value: 'TAX_ADMINISTRATION', label: 'Tax Administration' },
  ];
}

/**
 * Get role options for select
 */
export function getRoleOptions() {
  return [
    { value: 'VIEWER', label: 'Viewer', description: 'Read-only access' },
    { value: 'EDITOR', label: 'Editor', description: 'Can edit data' },
    { value: 'REVIEWER', label: 'Reviewer', description: 'Can approve/reject' },
    { value: 'ADMIN', label: 'Admin', description: 'Full control' },
  ];
}


