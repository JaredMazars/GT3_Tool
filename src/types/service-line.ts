/**
 * Service Line specific types and utilities
 */

import React from 'react';
import { ServiceLine, ProjectType } from './index';
import {
  DocumentTextIcon,
  ClipboardDocumentCheckIcon,
  CalculatorIcon,
  LightBulbIcon,
  ShieldCheckIcon,
  MegaphoneIcon,
  ComputerDesktopIcon,
  BanknotesIcon,
  UserGroupIcon,
} from '@heroicons/react/24/outline';

/**
 * Service line configuration
 */
export interface ServiceLineConfig {
  id: ServiceLine;
  name: string;
  description: string;
  icon: string;
  color: string;
  borderColor: string;
  bgColor: string;
  projectTypes: ProjectType[];
}

/**
 * Service line configurations
 */
export const SERVICE_LINE_CONFIGS: Record<ServiceLine, ServiceLineConfig> = {
  [ServiceLine.TAX]: {
    id: ServiceLine.TAX,
    name: 'Tax',
    description: 'Tax compliance, calculations, opinions, and administration',
    icon: 'DocumentTextIcon',
    color: 'text-blue-600',
    borderColor: 'border-blue-200',
    bgColor: 'bg-blue-50',
    projectTypes: [
      ProjectType.TAX_CALCULATION,
      ProjectType.TAX_OPINION,
      ProjectType.TAX_ADMINISTRATION,
    ],
  },
  [ServiceLine.AUDIT]: {
    id: ServiceLine.AUDIT,
    name: 'Audit',
    description: 'Audit engagements, reviews, and reporting',
    icon: 'ClipboardDocumentCheckIcon',
    color: 'text-green-600',
    borderColor: 'border-green-200',
    bgColor: 'bg-green-50',
    projectTypes: [
      ProjectType.AUDIT_ENGAGEMENT,
      ProjectType.AUDIT_REVIEW,
      ProjectType.AUDIT_REPORT,
    ],
  },
  [ServiceLine.ACCOUNTING]: {
    id: ServiceLine.ACCOUNTING,
    name: 'Accounting',
    description: 'Financial statements, bookkeeping, and management accounts',
    icon: 'CalculatorIcon',
    color: 'text-purple-600',
    borderColor: 'border-purple-200',
    bgColor: 'bg-purple-50',
    projectTypes: [
      ProjectType.FINANCIAL_STATEMENTS,
      ProjectType.BOOKKEEPING,
      ProjectType.MANAGEMENT_ACCOUNTS,
    ],
  },
  [ServiceLine.ADVISORY]: {
    id: ServiceLine.ADVISORY,
    name: 'Advisory',
    description: 'Consulting, strategy, and advisory services',
    icon: 'LightBulbIcon',
    color: 'text-orange-600',
    borderColor: 'border-orange-200',
    bgColor: 'bg-orange-50',
    projectTypes: [
      ProjectType.ADVISORY_PROJECT,
      ProjectType.CONSULTING_ENGAGEMENT,
      ProjectType.STRATEGY_REVIEW,
    ],
  },
  [ServiceLine.QRM]: {
    id: ServiceLine.QRM,
    name: 'Quality & Risk Management',
    description: 'Quality assurance, risk management, and compliance oversight',
    icon: 'ShieldCheckIcon',
    color: 'text-red-600',
    borderColor: 'border-red-200',
    bgColor: 'bg-red-50',
    projectTypes: [
      ProjectType.QRM_AUDIT,
      ProjectType.QRM_COMPLIANCE,
      ProjectType.QRM_RISK_ASSESSMENT,
    ],
  },
  [ServiceLine.BUSINESS_DEV]: {
    id: ServiceLine.BUSINESS_DEV,
    name: 'Business Development & Marketing',
    description: 'Marketing campaigns, proposals, and market research',
    icon: 'MegaphoneIcon',
    color: 'text-teal-600',
    borderColor: 'border-teal-200',
    bgColor: 'bg-teal-50',
    projectTypes: [
      ProjectType.BD_CAMPAIGN,
      ProjectType.BD_PROPOSAL,
      ProjectType.BD_MARKET_RESEARCH,
    ],
  },
  [ServiceLine.IT]: {
    id: ServiceLine.IT,
    name: 'Information Technology',
    description: 'IT implementations, support, and infrastructure management',
    icon: 'ComputerDesktopIcon',
    color: 'text-indigo-600',
    borderColor: 'border-indigo-200',
    bgColor: 'bg-indigo-50',
    projectTypes: [
      ProjectType.IT_IMPLEMENTATION,
      ProjectType.IT_SUPPORT,
      ProjectType.IT_INFRASTRUCTURE,
    ],
  },
  [ServiceLine.FINANCE]: {
    id: ServiceLine.FINANCE,
    name: 'Finance',
    description: 'Financial reporting, budgeting, and analysis',
    icon: 'BanknotesIcon',
    color: 'text-yellow-600',
    borderColor: 'border-yellow-200',
    bgColor: 'bg-yellow-50',
    projectTypes: [
      ProjectType.FINANCE_REPORTING,
      ProjectType.FINANCE_BUDGETING,
      ProjectType.FINANCE_ANALYSIS,
    ],
  },
  [ServiceLine.HR]: {
    id: ServiceLine.HR,
    name: 'Human Resources',
    description: 'Recruitment, training, and policy development',
    icon: 'UserGroupIcon',
    color: 'text-pink-600',
    borderColor: 'border-pink-200',
    bgColor: 'bg-pink-50',
    projectTypes: [
      ProjectType.HR_RECRUITMENT,
      ProjectType.HR_TRAINING,
      ProjectType.HR_POLICY,
    ],
  },
};

