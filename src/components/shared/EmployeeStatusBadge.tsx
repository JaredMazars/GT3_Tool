'use client';

import React, { ReactNode } from 'react';
import { CircleX, CircleCheck, CircleHelp } from 'lucide-react';
import { getRoleGradient } from '@/lib/utils/roleColors';

export interface EmployeeStatusBadgeProps {
  // Status flags
  isActive?: boolean;
  hasUserAccount?: boolean;
  
  // Display options
  name?: string | null;
  variant?: 'text' | 'border' | 'icon-only' | 'kanban';
  iconSize?: 'sm' | 'md' | 'lg';
  
  // For kanban variant
  role?: string;
  
  // For border variant
  children?: ReactNode;
  
  // Optional styling
  className?: string;
  style?: React.CSSProperties;
}

export function EmployeeStatusBadge({
  isActive = true,
  hasUserAccount = true,
  name,
  variant = 'text',
  iconSize = 'md',
  role,
  children,
  className = '',
  style,
}: EmployeeStatusBadgeProps) {
  
  // Determine status and colors
  const getStatusConfig = () => {
    if (!isActive) {
      return {
        textColor: 'text-forvis-error-600',
        borderColor: 'border-forvis-error-500',
        icon: CircleX,
        title: 'Employee is inactive',
      };
    }
    
    if (hasUserAccount) {
      return {
        textColor: 'text-forvis-success-600',
        borderColor: 'border-forvis-success-500',
        icon: CircleCheck,
        title: 'Employee is active with user account',
      };
    }
    
    return {
      textColor: 'text-forvis-warning-600',
      borderColor: 'border-forvis-warning-500',
      icon: CircleHelp,
      title: 'Employee is active but has no user account',
    };
  };

  const status = getStatusConfig();
  const Icon = status.icon;
  
  // Icon size classes
  const iconSizeClass = {
    sm: 'h-3 w-3',
    md: 'h-4 w-4',
    lg: 'h-5 w-5',
  }[iconSize];

  // Kanban variant: role-based gradient background with optional status border
  if (variant === 'kanban' && role) {
    const gradient = getRoleGradient(role);
    const statusBorderClass = !isActive 
      ? 'border-forvis-error-500' 
      : !hasUserAccount 
        ? 'border-forvis-warning-500' 
        : 'border-forvis-success-500';
    
    return (
      <div
        className={`${className} ${statusBorderClass}`}
        style={{ background: gradient, ...style }}
        title={`${name || ''} - ${role}${status.title ? ` (${status.title})` : ''}`}
      >
        {children}
      </div>
    );
  }

  // Border variant: wrap children with colored border
  if (variant === 'border') {
    return (
      <div
        className={`inline-flex ${status.borderColor} border-2 rounded-full ${className}`}
        title={status.title}
      >
        {children}
      </div>
    );
  }

  // Icon-only variant
  if (variant === 'icon-only') {
    return (
      <span title={status.title} className="inline-flex">
        <Icon
          className={`${status.textColor} ${iconSizeClass} ${className}`}
        />
      </span>
    );
  }

  // Text variant (default): name with colored text + icon
  return (
    <span
      className={`inline-flex items-center gap-1 ${status.textColor} ${className}`}
      title={status.title}
    >
      <span>{name}</span>
      <Icon className={iconSizeClass} />
    </span>
  );
}

