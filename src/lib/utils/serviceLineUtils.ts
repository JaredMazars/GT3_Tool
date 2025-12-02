/**
 * Service Line Utility Functions
 */

import { ServiceLine, ProjectType } from '@/types';
import { SERVICE_LINE_CONFIGS, getServiceLineForProjectType } from '@/types/service-line';

/**
 * Format project type name for display
 */
export function formatProjectType(projectType: ProjectType | string): string {
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
  };

  return typeMap[projectType] || projectType;
}

/**
 * Get color classes for project type badge
 */
export function getProjectTypeColor(projectType: ProjectType | string): string {
  // Determine service line from project type
  const serviceLine = getServiceLineForProjectType(projectType as ProjectType);
  
  if (!serviceLine) {
    return 'bg-gray-100 text-gray-700 border-gray-200';
  }

  const colorMap: Record<ServiceLine, string> = {
    [ServiceLine.TAX]: 'bg-blue-100 text-blue-700 border-blue-200',
    [ServiceLine.AUDIT]: 'bg-green-100 text-green-700 border-green-200',
    [ServiceLine.ACCOUNTING]: 'bg-purple-100 text-purple-700 border-purple-200',
    [ServiceLine.ADVISORY]: 'bg-orange-100 text-orange-700 border-orange-200',
    [ServiceLine.QRM]: 'bg-red-100 text-red-700 border-red-200',
    [ServiceLine.BUSINESS_DEV]: 'bg-teal-100 text-teal-700 border-teal-200',
    [ServiceLine.IT]: 'bg-indigo-100 text-indigo-700 border-indigo-200',
    [ServiceLine.FINANCE]: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    [ServiceLine.HR]: 'bg-pink-100 text-pink-700 border-pink-200',
  };

  return colorMap[serviceLine] || 'bg-gray-100 text-gray-700 border-gray-200';
}

/**
 * Get border color classes for project type
 */
export function getProjectTypeBorderColor(projectType: ProjectType | string): string {
  const serviceLine = getServiceLineForProjectType(projectType as ProjectType);
  
  if (!serviceLine) {
    return 'border-gray-200';
  }

  const colorMap: Record<ServiceLine, string> = {
    [ServiceLine.TAX]: 'border-blue-200',
    [ServiceLine.AUDIT]: 'border-green-200',
    [ServiceLine.ACCOUNTING]: 'border-purple-200',
    [ServiceLine.ADVISORY]: 'border-orange-200',
    [ServiceLine.QRM]: 'border-red-200',
    [ServiceLine.BUSINESS_DEV]: 'border-teal-200',
    [ServiceLine.IT]: 'border-indigo-200',
    [ServiceLine.FINANCE]: 'border-yellow-200',
    [ServiceLine.HR]: 'border-pink-200',
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
    ACCOUNTING: 'text-purple-600',
    ADVISORY: 'text-orange-600',
    QRM: 'text-red-600',
    BUSINESS_DEV: 'text-teal-600',
    IT: 'text-indigo-600',
    FINANCE: 'text-yellow-600',
    HR: 'text-pink-600',
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
    ACCOUNTING: 'bg-purple-50',
    ADVISORY: 'bg-orange-50',
    QRM: 'bg-red-50',
    BUSINESS_DEV: 'bg-teal-50',
    IT: 'bg-indigo-50',
    FINANCE: 'bg-yellow-50',
    HR: 'bg-pink-50',
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
    ACCOUNTING: 'border-purple-200',
    ADVISORY: 'border-orange-200',
    QRM: 'border-red-200',
    BUSINESS_DEV: 'border-teal-200',
    IT: 'border-indigo-200',
    FINANCE: 'border-yellow-200',
    HR: 'border-pink-200',
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
 * Validate project type for service line
 */
export function isValidProjectTypeForServiceLine(
  projectType: ProjectType | string,
  serviceLine: ServiceLine | string
): boolean {
  const config = SERVICE_LINE_CONFIGS[serviceLine as ServiceLine];
  if (!config) return false;
  
  return config.projectTypes.includes(projectType as ProjectType);
}

/**
 * Get all project types for a service line
 */
export function getProjectTypesForServiceLine(serviceLine: ServiceLine | string): ProjectType[] {
  const config = SERVICE_LINE_CONFIGS[serviceLine as ServiceLine];
  return config?.projectTypes || [];
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
  ];
  return sharedServices.includes(serviceLine as ServiceLine);
}

