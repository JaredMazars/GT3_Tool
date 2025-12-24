import { HTMLAttributes, ReactNode } from 'react';

export type BadgeVariant = 'default' | 'blue' | 'green' | 'yellow' | 'red' | 'purple' | 'teal' | 'indigo' | 'cyan' | 'orange' | 'emerald' | 'pink';
export type BadgeSize = 'sm' | 'md' | 'lg';

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  size?: BadgeSize;
  dot?: boolean;
  children: ReactNode;
}

export function Badge({
  variant = 'default',
  size = 'md',
  dot = false,
  children,
  className = '',
  ...props
}: BadgeProps) {
  const baseStyles = 'inline-flex items-center rounded-full font-medium border';

  const sizeStyles = {
    sm: 'px-2 py-0.5 text-xs gap-1',
    md: 'px-2.5 py-0.5 text-xs gap-1.5',
    lg: 'px-3 py-1 text-sm gap-2',
  };

  const variantStyles: Record<BadgeVariant, string> = {
    default: 'bg-forvis-gray-100 text-forvis-gray-800 border-forvis-gray-200',
    blue: 'bg-blue-100 text-blue-800 border-blue-200',
    green: 'bg-green-100 text-green-800 border-green-200',
    yellow: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    red: 'bg-red-100 text-red-800 border-red-200',
    purple: 'bg-purple-100 text-purple-800 border-purple-200',
    teal: 'bg-teal-100 text-teal-800 border-teal-200',
    indigo: 'bg-indigo-100 text-indigo-800 border-indigo-200',
    cyan: 'bg-cyan-100 text-cyan-800 border-cyan-200',
    orange: 'bg-orange-100 text-orange-800 border-orange-200',
    emerald: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    pink: 'bg-pink-100 text-pink-800 border-pink-200',
  };

  const dotColors: Record<BadgeVariant, string> = {
    default: 'bg-forvis-gray-500',
    blue: 'bg-blue-500',
    green: 'bg-green-500',
    yellow: 'bg-yellow-500',
    red: 'bg-red-500',
    purple: 'bg-purple-500',
    teal: 'bg-teal-500',
    indigo: 'bg-indigo-500',
    cyan: 'bg-cyan-500',
    orange: 'bg-orange-500',
    emerald: 'bg-emerald-500',
    pink: 'bg-pink-500',
  };

  const dotSize = size === 'sm' ? 'h-1.5 w-1.5' : size === 'md' ? 'h-2 w-2' : 'h-2.5 w-2.5';

  const combinedClassName = `${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]} ${className}`.trim();

  return (
    <span className={combinedClassName} {...props}>
      {dot && (
        <span className={`${dotSize} ${dotColors[variant]} rounded-full`} aria-hidden="true" />
      )}
      {children}
    </span>
  );
}


























