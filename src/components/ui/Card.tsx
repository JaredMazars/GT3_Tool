import { HTMLAttributes, ReactNode, CSSProperties } from 'react';
import { LoadingSpinner } from './LoadingSpinner';

export type CardVariant = 'standard' | 'dashboard' | 'shared-service' | 'stats';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant;
  hoverable?: boolean;
  loading?: boolean;
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}

export function Card({
  variant = 'standard',
  hoverable = false,
  loading = false,
  children,
  className = '',
  style,
  ...props
}: CardProps) {
  const baseStyles = 'rounded-lg';

  const variantStyles = {
    standard: 'bg-white border border-forvis-gray-200 shadow-corporate',
    dashboard: 'group bg-white border border-forvis-gray-200 shadow-corporate',
    'shared-service': 'group bg-white border border-forvis-gray-200 shadow-sm',
    stats: 'text-white shadow-sm',
  };

  const hoverStyles = {
    standard: hoverable ? 'hover:shadow-corporate-md transition-shadow duration-200' : '',
    dashboard: 'hover:shadow-corporate-md transition-all duration-200 relative overflow-hidden',
    'shared-service': 'hover:shadow-md transition-all duration-200 relative overflow-hidden',
    stats: '',
  };

  const combinedClassName = `${baseStyles} ${variantStyles[variant]} ${hoverStyles[variant]} ${className}`.trim();

  // Gradient backgrounds for variants
  const variantBackgrounds: Record<CardVariant, CSSProperties | undefined> = {
    standard: undefined,
    dashboard: {
      background: 'linear-gradient(135deg, #F0F7FD 0%, #E0EDFB 100%)',
    },
    'shared-service': {
      background: 'linear-gradient(135deg, #F0F7FD 0%, #E0EDFB 100%)',
    },
    stats: {
      background: 'linear-gradient(to bottom right, #2E5AAC, #25488A)',
    },
  };

  const combinedStyle = {
    ...variantBackgrounds[variant],
    ...style,
  };

  return (
    <div className={combinedClassName} style={combinedStyle} {...props}>
      {/* Hover overlay for dashboard and shared-service variants */}
      {(variant === 'dashboard' || variant === 'shared-service') && (
        <div
          className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
          style={{
            background: 'linear-gradient(135deg, rgba(91, 147, 215, 0.06) 0%, rgba(46, 90, 172, 0.08) 100%)',
          }}
        />
      )}

      {/* Loading overlay */}
      {loading && (
        <div className="absolute inset-0 bg-white bg-opacity-90 rounded-lg flex items-center justify-center z-10">
          <LoadingSpinner size="md" />
        </div>
      )}

      {/* Content wrapper with proper z-index for dashboard/shared-service */}
      {variant === 'dashboard' || variant === 'shared-service' ? (
        <div className="relative z-[1]">{children}</div>
      ) : (
        children
      )}
    </div>
  );
}
