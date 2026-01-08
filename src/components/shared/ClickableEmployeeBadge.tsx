'use client';

import { EmployeeStatusBadge, type EmployeeStatusBadgeProps } from './EmployeeStatusBadge';

interface ClickableEmployeeBadgeProps extends EmployeeStatusBadgeProps {
  /** Whether the badge should be clickable */
  clickable?: boolean;
  /** Click handler */
  onClick?: () => void;
  /** Whether the badge is disabled */
  disabled?: boolean;
}

/**
 * ClickableEmployeeBadge
 * 
 * Wrapper around EmployeeStatusBadge that makes it clickable for authorized users.
 * Shows visual feedback (cursor pointer, hover effect) when clickable.
 * 
 * Usage:
 * ```tsx
 * <ClickableEmployeeBadge
 *   name={clientPartnerName}
 *   isActive={isActive}
 *   hasUserAccount={hasAccount}
 *   clickable={hasManagerRole}
 *   onClick={() => openChangeModal('PARTNER')}
 * />
 * ```
 */
export function ClickableEmployeeBadge({
  clickable = false,
  onClick,
  disabled = false,
  className = '',
  ...badgeProps
}: ClickableEmployeeBadgeProps) {
  const isInteractive = clickable && !disabled && onClick;

  const handleClick = () => {
    if (isInteractive) {
      onClick();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (isInteractive && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      onClick();
    }
  };

  // Add interactive styles if clickable
  const interactiveClasses = isInteractive
    ? 'cursor-pointer hover:underline hover:opacity-80 transition-all duration-200'
    : '';

  const disabledClasses = disabled ? 'opacity-50 cursor-not-allowed' : '';

  const combinedClassName = `${className} ${interactiveClasses} ${disabledClasses}`.trim();

  // If clickable, wrap in a button-like div
  if (isInteractive) {
    return (
      <div
        role="button"
        tabIndex={0}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        className={combinedClassName}
        aria-label={`Change ${badgeProps.name || 'employee'}`}
        title={`Click to request change`}
      >
        <EmployeeStatusBadge {...badgeProps} />
      </div>
    );
  }

  // Otherwise, render badge normally
  return <EmployeeStatusBadge {...badgeProps} className={combinedClassName} />;
}
