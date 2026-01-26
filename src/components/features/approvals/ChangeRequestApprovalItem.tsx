'use client';

import { UserCog, Building2, Calendar, User, CheckCircle, XCircle, Ban } from 'lucide-react';
import { formatDate } from '@/lib/utils/taskUtils';
import { GRADIENTS } from '@/lib/design-system/gradients';
import type { ChangeRequestApproval } from '@/types/approvals';
import { Button } from '@/components/ui';
import { StatusBadge } from './StatusBadge';
import { WorkflowTimeline } from './WorkflowTimeline';

interface ChangeRequestApprovalItemProps {
  request: ChangeRequestApproval;
  onOpenModal: (requestId: number) => void;
  showArchived?: boolean;
}

export function ChangeRequestApprovalItem({
  request,
  onOpenModal,
  showArchived = false,
}: ChangeRequestApprovalItemProps) {
  const roleLabel = request.changeType === 'PARTNER' ? 'Client Partner' : 'Client Manager';

  const getButtonConfig = () => {
    if (!showArchived) {
      return {
        text: 'Review',
        variant: 'gradient' as const,
        icon: null,
        disabled: false,
      };
    }

    switch (request.status.toUpperCase()) {
      case 'APPROVED':
        return {
          text: 'Approved',
          variant: 'secondary' as const,
          icon: CheckCircle,
          disabled: true,
        };
      case 'REJECTED':
        return {
          text: 'Rejected',
          variant: 'secondary' as const,
          icon: XCircle,
          disabled: true,
        };
      case 'CANCELLED':
        return {
          text: 'Cancelled',
          variant: 'secondary' as const,
          icon: Ban,
          disabled: true,
        };
      default:
        return {
          text: 'View',
          variant: 'secondary' as const,
          icon: null,
          disabled: false,
        };
    }
  };

  const buttonConfig = getButtonConfig();
  const ButtonIcon = buttonConfig.icon;

  return (
    <div
      className="rounded-lg border border-forvis-blue-100 p-4 shadow-sm hover:shadow-md transition-all duration-200 relative"
      style={{ background: GRADIENTS.dashboard.card }}
    >
      {/* Status Badge - Top Right */}
      {showArchived && (
        <div className="absolute top-3 right-3">
          <StatusBadge status={request.status} />
        </div>
      )}

      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-3 flex-1">
          {/* Icon */}
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 shadow-sm"
            style={{ background: GRADIENTS.icon.standard }}
          >
            <UserCog className="h-5 w-5 text-white" />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between mb-2">
              <div className="flex-1">
                <h4 className="text-sm font-semibold text-forvis-gray-900">
                  {roleLabel} Change Request
                </h4>
                <div className="flex items-center space-x-2 mt-1 text-xs text-forvis-gray-600">
                  <Building2 className="h-3 w-3" />
                  <span className="font-medium">{request.client.clientCode}</span>
                  <span className="text-forvis-gray-400">•</span>
                  <span>{request.client.clientNameFull || 'Unknown Client'}</span>
                </div>
              </div>
            </div>

            {/* Change Details */}
            <div className="space-y-1 text-sm text-forvis-gray-700 mb-3">
              <div className="flex items-start">
                <span className="text-forvis-gray-600 mr-2">From:</span>
                <span className="font-medium">
                  {request.currentEmployeeName || request.currentEmployeeCode}
                </span>
              </div>
              <div className="flex items-start">
                <span className="text-forvis-gray-600 mr-2">To:</span>
                <span className="font-medium text-forvis-blue-700">
                  {request.proposedEmployeeName || request.proposedEmployeeCode} (You)
                </span>
              </div>
              {request.reason && (
                <div className="flex items-start mt-2">
                  <span className="text-forvis-gray-600 mr-2">Reason:</span>
                  <span className="text-forvis-gray-700">{request.reason}</span>
                </div>
              )}
            </div>

            {/* Metadata */}
            <div className="flex items-center space-x-4 text-xs text-forvis-gray-600">
              <div className="flex items-center space-x-1">
                <User className="h-3 w-3" />
                <span>Requested by {request.requestedByName || 'Unknown'}</span>
              </div>
              <div className="flex items-center space-x-1">
                <Calendar className="h-3 w-3" />
                <span>{formatDate(request.requestedAt.toString())}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="ml-4 flex-shrink-0">
          <Button
            variant={buttonConfig.variant}
            size="sm"
            onClick={() => !buttonConfig.disabled && onOpenModal(request.id)}
            disabled={buttonConfig.disabled}
            className={buttonConfig.disabled ? 'cursor-default opacity-80' : ''}
          >
            {ButtonIcon && <ButtonIcon className="h-4 w-4 mr-1.5" />}
            {buttonConfig.text}
          </Button>
        </div>
      </div>

      {/* Workflow Timeline */}
      <WorkflowTimeline type="changeRequest" request={request} />
    </div>
  );
}
