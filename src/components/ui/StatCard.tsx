import { HTMLAttributes, ReactNode, CSSProperties } from 'react';

export type StatCardGradient = 1 | 2 | 3 | 4;

export interface StatCardProps extends HTMLAttributes<HTMLDivElement> {
  label: string;
  value: string | number;
  icon?: ReactNode;
  gradientVariant?: StatCardGradient;
}

export function StatCard({
  label,
  value,
  icon,
  gradientVariant = 1,
  className = '',
  ...props
}: StatCardProps) {
  const baseStyles = 'rounded-lg p-3 shadow-sm text-white';

  const gradientBackgrounds: Record<StatCardGradient, string> = {
    1: 'linear-gradient(to bottom right, #2E5AAC, #25488A)', // Primary metric
    2: 'linear-gradient(to bottom right, #5B93D7, #2E5AAC)', // Secondary metric
    3: 'linear-gradient(to bottom right, #25488A, #1C3667)', // Tertiary metric
    4: 'linear-gradient(to bottom right, #1C3667, #132445)', // Additional metric
  };

  const iconBackgrounds: Record<StatCardGradient, string> = {
    1: 'rgba(28, 54, 103, 0.5)',
    2: 'rgba(37, 72, 138, 0.5)',
    3: 'rgba(28, 54, 103, 0.6)',
    4: 'rgba(19, 36, 69, 0.6)',
  };

  const combinedClassName = `${baseStyles} ${className}`.trim();
  
  const style: CSSProperties = {
    background: gradientBackgrounds[gradientVariant],
  };

  return (
    <div className={combinedClassName} style={style} {...props}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-medium opacity-90">{label}</p>
          <p className="text-2xl font-bold mt-1">{value}</p>
        </div>
        {icon && (
          <div
            className="rounded-full p-2"
            style={{ backgroundColor: iconBackgrounds[gradientVariant] }}
          >
            <div className="w-5 h-5 flex items-center justify-center">
              {icon}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}


























