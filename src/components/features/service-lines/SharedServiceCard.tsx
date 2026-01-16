'use client';

import Link from 'next/link';
import { 
  ShieldCheck,
  Megaphone,
  Monitor,
  Banknote,
  Users,
  Presentation,
  ArrowRight,
} from 'lucide-react';
import { ServiceLine } from '@/types';
import { ServiceLineWithStats } from '@/types/dto';
import { formatServiceLineName } from '@/lib/utils/serviceLineUtils';
import { ForwardRefExoticComponent, SVGProps } from 'react';

const iconMap: Record<string, ForwardRefExoticComponent<SVGProps<SVGSVGElement>>> = {
  [ServiceLine.QRM]: ShieldCheck,
  [ServiceLine.BUSINESS_DEV]: Megaphone,
  [ServiceLine.IT]: Monitor,
  [ServiceLine.FINANCE]: Banknote,
  [ServiceLine.HR]: Users,
  [ServiceLine.COUNTRY_MANAGEMENT]: Presentation,
};

interface SharedServiceCardProps {
  serviceLineData: ServiceLineWithStats;
}

export function SharedServiceCard({ serviceLineData }: SharedServiceCardProps) {
  const { serviceLine } = serviceLineData;
  
  const Icon = iconMap[serviceLine as ServiceLine] || ShieldCheck;
  const name = formatServiceLineName(serviceLine);

  // All shared services route to their main page
  const href = `/dashboard/${serviceLine.toLowerCase()}`;

  const getDescription = (line: ServiceLine | string) => {
    switch (line) {
      case ServiceLine.QRM:
        return 'Quality assurance, risk assessment, and compliance oversight';
      case ServiceLine.BUSINESS_DEV:
        return 'Marketing campaigns, proposal development, and market research';
      case ServiceLine.IT:
        return 'IT implementations, technical support, and infrastructure';
      case ServiceLine.FINANCE:
        return 'Financial reporting, budgeting, and analysis for internal operations';
      case ServiceLine.HR:
        return 'Recruitment, training programs, and policy development';
      case ServiceLine.COUNTRY_MANAGEMENT:
        return 'Executive reporting and business analysis';
      default:
        return '';
    }
  };

  return (
    <div className="rounded-lg border border-forvis-gray-200 shadow-sm hover:shadow-md transition-all duration-200 relative overflow-hidden"
      style={{
        background: 'linear-gradient(135deg, #F0F7FD 0%, #E0EDFB 100%)',
      }}
    >
      <div className="p-4">
        {/* Main Service Line Link */}
        <Link
          href={href}
          className="group block mb-3"
        >
          {/* Hover gradient overlay */}
          <div 
            className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none"
            style={{
              background: 'linear-gradient(135deg, rgba(91, 147, 215, 0.06) 0%, rgba(46, 90, 172, 0.08) 100%)',
            }}
          />
          
          <div className="relative z-[1]">
            <div className="flex items-center gap-3 mb-3">
              {/* Icon */}
              <div 
                className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 transition-transform duration-200 group-hover:scale-110 shadow-sm"
                style={{ background: 'linear-gradient(135deg, #5B93D7 0%, #2E5AAC 100%)' }}
              >
                <Icon className="h-6 w-6 text-white" />
              </div>

              {/* Title and Arrow */}
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-bold text-forvis-gray-900 truncate group-hover:text-forvis-blue-600 transition-colors duration-200">
                  {name}
                </h3>
              </div>

              <ArrowRight className="h-4 w-4 text-forvis-blue-500 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all duration-200 flex-shrink-0" />
            </div>

            {/* Description */}
            <p className="text-xs text-forvis-gray-600 line-clamp-2 leading-relaxed">
              {getDescription(serviceLine)}
            </p>
          </div>
        </Link>
      </div>
    </div>
  );
}

