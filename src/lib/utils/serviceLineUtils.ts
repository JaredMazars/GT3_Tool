/**
 * Service Line Utility Functions
 */

import { ServiceLine, TaskType } from '@/types';
import { SERVICE_LINE_CONFIGS, getServiceLineForTaskType } from '@/types/service-line';

/**
 * Format task type name for display
 */
export function formatTaskType(taskType: TaskType | string): string {
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
    // QRM
    QRM_AUDIT: 'QRM Audit',
    QRM_COMPLIANCE: 'QRM Compliance',
    QRM_RISK_ASSESSMENT: 'Risk Assessment',
    // Business Development
    BD_CAMPAIGN: 'Marketing Campaign',
    BD_PROPOSAL: 'Proposal',
    BD_MARKET_RESEARCH: 'Market Research',
    // IT
    IT_IMPLEMENTATION: 'IT Implementation',
    IT_SUPPORT: 'IT Support',
    IT_INFRASTRUCTURE: 'IT Infrastructure',
    // Finance
    FINANCE_REPORTING: 'Financial Reporting',
    FINANCE_BUDGETING: 'Budgeting',
    FINANCE_ANALYSIS: 'Financial Analysis',
    // HR
    HR_RECRUITMENT: 'Recruitment',
    HR_TRAINING: 'Training',
    HR_POLICY: 'Policy Development',
    // Country Management
    COUNTRY_REPORT: 'Country Reporting',
    COUNTRY_ANALYSIS: 'Business Analysis',
    COUNTRY_DASHBOARD: 'Dashboard Development',
    COUNTRY_METRICS: 'Metrics & KPIs',
  };

  return typeMap[taskType] || taskType;
}

/**
 * Get color classes for task type badge
 */
export function getTaskTypeColor(taskType: TaskType | string): string {
  // Determine service line from task type
  const serviceLine = getServiceLineForTaskType(taskType as TaskType);
  
  if (!serviceLine) {
    return 'bg-gray-100 text-gray-700 border-gray-200';
  }

  const colorMap: Record<ServiceLine, string> = {
    [ServiceLine.TAX]: 'bg-blue-100 text-blue-700 border-blue-200',
    [ServiceLine.AUDIT]: 'bg-green-100 text-green-700 border-green-200',
    [ServiceLine.ACCOUNTING]: 'bg-slate-100 text-slate-700 border-slate-200',
    [ServiceLine.ADVISORY]: 'bg-orange-100 text-orange-700 border-orange-200',
    [ServiceLine.QRM]: 'bg-red-100 text-red-700 border-red-200',
    [ServiceLine.BUSINESS_DEV]: 'bg-teal-100 text-teal-700 border-teal-200',
    [ServiceLine.IT]: 'bg-indigo-100 text-indigo-700 border-indigo-200',
    [ServiceLine.FINANCE]: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    [ServiceLine.HR]: 'bg-pink-100 text-pink-700 border-pink-200',
    [ServiceLine.COUNTRY_MANAGEMENT]: 'bg-purple-100 text-purple-700 border-purple-200',
  };

  return colorMap[serviceLine] || 'bg-gray-100 text-gray-700 border-gray-200';
}

/**
 * Get border color classes for task type
 */
export function getTaskTypeBorderColor(taskType: TaskType | string): string {
  const serviceLine = getServiceLineForTaskType(taskType as TaskType);
  
  if (!serviceLine) {
    return 'border-gray-200';
  }

  const colorMap: Record<ServiceLine, string> = {
    [ServiceLine.TAX]: 'border-blue-200',
    [ServiceLine.AUDIT]: 'border-green-200',
    [ServiceLine.ACCOUNTING]: 'border-slate-200',
    [ServiceLine.ADVISORY]: 'border-orange-200',
    [ServiceLine.QRM]: 'border-red-200',
    [ServiceLine.BUSINESS_DEV]: 'border-teal-200',
    [ServiceLine.IT]: 'border-indigo-200',
    [ServiceLine.FINANCE]: 'border-yellow-200',
    [ServiceLine.HR]: 'border-pink-200',
    [ServiceLine.COUNTRY_MANAGEMENT]: 'border-purple-200',
  };

  return colorMap[serviceLine] || 'border-gray-200';
}


/**
 * Get color classes for service line
 */
