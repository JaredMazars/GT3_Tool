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
import { formatServiceLineName } from '@/lib/utils/serviceLineUtils';

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
  const { serviceLine, name, description } = serviceLineData;
  const [isNavigating, setIsNavigating] = useState(false);
  
  const Icon = iconMap[serviceLine as ServiceLine] || FileText;
  const displayName = name || formatServiceLineName(serviceLine);

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsNavigating(true);
    window.location.href = `/dashboard/${serviceLine.toLowerCase()}`;
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
      title={displayName}
      description={description || ''}
      icon={iconElement}
      href={`/dashboard/${serviceLine.toLowerCase()}`}
      onClick={handleClick}
      loading={isNavigating}
      variant="default"
    />
  );
}

