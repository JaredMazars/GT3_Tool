'use client';

import { useState } from 'react';
import { 
  FileText,
  ClipboardCheck,
  Calculator,
  Lightbulb,
} from 'lucide-react';
import { ServiceLine } from '@/types';
import { ServiceLineWithStats } from '@/types/dto';
import { DashboardCard } from '@/components/ui';
import { 
  getServiceLineColor, 
  getServiceLineBgColor,
  getServiceLineBorderColor,
  formatServiceLineName 
} from '@/lib/utils/serviceLineUtils';

const iconMap: Partial<Record<ServiceLine, typeof FileText>> = {
  [ServiceLine.TAX]: FileText,
  [ServiceLine.AUDIT]: ClipboardCheck,
  [ServiceLine.ACCOUNTING]: Calculator,
  [ServiceLine.ADVISORY]: Lightbulb,
};

interface ServiceLineCardProps {
  serviceLineData: ServiceLineWithStats;
}

export function ServiceLineCard({ serviceLineData }: ServiceLineCardProps) {
  const { serviceLine } = serviceLineData;
  const [isNavigating, setIsNavigating] = useState(false);
  
  const Icon = iconMap[serviceLine as ServiceLine] || FileText;
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
    <div 
      className="w-12 h-12 rounded-lg flex items-center justify-center transition-transform duration-200 group-hover:scale-110 shadow-sm"
      style={{ background: 'linear-gradient(135deg, #5B93D7 0%, #2E5AAC 100%)' }}
    >
      <Icon className="h-6 w-6 text-white" />
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

