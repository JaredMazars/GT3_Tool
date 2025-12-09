'use client';

import { useState } from 'react';
import { 
  DocumentTextIcon,
  ClipboardDocumentCheckIcon,
  CalculatorIcon,
  LightBulbIcon,
} from '@heroicons/react/24/outline';
import { ServiceLine } from '@/types';
import { ServiceLineWithStats } from '@/types/dto';
import { DashboardCard } from '@/components/ui';
import { 
  getServiceLineColor, 
  getServiceLineBgColor,
  getServiceLineBorderColor,
  formatServiceLineName 
} from '@/lib/utils/serviceLineUtils';

const iconMap: Partial<Record<ServiceLine, typeof DocumentTextIcon>> = {
  [ServiceLine.TAX]: DocumentTextIcon,
  [ServiceLine.AUDIT]: ClipboardDocumentCheckIcon,
  [ServiceLine.ACCOUNTING]: CalculatorIcon,
  [ServiceLine.ADVISORY]: LightBulbIcon,
};

interface ServiceLineCardProps {
  serviceLineData: ServiceLineWithStats;
}

export function ServiceLineCard({ serviceLineData }: ServiceLineCardProps) {
  const { serviceLine } = serviceLineData;
  const [isNavigating, setIsNavigating] = useState(false);
  
  const Icon = iconMap[serviceLine as ServiceLine] || DocumentTextIcon;
  const name = formatServiceLineName(serviceLine);
  const color = getServiceLineColor(serviceLine);
  const bgColor = getServiceLineBgColor(serviceLine);
  const borderColor = getServiceLineBorderColor(serviceLine);

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsNavigating(true);
    window.location.href = `/dashboard/${serviceLine.toLowerCase()}`;
  };

  const getDescription = (line: ServiceLine | string) => {
    switch (line) {
      case ServiceLine.TAX:
        return 'Comprehensive tax services including compliance, planning, opinions, and administration';
      case ServiceLine.AUDIT:
        return 'Professional audit and assurance services ensuring financial statement accuracy';
      case ServiceLine.ACCOUNTING:
        return 'Full-service accounting from bookkeeping to financial statements and reporting';
      case ServiceLine.ADVISORY:
        return 'Strategic consulting to help businesses navigate challenges and opportunities';
      default:
        return '';
    }
  };

  const iconElement = (
    <div className={`w-12 h-12 rounded-lg ${bgColor} border-2 ${borderColor} flex items-center justify-center transition-transform duration-200 group-hover:scale-110`}>
      <Icon className={`h-6 w-6 ${color}`} />
    </div>
  );

  return (
    <DashboardCard
      title={name}
      description={getDescription(serviceLine)}
      icon={iconElement}
      href={`/dashboard/${serviceLine.toLowerCase()}`}
      onClick={handleClick}
      loading={isNavigating}
      variant="default"
    />
  );
}

