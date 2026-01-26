/**
 * Access Level Badge Component
 * Displays page access level with appropriate styling
 */

import { Badge } from '@/components/ui';
import { PageAccessLevel } from '@/types/pagePermissions';

interface AccessLevelBadgeProps {
  level: PageAccessLevel;
  compact?: boolean;
}

export function AccessLevelBadge({ level, compact = false }: AccessLevelBadgeProps) {
  const getDisplay = () => {
    if (compact) {
      switch (level) {
        case PageAccessLevel.FULL:
          return 'F';
        case PageAccessLevel.VIEW:
          return 'V';
        case PageAccessLevel.NONE:
          return '-';
      }
    }
    
    switch (level) {
      case PageAccessLevel.FULL:
        return 'Full Access';
      case PageAccessLevel.VIEW:
        return 'View Only';
      case PageAccessLevel.NONE:
        return 'No Access';
    }
  };

  const getColor = () => {
    switch (level) {
      case PageAccessLevel.FULL:
        return 'bg-green-100 text-green-800 border-green-200';
      case PageAccessLevel.VIEW:
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case PageAccessLevel.NONE:
        return 'bg-red-100 text-red-800 border-red-200';
    }
  };

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${getColor()}`}
    >
      {getDisplay()}
    </span>
  );
}






