export function getServiceLineColor(serviceLine: ServiceLine | string): string {
  const colorMap: Record<string, string> = {
    TAX: 'text-blue-600',
    AUDIT: 'text-green-600',
    ACCOUNTING: 'text-slate-700',
    ADVISORY: 'text-orange-600',
    QRM: 'text-red-600',
    BUSINESS_DEV: 'text-teal-600',
    IT: 'text-indigo-600',
    FINANCE: 'text-yellow-600',
    HR: 'text-pink-600',
    COUNTRY_MANAGEMENT: 'text-purple-600',
  };

  return colorMap[serviceLine] || 'text-gray-600';
}

/**
 * Get background color classes for service line
 */
export function getServiceLineBgColor(serviceLine: ServiceLine | string): string {
  const colorMap: Record<string, string> = {
    TAX: 'bg-blue-50',
    AUDIT: 'bg-green-50',
    ACCOUNTING: 'bg-slate-50',
    ADVISORY: 'bg-orange-50',
    QRM: 'bg-red-50',
    BUSINESS_DEV: 'bg-teal-50',
    IT: 'bg-indigo-50',
    FINANCE: 'bg-yellow-50',
    HR: 'bg-pink-50',
    COUNTRY_MANAGEMENT: 'bg-purple-50',
  };

  return colorMap[serviceLine] || 'bg-gray-50';
}

/**
 * Get border color classes for service line
 */
export function getServiceLineBorderColor(serviceLine: ServiceLine | string): string {
  const colorMap: Record<string, string> = {
    TAX: 'border-blue-200',
    AUDIT: 'border-green-200',
    ACCOUNTING: 'border-slate-200',
    ADVISORY: 'border-orange-200',
    QRM: 'border-red-200',
    BUSINESS_DEV: 'border-teal-200',
    IT: 'border-indigo-200',
    FINANCE: 'border-yellow-200',
    HR: 'border-pink-200',
    COUNTRY_MANAGEMENT: 'border-purple-200',
  };

  return colorMap[serviceLine] || 'border-gray-200';
}

/**
 * Format service line name for display
 */
export function formatServiceLineName(serviceLine: ServiceLine | string): string {
  const config = SERVICE_LINE_CONFIGS[serviceLine as ServiceLine];
  return config?.name || serviceLine;
}

/**
 * Validate service line
 */
export function isValidServiceLine(serviceLine: string): serviceLine is ServiceLine {
  return Object.values(ServiceLine).includes(serviceLine as ServiceLine);
}

/**
 * Validate task type for service line
 */
export function isValidTaskTypeForServiceLine(
  taskType: TaskType | string,
  serviceLine: ServiceLine | string
): boolean {
  const config = SERVICE_LINE_CONFIGS[serviceLine as ServiceLine];
  if (!config) return false;
  
  return config.taskTypes.includes(taskType as TaskType);
}

/**
 * Get all task types for a service line
 */
export function getTaskTypesForServiceLine(serviceLine: ServiceLine | string): TaskType[] {
  const config = SERVICE_LINE_CONFIGS[serviceLine as ServiceLine];
  return config?.taskTypes || [];
}

/**
 * Check if a service line is a shared service
 */
export function isSharedService(serviceLine: ServiceLine | string): boolean {
  const sharedServices = [
    ServiceLine.QRM,
    ServiceLine.BUSINESS_DEV,
    ServiceLine.IT,
    ServiceLine.FINANCE,
    ServiceLine.HR,
    ServiceLine.COUNTRY_MANAGEMENT,
  ];
  return sharedServices.includes(serviceLine as ServiceLine);
}

/**
 * Map Employee category description to ServiceLineRole
 * Maps employee job titles/categories to appropriate service line roles
 */
export function mapEmployeeCategoryToRole(empCatDesc: string | null): string {
  if (!empCatDesc) {
    return 'VIEWER';
  }

  const categoryLower = empCatDesc.toLowerCase().trim();

  // Partner level
  if (categoryLower.includes('partner')) {
    return 'PARTNER';
  }

  // Manager level (includes directors)
  if (categoryLower.includes('director') || categoryLower.includes('manager')) {
    return 'MANAGER';
  }

  // Supervisor level (seniors)
  if (categoryLower.includes('senior') || categoryLower.includes('supervisor')) {
    return 'SUPERVISOR';
  }

  // User level (staff, graduates, etc.)
  if (categoryLower.includes('staff') || 
      categoryLower.includes('graduate') || 
      categoryLower.includes('assistant') ||
      categoryLower.includes('junior')) {
    return 'USER';
  }

  // Default to viewer for unknown categories
  return 'VIEWER';
}


