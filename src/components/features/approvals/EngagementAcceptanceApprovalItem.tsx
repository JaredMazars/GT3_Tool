'use client';

import { CheckCircle, Briefcase, Building2, Calendar, AlertTriangle, Eye } from 'lucide-react';
import { formatDate } from '@/lib/utils/taskUtils';
import { GRADIENTS } from '@/lib/design-system/gradients';
import type { EngagementAcceptanceApproval } from '@/types/approvals';
import { Button } from '@/components/ui';
import { StatusBadge } from './StatusBadge';
import { WorkflowTimeline } from './WorkflowTimeline';

interface EngagementAcceptanceApprovalItemProps {
  acceptance: EngagementAcceptanceApproval;
  onOpenTaskModal?: (taskData: {
    taskId: string;
    serviceLine?: string;
    subServiceLineGroup?: string;
    clientId?: string;
  }) => void;
  showArchived?: boolean;
}

export function EngagementAcceptanceApprovalItem({ acceptance, onOpenTaskModal, showArchived = false }: EngagementAcceptanceApprovalItemProps) {

  const getRiskColor = (rating: string | null) => {
    if (!rating) return 'text-forvis-gray-600';
    switch (rating.toUpperCase()) {
      case 'HIGH':
        return 'text-forvis-error-600';
      case 'MEDIUM':
        return 'text-forvis-warning-600';
      case 'LOW':
        return 'text-forvis-success-600';
      default:
        return 'text-forvis-gray-600';
    }
  };

  const isReviewed = acceptance.reviewedAt !== null;

  const getButtonConfig = (): {
    text: string;
    variant: 'secondary' | 'gradient';
    icon: typeof CheckCircle | typeof Eye | null;
    disabled: boolean;
  } => {
    if (showArchived && isReviewed) {
      return {
        text: 'Reviewed',
        variant: 'secondary',
        icon: CheckCircle,
        disabled: true,
      };
    }
    return {
      text: showArchived ? 'View' : 'Review & Approve',
      variant: showArchived ? 'secondary' : 'gradient',
      icon: showArchived ? Eye : null,
      disabled: false,
    };
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
          <StatusBadge status={isReviewed ? 'APPROVED' : 'PENDING'} />
        </div>
      )}
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-3 flex-1">
          {/* Icon */}
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 shadow-sm"
            style={{ background: GRADIENTS.icon.standard }}
          >
            <CheckCircle className="h-5 w-5 text-white" />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between mb-2">
              <div className="flex-1">
                <h4 className="text-sm font-semibold text-forvis-gray-900">
                  Engagement Acceptance Questionnaire
                </h4>
                <div className="flex items-center space-x-2 mt-1 text-xs text-forvis-gray-600">
                  <Briefcase className="h-3 w-3" />
                  <span className="font-medium">{acceptance.taskCode || acceptance.taskName}</span>
                </div>
              </div>
            </div>

            {/* Task and Client Details */}
            <div className="space-y-1 text-sm text-forvis-gray-700 mb-3">
              <div className="flex items-start">
                <span className="text-forvis-gray-600 mr-2">Task:</span>
                <span className="font-medium">{acceptance.taskName}</span>
              </div>
              <div className="flex items-center space-x-2">
                <Building2 className="h-3 w-3 text-forvis-gray-600" />
                <span className="font-medium">{acceptance.clientCode}</span>
                <span className="text-forvis-gray-400">•</span>
                <span>{acceptance.clientName || 'Unknown Client'}</span>
              </div>
              {acceptance.riskRating && (
                <div className="flex items-center space-x-2 mt-2">
                  <AlertTriangle className={`h-4 w-4 ${getRiskColor(acceptance.riskRating)}`} />
                  <span className={`font-medium ${getRiskColor(acceptance.riskRating)}`}>
                    Risk Rating: {acceptance.riskRating}
                  </span>
                  {acceptance.overallRiskScore !== null && (
                    <span className="text-forvis-gray-600">
                      (Score: {acceptance.overallRiskScore.toFixed(1)})
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Metadata */}
            <div className="flex items-center space-x-4 text-xs text-forvis-gray-600">
              <div className="flex items-center space-x-1">
                <span>Completed by {acceptance.completedBy || 'Unknown'}</span>
              </div>
              <div className="flex items-center space-x-1">
                <Calendar className="h-3 w-3" />
                <span>{formatDate(acceptance.completedAt.toString())}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="ml-4 flex-shrink-0">
          <Button 
            variant={buttonConfig.variant}
            size="sm"
            onClick={() => {
              if (!buttonConfig.disabled && onOpenTaskModal) {
                onOpenTaskModal({
                  taskId: acceptance.taskId.toString(),
                  serviceLine: acceptance.masterCode?.toLowerCase(),
                  subServiceLineGroup: acceptance.subServlineGroupCode || undefined,
                  clientId: acceptance.clientGSID,
                });
              }
            }}
            disabled={buttonConfig.disabled}
            className={buttonConfig.disabled ? 'cursor-default opacity-80' : ''}
          >
            {ButtonIcon && <ButtonIcon className="h-4 w-4 mr-1.5" />}
            {buttonConfig.text}
          </Button>
        </div>
      </div>

      {/* Workflow Timeline */}
      <WorkflowTimeline type="clientAcceptance" acceptance={acceptance} />
    </div>
  );
}
