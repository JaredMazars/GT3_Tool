'use client';

import { Building, AlertTriangle, Calendar, CheckCircle, Eye, User, FileCheck } from 'lucide-react';
import { formatDate } from '@/lib/utils/taskUtils';
import { GRADIENTS } from '@/lib/design-system/gradients';
import type { ApprovalWithSteps } from '@/types/approval';
import { Button, LoadingSpinner } from '@/components/ui';
import { StatusBadge } from './StatusBadge';
import { WorkflowTimeline } from './WorkflowTimeline';
import { ClientAcceptanceQuestionnaire } from '@/components/features/clients/ClientAcceptanceQuestionnaire';
import { useState } from 'react';

interface ClientAcceptanceApprovalItemProps {
  approval: ApprovalWithSteps;
  onApprove?: (stepId: number, comment?: string) => Promise<void>;
  onReject?: (stepId: number, comment: string) => Promise<void>;
  isProcessing?: boolean;
  showArchived?: boolean;
}

export function ClientAcceptanceApprovalItem({
  approval,
  onApprove,
  onReject,
  isProcessing = false,
  showArchived = false,
}: ClientAcceptanceApprovalItemProps) {
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [isLoadingClient, setIsLoadingClient] = useState(false);
  const [clientData, setClientData] = useState<{
    GSClientID: string;
    clientCode: string;
    clientName: string;
  } | null>(null);

  // Get current pending step
  const currentStep = approval.ApprovalStep.find((s) => s.status === 'PENDING');
  const isApproved = approval.status === 'APPROVED';

  // Display data from approval title
  const clientName = approval.title || 'Client Acceptance';
  const clientCode = `ID: ${approval.workflowId}`;
  const riskRating = 'Pending';
  const overallRiskScore: number | null | undefined = undefined;

  const getRiskColor = (rating: string) => {
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

  const fetchClientData = async () => {
    setIsLoadingClient(true);
    try {
      const res = await fetch(`/api/approvals/${approval.id}/client-acceptance`);
      if (!res.ok) throw new Error('Failed to fetch client data');
      const data = await res.json();
      setClientData(data.data);
    } catch (error) {
      console.error('Failed to fetch client data:', error);
    } finally {
      setIsLoadingClient(false);
    }
  };

  const handleOpenModal = async () => {
    await fetchClientData();
    setShowReviewModal(true);
  };

  const handleCloseModal = () => {
    setShowReviewModal(false);
    setClientData(null);
  };

  const handleApprove = async (stepId: number, comment?: string) => {
    if (onApprove) {
      await onApprove(stepId, comment);
      handleCloseModal();
    }
  };

  const handleReject = async (stepId: number, comment: string) => {
    if (onReject) {
      await onReject(stepId, comment);
      handleCloseModal();
    }
  };

  const getButtonConfig = () => {
    if (showArchived && isApproved) {
      return {
        text: 'Approved',
        variant: 'secondary' as const,
        icon: CheckCircle,
        disabled: true,
      };
    }
    if (showArchived) {
      return {
        text: 'View',
        variant: 'secondary' as const,
        icon: Eye,
        disabled: false,
      };
    }
    return {
      text: 'Review & Approve',
      variant: 'gradient' as const,
      icon: FileCheck,
      disabled: false,
    };
  };

  const buttonConfig = getButtonConfig();
  const ButtonIcon = buttonConfig.icon;

  return (
    <>
      <div
        className="rounded-lg border border-forvis-blue-100 p-4 shadow-sm hover:shadow-md transition-all duration-200 relative"
        style={{ background: GRADIENTS.dashboard.card }}
      >
        {/* Status Badge - Top Right */}
        {showArchived && (
          <div className="absolute top-3 right-3">
            <StatusBadge status={approval.status} />
          </div>
        )}

        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-3 flex-1">
            {/* Icon */}
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 shadow-sm"
              style={{ background: GRADIENTS.icon.standard }}
            >
              <Building className="h-5 w-5 text-white" />
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <h4 className="text-sm font-semibold text-forvis-gray-900">
                    Client Acceptance Questionnaire
                  </h4>
                  <div className="flex items-center space-x-2 mt-1 text-xs text-forvis-gray-600">
                    <Building className="h-3 w-3" />
                    <span className="font-medium">{clientCode}</span>
                  </div>
                </div>
              </div>

              {/* Client Details */}
              <div className="space-y-1 text-sm text-forvis-gray-700 mb-3">
                <div className="flex items-start">
                  <span className="text-forvis-gray-600 mr-2">Client:</span>
                  <span className="font-medium">{clientName}</span>
                </div>
                {riskRating && riskRating !== 'Pending' && (
                  <div className="flex items-center space-x-2 mt-2">
                    <AlertTriangle className={`h-4 w-4 ${getRiskColor(riskRating)}`} />
                    <span className={`font-medium ${getRiskColor(riskRating)}`}>
                      Risk Rating: {riskRating}
                    </span>
                    {overallRiskScore != null && (
                      <span className="text-forvis-gray-600">
                        (Score: {(overallRiskScore as number).toFixed(1)})
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Metadata */}
              <div className="flex items-center space-x-4 text-xs text-forvis-gray-600">
                <div className="flex items-center space-x-1">
                  <User className="h-3 w-3" />
                  <span>
                    Requested by {approval.User_Approval_requestedByIdToUser?.name || 'Unknown'}
                  </span>
                </div>
                <div className="flex items-center space-x-1">
                  <Calendar className="h-3 w-3" />
                  <span>{formatDate(approval.requestedAt.toString())}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="ml-4 flex-shrink-0">
            <Button
              variant={buttonConfig.variant}
              size="sm"
              onClick={handleOpenModal}
              disabled={buttonConfig.disabled || isProcessing}
              className={buttonConfig.disabled ? 'cursor-default opacity-80' : ''}
            >
              {ButtonIcon && <ButtonIcon className="h-4 w-4 mr-1.5" />}
              {buttonConfig.text}
            </Button>
          </div>
        </div>

        {/* Workflow Timeline */}
        <WorkflowTimeline type="clientAcceptance" approval={approval} />
      </div>

      {/* Review Modal - Full Screen Questionnaire */}
      {showReviewModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 overflow-y-auto">
          <div className="min-h-screen px-4 py-8">
            <div className="max-w-5xl mx-auto">
              <div className="bg-white rounded-lg shadow-corporate-lg">
                <div className="border-b border-forvis-gray-200 px-6 py-4 flex items-center justify-between">
                  <h2 className="text-xl font-semibold text-forvis-gray-900">
                    {showArchived ? 'View Client Acceptance' : 'Review Client Acceptance'}
                  </h2>
                  <Button
                    variant="secondary"
                    onClick={handleCloseModal}
                    disabled={isProcessing}
                  >
                    Close
                  </Button>
                </div>
                <div className="p-6">
                  {isLoadingClient ? (
                    <div className="flex items-center justify-center py-12">
                      <LoadingSpinner size="lg" />
                      <span className="ml-3 text-sm text-forvis-gray-600">Loading client data...</span>
                    </div>
                  ) : clientData ? (
                    <ClientAcceptanceQuestionnaire
                      GSClientID={clientData.GSClientID}
                      clientName={clientData.clientName}
                      approvalMode={!showArchived}
                      approvalId={approval.id}
                      currentStepId={currentStep?.id}
                      onApprove={handleApprove}
                      onReject={handleReject}
                      isApprovalProcessing={isProcessing}
                      readOnlyMode={showArchived}
                    />
                  ) : (
                    <div className="text-center py-12">
                      <p className="text-sm text-forvis-error-600">Failed to load client data</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
