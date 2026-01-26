'use client';

import { CheckCircle, XCircle, Circle, Ban } from 'lucide-react';

interface StatusBadgeProps {
  status: string;
  className?: string;
}

export function StatusBadge({ status, className = '' }: StatusBadgeProps) {
  const getStatusConfig = (status: string) => {
    const statusUpper = status.toUpperCase();
    
    switch (statusUpper) {
      case 'APPROVED':
        return {
          bgColor: 'bg-forvis-success-100',
          textColor: 'text-forvis-success-800',
          icon: CheckCircle,
          label: 'Approved',
        };
      case 'REJECTED':
        return {
          bgColor: 'bg-forvis-error-100',
          textColor: 'text-forvis-error-800',
          icon: XCircle,
          label: 'Rejected',
        };
      case 'CANCELLED':
        return {
          bgColor: 'bg-forvis-gray-200',
          textColor: 'text-forvis-gray-700',
          icon: Ban,
          label: 'Cancelled',
        };
      case 'PENDING':
      default:
        return {
          bgColor: 'bg-forvis-blue-100',
          textColor: 'text-forvis-blue-700',
          icon: Circle,
          label: 'Pending',
        };
    }
  };

  const config = getStatusConfig(status);
  const Icon = config.icon;

  return (
    <span
      className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-medium ${config.bgColor} ${config.textColor} ${className}`}
    >
      <Icon className="h-3 w-3" />
      <span>{config.label}</span>
    </span>
  );
}
