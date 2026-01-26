import { ButtonHTMLAttributes, forwardRef, ReactNode } from 'react';
import { GRADIENTS } from '@/lib/design-system/gradients';

export type ButtonVariant = 'primary' | 'secondary' | 'gradient' | 'danger' | 'success';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  icon?: ReactNode;
  children: ReactNode;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      loading = false,
      icon,
      children,
      className = '',
      disabled,
      ...props
    },
    ref
  ) => {
    const baseStyles = 'inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-forvis-blue-500';
    
    const sizeStyles = {
      sm: 'px-3 py-1.5 text-xs',
      md: 'px-4 py-2 text-sm',
      lg: 'px-6 py-3 text-base',
    };

    const variantStyles = {
      primary: 'text-white bg-forvis-blue-500 hover:bg-forvis-blue-600 shadow-corporate hover:shadow-corporate-md',
      secondary: 'text-forvis-gray-700 bg-white border border-forvis-gray-300 hover:bg-forvis-gray-50 shadow-corporate',
      gradient: 'text-white font-bold shadow-lg hover:shadow-xl',
      danger: 'text-white bg-forvis-error-600 hover:bg-forvis-error-700 shadow-corporate hover:shadow-corporate-md',
      success: 'text-white bg-forvis-success-600 hover:bg-forvis-success-700 shadow-corporate hover:shadow-corporate-md',
    };

    const disabledStyles = 'disabled:opacity-50 disabled:cursor-not-allowed';

    const combinedClassName = `${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]} ${disabledStyles} ${className}`.trim();

    const gradientStyle = variant === 'gradient' 
      ? { background: GRADIENTS.primary.diagonal }
      : undefined;

    return (
      <button
        ref={ref}
        className={combinedClassName}
        style={gradientStyle}
        disabled={disabled || loading}
        {...props}
      >
        {loading ? (
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
        ) : icon ? (
          <span className="flex-shrink-0">{icon}</span>
        ) : null}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';

export { Button };


























