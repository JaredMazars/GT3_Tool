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
  const { serviceLine, name, description } = serviceLineData;
  
  const Icon = iconMap[serviceLine as ServiceLine] || ShieldCheck;
  const displayName = name || formatServiceLineName(serviceLine);

  // All shared services route to their main page
  const href = `/dashboard/${serviceLine.toLowerCase()}`;

  return (
    <div className="rounded-lg border border-forvis-gray-200 shadow-sm hover:shadow-md transition-all duration-200 relative overflow-hidden bg-gradient-dashboard-card">
      <div className="p-4">
        {/* Main Service Line Link */}
        <Link
          href={href}
          className="group block mb-3"
        >
          {/* Hover gradient overlay */}
          <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none bg-gradient-dashboard-hover" />
          
          <div className="relative z-[1]">
            <div className="flex items-center gap-3 mb-3">
              {/* Icon */}
              <div className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 transition-transform duration-200 group-hover:scale-110 shadow-sm bg-gradient-icon-standard">
                <Icon className="h-6 w-6 text-white" />
              </div>

              {/* Title and Arrow */}
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-bold text-forvis-gray-900 truncate group-hover:text-forvis-blue-600 transition-colors duration-200">
                  {displayName}
                </h3>
              </div>

              <ArrowRight className="h-4 w-4 text-forvis-blue-500 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all duration-200 flex-shrink-0" />
            </div>

            {/* Description */}
            <p className="text-xs text-forvis-gray-600 line-clamp-2 leading-relaxed">
              {description || ''}
            </p>
          </div>
        </Link>
      </div>
    </div>
  );
}