/**
 * Get service line for a project type
 */
export function getServiceLineForProjectType(projectType: ProjectType): ServiceLine | null {
  for (const [line, config] of Object.entries(SERVICE_LINE_CONFIGS)) {
    if (config.projectTypes.includes(projectType)) {
      return line as ServiceLine;
    }
  }
  return null;
}

/**
 * Get service line config
 */
export function getServiceLineConfig(serviceLine: ServiceLine): ServiceLineConfig | null {
  return SERVICE_LINE_CONFIGS[serviceLine] || null;
}

/**
 * Service line details with React components (for UI usage)
 */
export interface ServiceLineDetails {
  name: string;
  description: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  projectTypes: ProjectType[];
  colorClass: string;
  bgColorClass: string;
  borderColorClass: string;
}

/**
 * Service line details map (for direct UI usage with React components)
 */
export const SERVICE_LINE_DETAILS: Record<ServiceLine, ServiceLineDetails> = {
  [ServiceLine.TAX]: {
    name: 'Tax',
    description: 'Tax compliance, calculations, opinions, and administration',
    icon: DocumentTextIcon,
    projectTypes: [
      ProjectType.TAX_CALCULATION,
      ProjectType.TAX_OPINION,
      ProjectType.TAX_ADMINISTRATION,
    ],
    colorClass: 'text-blue-600',
    bgColorClass: 'bg-blue-50',
    borderColorClass: 'border-blue-200',
  },
  [ServiceLine.AUDIT]: {
    name: 'Audit',
    description: 'Audit engagements, reviews, and reporting',
    icon: ClipboardDocumentCheckIcon,
    projectTypes: [
      ProjectType.AUDIT_ENGAGEMENT,
      ProjectType.AUDIT_REVIEW,
      ProjectType.AUDIT_REPORT,
    ],
    colorClass: 'text-green-600',
    bgColorClass: 'bg-green-50',
    borderColorClass: 'border-green-200',
  },
  [ServiceLine.ACCOUNTING]: {
    name: 'Accounting',
    description: 'Financial statements, bookkeeping, and management accounts',
    icon: CalculatorIcon,
    projectTypes: [
      ProjectType.FINANCIAL_STATEMENTS,
      ProjectType.BOOKKEEPING,
      ProjectType.MANAGEMENT_ACCOUNTS,
    ],
    colorClass: 'text-purple-600',
    bgColorClass: 'bg-purple-50',
    borderColorClass: 'border-purple-200',
  },
  [ServiceLine.ADVISORY]: {
    name: 'Advisory',
    description: 'Consulting, strategy, and advisory services',
    icon: LightBulbIcon,
    projectTypes: [
      ProjectType.ADVISORY_PROJECT,
      ProjectType.CONSULTING_ENGAGEMENT,
      ProjectType.STRATEGY_REVIEW,
    ],
    colorClass: 'text-orange-600',
    bgColorClass: 'bg-orange-50',
    borderColorClass: 'border-orange-200',
  },
  [ServiceLine.QRM]: {
    name: 'Quality & Risk Management',
    description: 'Quality assurance, risk management, and compliance oversight',
    icon: ShieldCheckIcon,
    projectTypes: [
      ProjectType.QRM_AUDIT,
      ProjectType.QRM_COMPLIANCE,
      ProjectType.QRM_RISK_ASSESSMENT,
    ],
    colorClass: 'text-red-600',
    bgColorClass: 'bg-red-50',
    borderColorClass: 'border-red-200',
  },
  [ServiceLine.BUSINESS_DEV]: {
    name: 'Business Development & Marketing',
    description: 'Marketing campaigns, proposals, and market research',
    icon: MegaphoneIcon,
    projectTypes: [
      ProjectType.BD_CAMPAIGN,
      ProjectType.BD_PROPOSAL,
      ProjectType.BD_MARKET_RESEARCH,
    ],
    colorClass: 'text-teal-600',
    bgColorClass: 'bg-teal-50',
    borderColorClass: 'border-teal-200',
  },
  [ServiceLine.IT]: {
    name: 'Information Technology',
    description: 'IT implementations, support, and infrastructure management',
    icon: ComputerDesktopIcon,
    projectTypes: [
      ProjectType.IT_IMPLEMENTATION,
      ProjectType.IT_SUPPORT,
      ProjectType.IT_INFRASTRUCTURE,
    ],
    colorClass: 'text-indigo-600',
    bgColorClass: 'bg-indigo-50',
    borderColorClass: 'border-indigo-200',
  },
  [ServiceLine.FINANCE]: {
    name: 'Finance',
    description: 'Financial reporting, budgeting, and analysis',
    icon: BanknotesIcon,
    projectTypes: [
      ProjectType.FINANCE_REPORTING,
      ProjectType.FINANCE_BUDGETING,
      ProjectType.FINANCE_ANALYSIS,
    ],
    colorClass: 'text-yellow-600',
    bgColorClass: 'bg-yellow-50',
    borderColorClass: 'border-yellow-200',
  },
  [ServiceLine.HR]: {
    name: 'Human Resources',
    description: 'Recruitment, training, and policy development',
    icon: UserGroupIcon,
    projectTypes: [
      ProjectType.HR_RECRUITMENT,
      ProjectType.HR_TRAINING,
      ProjectType.HR_POLICY,
    ],
    colorClass: 'text-pink-600',
    bgColorClass: 'bg-pink-50',
    borderColorClass: 'border-pink-200',
  },
};
