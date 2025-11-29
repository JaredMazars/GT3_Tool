import { ProjectType, ProjectRole } from '@/types';

/**
 * Get color classes for project type badges
 * @deprecated Use getProjectTypeColor from serviceLineUtils instead
 */
export function getProjectTypeColor(type: string): string {
  // Tax types
  if (type.startsWith('TAX_')) {
    return 'bg-blue-100 text-blue-800 border-blue-200';
  }
  // Audit types
  if (type.startsWith('AUDIT_')) {
    return 'bg-green-100 text-green-800 border-green-200';
  }
  // Accounting types
  if (type === 'FINANCIAL_STATEMENTS' || type === 'BOOKKEEPING' || type === 'MANAGEMENT_ACCOUNTS') {
    return 'bg-purple-100 text-purple-800 border-purple-200';
  }
  // Advisory types
  if (type.startsWith('ADVISORY_') || type === 'CONSULTING_ENGAGEMENT' || type === 'STRATEGY_REVIEW') {
    return 'bg-orange-100 text-orange-800 border-orange-200';
  }
  
  return 'bg-gray-100 text-gray-800 border-gray-200';
}

/**
 * Get border color for project type
 */
export function getProjectTypeBorderColor(type: string): string {
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
 * Format project type for display
 * @deprecated Use formatProjectType from serviceLineUtils instead
 */
export function formatProjectType(type: string): string {
  const typeMap: Record<string, string> = {
    // Tax
    TAX_CALCULATION: 'Tax Calculation',
    TAX_OPINION: 'Tax Opinion',
    TAX_ADMINISTRATION: 'Tax Administration',
    // Audit
    AUDIT_ENGAGEMENT: 'Audit Engagement',
    AUDIT_REVIEW: 'Audit Review',
    AUDIT_REPORT: 'Audit Report',
    // Accounting
    FINANCIAL_STATEMENTS: 'Financial Statements',
    BOOKKEEPING: 'Bookkeeping',
    MANAGEMENT_ACCOUNTS: 'Management Accounts',
    // Advisory
    ADVISORY_PROJECT: 'Advisory Project',
    CONSULTING_ENGAGEMENT: 'Consulting Engagement',
    STRATEGY_REVIEW: 'Strategy Review',
  };

  return typeMap[type] || type.split('_').map(word => 
    word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
  ).join(' ');
}

/**
 * Get color classes for role badges
 * @deprecated Use getRoleBadgeColor from permissionUtils instead
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
 * Format system role for display
 * @deprecated Use formatSystemRole from permissionUtils instead
 */
export function formatSystemRole(role: string): string {
  const roleMap: Record<string, string> = {
    SYSTEM_ADMIN: 'System Administrator',
    USER: 'User',
  };

  return roleMap[role] || role;
}

/**
 * Get system role description
 * @deprecated Use getSystemRoleDescription from permissionUtils instead
 */
export function getSystemRoleDescription(role: string): string {
  const descriptionMap: Record<string, string> = {
    SYSTEM_ADMIN: 'System-wide access to all features and service lines',
    USER: 'Regular user - requires service line access',
  };

  return descriptionMap[role] || 'No description available';
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
 * @deprecated Use getProjectTypesForServiceLine from serviceLineUtils instead
 */
export function getProjectTypeOptions() {
  return [
    { value: 'TAX_CALCULATION', label: 'Tax Calculation' },
    { value: 'TAX_OPINION', label: 'Tax Opinion' },
    { value: 'TAX_ADMINISTRATION', label: 'Tax Administration' },
    { value: 'AUDIT_ENGAGEMENT', label: 'Audit Engagement' },
    { value: 'AUDIT_REVIEW', label: 'Audit Review' },
    { value: 'AUDIT_REPORT', label: 'Audit Report' },
    { value: 'FINANCIAL_STATEMENTS', label: 'Financial Statements' },
    { value: 'BOOKKEEPING', label: 'Bookkeeping' },
    { value: 'MANAGEMENT_ACCOUNTS', label: 'Management Accounts' },
    { value: 'ADVISORY_PROJECT', label: 'Advisory Project' },
    { value: 'CONSULTING_ENGAGEMENT', label: 'Consulting Engagement' },
    { value: 'STRATEGY_REVIEW', label: 'Strategy Review' },
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





