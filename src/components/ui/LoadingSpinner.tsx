import { HTMLAttributes } from 'react';

export type LoadingSpinnerSize = 'sm' | 'md' | 'lg' | 'xl';

export interface LoadingSpinnerProps extends HTMLAttributes<HTMLDivElement> {
  size?: LoadingSpinnerSize;
  color?: 'blue' | 'white' | 'gray';
}

export function LoadingSpinner({
  size = 'md',
  color = 'blue',
  className = '',
  ...props
}: LoadingSpinnerProps) {
  const sizeStyles = {
    sm: 'h-4 w-4 border-2',
    md: 'h-8 w-8 border-b-2',
    lg: 'h-12 w-12 border-b-2',
    xl: 'h-16 w-16 border-b-3',
  };

  const colorStyles = {
    blue: 'border-forvis-blue-500',
    white: 'border-white',
    gray: 'border-forvis-gray-400',
  };

  const combinedClassName = `animate-spin rounded-full ${sizeStyles[size]} ${colorStyles[color]} ${className}`.trim();

  return <div className={combinedClassName} {...props} role="status" aria-label="Loading" />;
}

export interface LoadingOverlayProps extends HTMLAttributes<HTMLDivElement> {
  spinnerSize?: LoadingSpinnerSize;
  message?: string;
}

export function LoadingOverlay({
  spinnerSize = 'md',
  message,
  className = '',
  ...props
}: LoadingOverlayProps) {
  return (
    <div
      className={`absolute inset-0 bg-white bg-opacity-90 rounded-lg flex flex-col items-center justify-center z-10 ${className}`.trim()}
      {...props}
    >
      <LoadingSpinner size={spinnerSize} />
      {message && (
        <p className="mt-3 text-sm text-forvis-gray-600 font-medium">{message}</p>
      )}
    </div>
  );
}


























