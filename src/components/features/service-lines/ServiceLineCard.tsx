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

  return (
    <DashboardCard
      title={displayName}
      description={description || ''}
      icon={<Icon className="h-6 w-6 text-white" />}
      href={`/dashboard/${serviceLine.toLowerCase()}`}
      onClick={handleClick}
      loading={isNavigating}
      variant="default"
    />
  );
}

