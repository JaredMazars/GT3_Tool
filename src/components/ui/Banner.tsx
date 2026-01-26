import { HTMLAttributes, ReactNode } from 'react';
import {
  Info,
  AlertTriangle,
  CheckCircle,
  XCircle,
  X,
} from 'lucide-react';

export type BannerVariant = 'info' | 'error' | 'warning' | 'success';

export interface BannerProps extends HTMLAttributes<HTMLDivElement> {
  variant?: BannerVariant;
  title?: string;
  message: string | ReactNode;
  icon?: ReactNode;
  dismissible?: boolean;
  onDismiss?: () => void;
}

export function Banner({
  variant = 'info',
  title,
  message,
  icon,
  dismissible = false,
  onDismiss,
  className = '',
  ...props
}: BannerProps) {
  const baseStyles = 'rounded-xl p-4 border-2 shadow-corporate';

  const variantStyles: Record<BannerVariant, { container: string; iconBg: string; iconText: string; titleText: string; messageText: string; closeHover: string; borderColor: string; background?: string }> = {
    info: {
      container: '',
      iconBg: '',
      iconText: 'text-white',
      titleText: '#1C3667',
      messageText: 'text-forvis-gray-700',
      closeHover: 'text-forvis-blue-400 hover:text-forvis-blue-600',
      borderColor: '#2E5AAC',
      background: 'linear-gradient(135deg, #F0F7FD 0%, #E0EDFB 100%)',
    },
    error: {
      container: 'bg-forvis-error-50',
      iconBg: 'bg-forvis-error-100',
      iconText: 'text-forvis-error-600',
      titleText: 'text-forvis-error-900',
      messageText: 'text-forvis-error-800',
      closeHover: 'text-forvis-error-400 hover:text-forvis-error-600',
      borderColor: '#DC2626',
    },
    warning: {
      container: 'bg-forvis-warning-50',
      iconBg: 'bg-forvis-warning-100',
      iconText: 'text-forvis-warning-600',
      titleText: 'text-forvis-warning-900',
      messageText: 'text-forvis-warning-800',
      closeHover: 'text-forvis-warning-400 hover:text-forvis-warning-600',
      borderColor: '#F59E0B',
    },
    success: {
      container: 'bg-forvis-success-50',
      iconBg: 'bg-forvis-success-100',
      iconText: 'text-forvis-success-600',
      titleText: 'text-forvis-success-900',
      messageText: 'text-forvis-success-800',
      closeHover: 'text-forvis-success-400 hover:text-forvis-success-600',
      borderColor: '#4CAF50',
    },
  };

  const defaultIcons: Record<BannerVariant, ReactNode> = {
    info: <Info className="w-5 h-5" />,
    error: <XCircle className="w-5 h-5" />,
    warning: <AlertTriangle className="w-5 h-5" />,
    success: <CheckCircle className="w-5 h-5" />,
  };

  const styles = variantStyles[variant];
  const displayIcon = icon ?? defaultIcons[variant];

  const containerStyles = variant === 'info' 
    ? { background: styles.background, borderColor: styles.borderColor }
    : { borderColor: styles.borderColor };

  const iconBgStyle = variant === 'info'
    ? { background: 'linear-gradient(to bottom right, #5B93D7, #2E5AAC)' }
    : undefined;

  return (
    <div
      className={`${baseStyles} ${styles.container} ${className}`.trim()}
      style={containerStyles}
      {...props}
    >
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div
          className={`rounded-full p-2 ${variant === 'info' ? '' : styles.iconBg}`}
          style={iconBgStyle}
        >
          <div className={styles.iconText}>{displayIcon}</div>
        </div>

        {/* Content */}
        <div className="flex-1">
          {title && (
            <h3
              className="text-base font-bold mb-1"
              style={variant === 'info' ? { color: styles.titleText } : undefined}
            >
              <span className={variant !== 'info' ? styles.titleText : ''}>
                {title}
              </span>
            </h3>
          )}
          <div className={`text-sm ${styles.messageText}`}>
            {message}
          </div>
        </div>

        {/* Dismiss Button */}
        {dismissible && onDismiss && (
          <button
            onClick={onDismiss}
            className={`${styles.closeHover} transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-forvis-blue-500 rounded`}
            aria-label="Dismiss"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>
    </div>
  );
}



