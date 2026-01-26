/**
 * Service Line Utility Functions
 */

import { ServiceLine } from '@/types';
import { SERVICE_LINE_CONFIGS } from '@/types/service-line';

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
