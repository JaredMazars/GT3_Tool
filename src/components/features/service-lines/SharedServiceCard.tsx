'use client';

import Link from 'next/link';
import { 
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
import { ForwardRefExoticComponent, SVGProps } from 'react';

const iconMap: Record<string, ForwardRefExoticComponent<SVGProps<SVGSVGElement>>> = {
  [ServiceLine.QRM]: ShieldCheckIcon,
  [ServiceLine.BUSINESS_DEV]: MegaphoneIcon,
  [ServiceLine.IT]: ComputerDesktopIcon,
  [ServiceLine.FINANCE]: BanknotesIcon,
  [ServiceLine.HR]: UserGroupIcon,
};

interface SharedServiceCardProps {
  serviceLineData: ServiceLineWithStats;
}

export function SharedServiceCard({ serviceLineData }: SharedServiceCardProps) {
  const { serviceLine, activeProjectCount, projectCount } = serviceLineData;
  
  const Icon = iconMap[serviceLine as ServiceLine] || ShieldCheckIcon;
  const name = formatServiceLineName(serviceLine);
  const color = getServiceLineColor(serviceLine);
  const bgColor = getServiceLineBgColor(serviceLine);
  const borderColor = getServiceLineBorderColor(serviceLine);

  const getDescription = (line: ServiceLine | string) => {
    switch (line) {
      case ServiceLine.QRM:
        return 'Quality assurance, risk management, and compliance';
      case ServiceLine.BUSINESS_DEV:
        return 'Marketing campaigns, proposals, and market research';
      case ServiceLine.IT:
        return 'IT implementations, support, and infrastructure';
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
      className="group block bg-white rounded-lg border-2 border-forvis-gray-200 shadow-sm hover:shadow-md transition-all duration-200 hover:border-forvis-blue-400"
    >
      <div className="p-3">
        <div className="flex items-center gap-3 mb-2">
          {/* Icon */}
          <div className={`w-10 h-10 rounded-lg ${bgColor} border ${borderColor} flex items-center justify-center flex-shrink-0 transition-transform duration-200 group-hover:scale-110`}>
            <Icon className={`h-5 w-5 ${color}`} />
          </div>

          {/* Title and Arrow */}
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-bold text-forvis-gray-900 truncate group-hover:text-forvis-blue-600 transition-colors duration-200">
              {name}
            </h3>
          </div>

          <ArrowRightIcon className="h-4 w-4 text-forvis-blue-500 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all duration-200 flex-shrink-0" />
        </div>

        {/* Description */}
        <p className="text-xs text-forvis-gray-600 mb-3 line-clamp-2 leading-relaxed">
          {getDescription(serviceLine)}
        </p>

        {/* Stats - Compact */}
        <div className="flex items-center gap-4 pt-2 border-t border-forvis-gray-200">
          <div className="flex items-baseline gap-1">
            <p className="text-lg font-bold text-forvis-gray-900">{activeProjectCount}</p>
            <p className="text-xs text-forvis-gray-600">Active</p>
          </div>
          <div className="flex items-baseline gap-1">
            <p className="text-base font-semibold text-forvis-gray-700">{projectCount}</p>
            <p className="text-xs text-forvis-gray-600">Total</p>
          </div>
        </div>
      </div>
    </Link>
  );
}

