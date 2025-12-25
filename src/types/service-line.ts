/**
 * Service Line specific types and utilities
 */

import React from 'react';
import { ServiceLine } from './index';
import {
  FileText,
  ClipboardCheck,
  Calculator,
  Lightbulb,
  ShieldCheck,
  Megaphone,
  Monitor,
  Banknote,
  Users,
  Presentation,
} from 'lucide-react';

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
}

/**
 * Service line configurations
 */
export const SERVICE_LINE_CONFIGS: Record<ServiceLine, ServiceLineConfig> = {
  [ServiceLine.TAX]: {
    id: ServiceLine.TAX,
    name: 'Tax',
    description: 'Tax compliance, calculations, opinions, and administration',
    icon: 'FileText',
    color: 'text-blue-600',
    borderColor: 'border-blue-200',
    bgColor: 'bg-blue-50',
  },
  [ServiceLine.AUDIT]: {
    id: ServiceLine.AUDIT,
    name: 'Audit',
    description: 'Audit engagements, reviews, and reporting',
    icon: 'ClipboardCheck',
    color: 'text-green-600',
    borderColor: 'border-green-200',
    bgColor: 'bg-green-50',
  },
  [ServiceLine.ACCOUNTING]: {
    id: ServiceLine.ACCOUNTING,
    name: 'Accounting',
    description: 'Financial statements, bookkeeping, and management accounts',
    icon: 'Calculator',
    color: 'text-slate-700',
    borderColor: 'border-slate-200',
    bgColor: 'bg-slate-50',
  },
  [ServiceLine.ADVISORY]: {
    id: ServiceLine.ADVISORY,
    name: 'Advisory',
    description: 'Consulting, strategy, and advisory services',
    icon: 'Lightbulb',
    color: 'text-orange-600',
    borderColor: 'border-orange-200',
    bgColor: 'bg-orange-50',
  },
  [ServiceLine.QRM]: {
    id: ServiceLine.QRM,
    name: 'Quality & Risk Management',
    description: 'Quality assurance, risk management, and compliance oversight',
    icon: 'ShieldCheck',
    color: 'text-red-600',
    borderColor: 'border-red-200',
    bgColor: 'bg-red-50',
  },
  [ServiceLine.BUSINESS_DEV]: {
    id: ServiceLine.BUSINESS_DEV,
    name: 'Business Development & Marketing',
    description: 'Marketing campaigns, proposals, and market research',
    icon: 'Megaphone',
    color: 'text-teal-600',
    borderColor: 'border-teal-200',
    bgColor: 'bg-teal-50',
  },
  [ServiceLine.IT]: {
    id: ServiceLine.IT,
    name: 'Information Technology',
    description: 'IT implementations, support, and infrastructure management',
    icon: 'Monitor',
    color: 'text-indigo-600',
    borderColor: 'border-indigo-200',
    bgColor: 'bg-indigo-50',
  },
  [ServiceLine.FINANCE]: {
    id: ServiceLine.FINANCE,
    name: 'Finance',
    description: 'Financial reporting, budgeting, and analysis',
    icon: 'Banknote',
    color: 'text-yellow-600',
    borderColor: 'border-yellow-200',
    bgColor: 'bg-yellow-50',
  },
  [ServiceLine.HR]: {
    id: ServiceLine.HR,
    name: 'Human Resources',
    description: 'Recruitment, training, and policy development',
    icon: 'Users',
    color: 'text-pink-600',
    borderColor: 'border-pink-200',
    bgColor: 'bg-pink-50',
  },
  [ServiceLine.COUNTRY_MANAGEMENT]: {
    id: ServiceLine.COUNTRY_MANAGEMENT,
    name: 'Country Management',
    description: 'Executive reporting and business analysis',
    icon: 'Presentation',
    color: 'text-purple-600',
    borderColor: 'border-purple-200',
    bgColor: 'bg-purple-50',
  },
};

/**
 * Get service line config
 */
export function getServiceLineConfig(serviceLine: ServiceLine): ServiceLineConfig | null {
  return SERVICE_LINE_CONFIGS[serviceLine] || null;
}

/**
 * Icon component mapping - maps icon names to React components
 * Single source of truth for service line icons
 */
const ICON_COMPONENTS: Record<string, React.ComponentType<React.SVGProps<SVGSVGElement>>> = {
  FileText,
  ClipboardCheck,
  Calculator,
  Lightbulb,
  ShieldCheck,
  Megaphone,
  Monitor,
  Banknote,
  Users,
  Presentation,
};

/**
 * Service line details with React components (for UI usage)
 */
export interface ServiceLineDetails {
  name: string;
  description: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  colorClass: string;
  bgColorClass: string;
  borderColorClass: string;
}

/**
 * Get service line details with React icon component
 * Derives from SERVICE_LINE_CONFIGS to maintain single source of truth
 * 
 * @param serviceLine - Service line to get details for
 * @returns Service line details with React component icon
 */
export function getServiceLineDetails(serviceLine: ServiceLine): ServiceLineDetails {
  const config = SERVICE_LINE_CONFIGS[serviceLine];
  const iconComponent = ICON_COMPONENTS[config.icon];
  
  if (!iconComponent) {
    throw new Error(`Icon component not found for ${config.icon}`);
  }
  
  return {
    name: config.name,
    description: config.description,
    icon: iconComponent,
    colorClass: config.color,
    bgColorClass: config.bgColor,
    borderColorClass: config.borderColor,
  };
}

/**
 * Service line details map (for direct UI usage with React components)
 * Derived from SERVICE_LINE_CONFIGS to ensure consistency
 * 
 * @deprecated Use getServiceLineDetails() instead for better type safety
 */
export const SERVICE_LINE_DETAILS: Record<ServiceLine, ServiceLineDetails> = {
  [ServiceLine.TAX]: getServiceLineDetails(ServiceLine.TAX),
  [ServiceLine.AUDIT]: getServiceLineDetails(ServiceLine.AUDIT),
  [ServiceLine.ACCOUNTING]: getServiceLineDetails(ServiceLine.ACCOUNTING),
  [ServiceLine.ADVISORY]: getServiceLineDetails(ServiceLine.ADVISORY),
  [ServiceLine.QRM]: getServiceLineDetails(ServiceLine.QRM),
  [ServiceLine.BUSINESS_DEV]: getServiceLineDetails(ServiceLine.BUSINESS_DEV),
  [ServiceLine.IT]: getServiceLineDetails(ServiceLine.IT),
  [ServiceLine.FINANCE]: getServiceLineDetails(ServiceLine.FINANCE),
  [ServiceLine.HR]: getServiceLineDetails(ServiceLine.HR),
  [ServiceLine.COUNTRY_MANAGEMENT]: getServiceLineDetails(ServiceLine.COUNTRY_MANAGEMENT),
};
