import { TaskType, TaskRole } from '@/types';

/**
 * Get border color for task type
 */
export function getTaskTypeBorderColor(type: string): string {
  // Tax types
  if (type.startsWith('TAX_')) {
    return 'border-blue-500';
  }
  // Audit types
  if (type.startsWith('AUDIT_')) {
    return 'border-green-500';
  }
  // Accounting types
  if (type === 'FINANCIAL_STATEMENTS' || type === 'BOOKKEEPING' || type === 'MANAGEMENT_ACCOUNTS') {
    return 'border-purple-500';
  }
  // Advisory types
  if (type.startsWith('ADVISORY_') || type === 'CONSULTING_ENGAGEMENT' || type === 'STRATEGY_REVIEW') {
    return 'border-orange-500';
  }
  
  return 'border-gray-300';
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



