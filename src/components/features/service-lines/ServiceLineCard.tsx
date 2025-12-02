'use client';

import Link from 'next/link';
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
  ArrowRightIcon,
} from '@heroicons/react/24/outline';
import { ServiceLine } from '@/types';
import { ServiceLineWithStats } from '@/types/dto';
import { 
  getServiceLineColor, 
  getServiceLineBgColor,
  getServiceLineBorderColor,
  formatServiceLineName 
} from '@/lib/utils/serviceLineUtils';

const iconMap = {
  [ServiceLine.TAX]: DocumentTextIcon,
  [ServiceLine.AUDIT]: ClipboardDocumentCheckIcon,
  [ServiceLine.ACCOUNTING]: CalculatorIcon,
  [ServiceLine.ADVISORY]: LightBulbIcon,
  [ServiceLine.QRM]: ShieldCheckIcon,
  [ServiceLine.BUSINESS_DEV]: MegaphoneIcon,
  [ServiceLine.IT]: ComputerDesktopIcon,
  [ServiceLine.FINANCE]: BanknotesIcon,
  [ServiceLine.HR]: UserGroupIcon,
};

interface ServiceLineCardProps {
  serviceLineData: ServiceLineWithStats;
}

export function ServiceLineCard({ serviceLineData }: ServiceLineCardProps) {
  const { serviceLine, activeProjectCount, projectCount } = serviceLineData;
  
  const Icon = iconMap[serviceLine as ServiceLine] || DocumentTextIcon;
  const name = formatServiceLineName(serviceLine);
  const color = getServiceLineColor(serviceLine);
  const bgColor = getServiceLineBgColor(serviceLine);
  const borderColor = getServiceLineBorderColor(serviceLine);

  const getDescription = (line: ServiceLine | string) => {
    switch (line) {
      case ServiceLine.TAX:
        return 'Tax compliance, calculations, opinions, and administration';
      case ServiceLine.AUDIT:
        return 'Audit engagements, reviews, and reporting';
      case ServiceLine.ACCOUNTING:
        return 'Financial statements, bookkeeping, and management accounts';
      case ServiceLine.ADVISORY:
        return 'Consulting, strategy, and advisory services';
      case ServiceLine.QRM:
        return 'Quality assurance, risk management, and compliance oversight';
      case ServiceLine.BUSINESS_DEV:
        return 'Marketing campaigns, proposals, and market research';
      case ServiceLine.IT:
        return 'IT implementations, support, and infrastructure management';
      case ServiceLine.FINANCE:
        return 'Financial reporting, budgeting, and analysis';
      case ServiceLine.HR:
        return 'Recruitment, training, and policy development';
      default:
        return '';
    }
  };

  return (
    <Link
      href={`/dashboard/${serviceLine.toLowerCase()}`}
      className="group block bg-white rounded-lg border-2 border-forvis-gray-200 shadow-corporate hover:shadow-corporate-md transition-all duration-200 hover:border-forvis-blue-500"
    >
      <div className="p-4">
        <div className="flex flex-col h-full">
          {/* Icon and Arrow */}
          <div className="flex items-start justify-between mb-4">
            <div className={`w-12 h-12 rounded-lg ${bgColor} border-2 ${borderColor} flex items-center justify-center transition-transform duration-200 group-hover:scale-110`}>
              <Icon className={`h-6 w-6 ${color}`} />
            </div>
            <ArrowRightIcon className={`h-5 w-5 text-forvis-blue-500 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all duration-200`} />
          </div>

          {/* Title and Description */}
          <h3 className="text-lg font-bold text-forvis-gray-900 mb-2 group-hover:text-forvis-blue-600 transition-colors duration-200">
            {name}
          </h3>
          <p className="text-xs text-forvis-gray-700 mb-4 flex-grow leading-relaxed">
            {getDescription(serviceLine)}
          </p>

          {/* Stats */}
          <div className="flex items-center justify-between pt-4 border-t-2 border-forvis-gray-200">
            <div>
              <p className="text-2xl font-bold text-forvis-gray-900">{activeProjectCount}</p>
              <p className="text-xs font-medium text-forvis-gray-600 uppercase tracking-wider">Active</p>
            </div>
            <div className="text-right">
              <p className="text-xl font-semibold text-forvis-gray-700">{projectCount}</p>
              <p className="text-xs font-medium text-forvis-gray-600 uppercase tracking-wider">Total</p>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}

