/**
 * Source Badge Component
 * Shows where the permission comes from (AUTO/CODE/DB)
 */

interface SourceBadgeProps {
  source: 'AUTO' | 'CODE' | 'DB';
}

export function SourceBadge({ source }: SourceBadgeProps) {
  const getStyles = () => {
    switch (source) {
      case 'DB':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'CODE':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'AUTO':
        return 'bg-blue-100 text-blue-800 border-blue-200';
    }
  };

  const getLabel = () => {
    switch (source) {
      case 'DB':
        return 'Database';
      case 'CODE':
        return 'Code';
      case 'AUTO':
        return 'Auto';
    }
  };

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${getStyles()}`}
    >
      {getLabel()}
    </span>
  );
}






















