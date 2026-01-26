/**
 * Client Acceptance Card Component
 * Displays client acceptance status and provides access to complete/renew acceptance
 * Shows review tab for approval partner when pending approval
 */

'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { CheckCircle, AlertCircle, Clock, XCircle, Play, FileCheck, Eye } from 'lucide-react';
import { Card, Button } from '@/components/ui';
import { WorkflowTimeline } from '@/components/features/approvals/WorkflowTimeline';
import { ClientAcceptanceQuestionnaire } from './ClientAcceptanceQuestionnaire';
import { useApproveClientAcceptance, useRejectClientAcceptance } from '@/hooks/approvals/useClientAcceptanceActions';
import type { ClientAcceptance } from '@/types';
import type { EngagementAcceptanceApproval } from '@/types/approvals';

interface ClientAcceptanceCardProps {
  GSClientID: string;
  clientCode: string;
  clientName: string | null;
  onStartAcceptance?: () => void;
  onReviewAcceptance?: () => void;
}

export function ClientAcceptanceCard({
  GSClientID,
  clientCode,
  clientName,
  onStartAcceptance,
  onReviewAcceptance,
}: ClientAcceptanceCardProps) {
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  const approveAcceptance = useApproveClientAcceptance();
  const rejectAcceptance = useRejectClientAcceptance();

  // Fetch client acceptance status
  const { data: status, isLoading, refetch } = useQuery({
    queryKey: ['client', 'acceptance', 'status', GSClientID],
    queryFn: async () => {
      const res = await fetch(`/api/clients/${GSClientID}/acceptance/status`);
      if (!res.ok) throw new Error('Failed to fetch client acceptance status');
      const data = await res.json();
      return data.data;
    },
  });

  // Note: Completion percentage is now calculated and displayed within the questionnaire
  // to avoid duplication and ensure consistency

  if (isLoading) {
    return (
      <Card variant="standard" className="animate-pulse">
        <div className="p-6">
          <div className="h-6 bg-forvis-gray-200 rounded w-1/3 mb-4"></div>
          <div className="h-4 bg-forvis-gray-200 rounded w-2/3"></div>
        </div>
      </Card>
    );
  }

  const getStatusBadge = () => {
    if (!status?.exists) {
      return (
        <div className="flex items-center space-x-2 px-3 py-1.5 bg-forvis-gray-100 border-2 border-forvis-gray-300 rounded-lg">
          <XCircle className="h-4 w-4 text-forvis-gray-600" />
          <span className="text-sm font-semibold text-forvis-gray-700">Not Started</span>
        </div>
      );
    }

    if (status.approved) {
      return (
        <div className="flex items-center space-x-2 px-3 py-1.5 bg-forvis-success-50 border-2 border-forvis-success-200 rounded-lg">
          <CheckCircle className="h-4 w-4 text-forvis-success-600" />
          <span className="text-sm font-semibold text-forvis-success-700">Approved</span>
        </div>
      );
    }

    if (status.completed) {
      return (
        <div className="flex items-center space-x-2 px-3 py-1.5 bg-forvis-blue-50 border-2 border-forvis-blue-200 rounded-lg">
          <Clock className="h-4 w-4 text-forvis-blue-600" />
          <span className="text-sm font-semibold text-forvis-blue-700">Pending Approval</span>
        </div>
      );
    }

    return (
      <div className="flex items-center space-x-2 px-3 py-1.5 bg-forvis-warning-50 border-2 border-forvis-warning-200 rounded-lg">
        <AlertCircle className="h-4 w-4 text-forvis-warning-600" />
        <span className="text-sm font-semibold text-forvis-warning-700">In Progress</span>
      </div>
    );
  };

  const getRiskBadge = () => {
    if (!status?.riskRating) return null;

    const colors = {
      LOW: 'bg-forvis-success-100 text-forvis-success-800 border-forvis-success-300',
      MEDIUM: 'bg-forvis-warning-100 text-forvis-warning-800 border-forvis-warning-300',
      HIGH: 'bg-forvis-error-100 text-forvis-error-800 border-forvis-error-300',
    };

    const color = colors[status.riskRating as keyof typeof colors] || colors.MEDIUM;

    return (
      <div className={`px-3 py-1.5 rounded-lg border-2 text-sm font-semibold ${color}`}>
        Risk: {status.riskRating}
        {status.overallRiskScore != null && ` (${status.overallRiskScore.toFixed(0)}%)`}
      </div>
    );
  };

  const handleApprove = async (stepId: number, comment?: string) => {
    await approveAcceptance.mutateAsync({ stepId, comment });
    await refetch();
    setShowReviewModal(false);
    onReviewAcceptance?.(); // Navigate back to client page
  };

  const handleReject = async (stepId: number, comment: string) => {
    await rejectAcceptance.mutateAsync({ stepId, comment });
    await refetch();
    setShowReviewModal(false);
    onReviewAcceptance?.(); // Navigate back to client page
  };

  // Check if current user can approve
  const canApprove = Boolean(
    status?.canCurrentUserApprove &&
    status?.completed &&
    !status?.approved &&
    status?.currentStepId
  );

  return (
    <>
      <Card variant="standard">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-forvis-gray-900 mb-1">
                Client Acceptance
              </h3>
              <p className="text-sm text-forvis-gray-600">
                Client-level risk assessment required before engagement work
              </p>
            </div>
            <div className="flex items-center gap-3">
              {getStatusBadge()}
              {/* View Button (shown when acceptance exists) */}
              {status?.exists && (
                <Button
                  variant="secondary"
                  onClick={() => setShowViewModal(true)}
                >
                  <Eye className="h-4 w-4 mr-2" />
                  View
                </Button>
              )}
              {/* Review & Approve Button (shown when user can approve) */}
              {canApprove && (
                <Button
                  variant="gradient"
                  onClick={() => setShowReviewModal(true)}
                >
                  <FileCheck className="h-4 w-4 mr-2" />
                  Review & Approve
                </Button>
              )}
            </div>
          </div>

            {status?.approved && (
              <div className="space-y-2 mb-4">
                {status.validUntil && (
                  <div className="text-sm">
                    <span className="font-medium text-forvis-gray-700">Valid Until: </span>
                    <span className="text-forvis-gray-600">
                      {new Date(status.validUntil).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </span>
                  </div>
                )}
                {getRiskBadge()}
              </div>
            )}

            {/* Workflow Timeline - Show when completed (pending or approved) */}
            {status?.completed && (
              <WorkflowTimeline
                type="clientAcceptance"
                acceptance={{
                  completedAt: status.completedAt!,
                  completedBy: status.completedBy,
                  reviewedAt: status.approvedAt,
                  reviewedBy: status.approvedBy ?? status.pendingApproverName,
                } as EngagementAcceptanceApproval}
              />
            )}

          {!status?.exists && (
            <div className="bg-forvis-warning-50 border border-forvis-warning-200 rounded-lg p-4 mb-4">
              <p className="text-sm text-forvis-warning-800">
                <strong>Action Required:</strong> Client Acceptance must be completed before creating tasks or engagements for this client.
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3">
            {!status?.approved && !status?.completed && (
              <Button
                variant="primary"
                onClick={() => setShowEditModal(true)}
                className="flex-1"
              >
                <Play className="h-4 w-4 mr-2" />
                {status?.exists 
                  ? 'Continue Assessment'
                  : 'Begin Risk Assessment'}
              </Button>
            )}
          </div>
        </div>
      </Card>

      {/* Review Modal - Full Screen Questionnaire */}
      {showReviewModal && status?.currentStepId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 overflow-y-auto">
          <div className="min-h-screen px-4 py-8">
            <div className="max-w-5xl mx-auto">
              <div className="bg-white rounded-lg shadow-corporate-lg">
                <div className="border-b border-forvis-gray-200 px-6 py-4 flex items-center justify-between">
                  <h2 className="text-xl font-semibold text-forvis-gray-900">
                    Review Client Acceptance
                  </h2>
                  <Button
                    variant="secondary"
                    onClick={() => setShowReviewModal(false)}
                  >
                    Close
                  </Button>
                </div>
                <div className="p-6">
                  <ClientAcceptanceQuestionnaire
                    GSClientID={GSClientID}
                    clientName={clientName}
                    approvalMode={true}
                    approvalId={status.approvalId!}
                    currentStepId={status.currentStepId}
                    onApprove={handleApprove}
                    onReject={handleReject}
                    isApprovalProcessing={approveAcceptance.isPending || rejectAcceptance.isPending}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* View Modal - Read-Only Full Screen Questionnaire */}
      {showViewModal && status?.exists && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 overflow-y-auto">
          <div className="min-h-screen px-4 py-8">
            <div className="max-w-5xl mx-auto">
              <div className="bg-white rounded-lg shadow-corporate-lg">
                <div className="border-b border-forvis-gray-200 px-6 py-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-xl font-semibold text-forvis-gray-900">
                        Client Acceptance - {clientName || clientCode}
                      </h2>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-forvis-gray-100 text-forvis-gray-700">
                          Read-only view
                        </span>
                      </div>
                    </div>
                    <Button
                      variant="secondary"
                      onClick={() => setShowViewModal(false)}
                    >
                      Close
                    </Button>
                  </div>
                </div>
                <div className="p-6">
                  <ClientAcceptanceQuestionnaire
                    GSClientID={GSClientID}
                    clientName={clientName}
                    readOnlyMode={true}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal - Full Screen Questionnaire for Creating/Editing */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 overflow-y-auto">
          <div className="min-h-screen px-4 py-8">
            <div className="max-w-5xl mx-auto">
              <div className="bg-white rounded-lg shadow-corporate-lg">
                <div className="border-b border-forvis-gray-200 px-6 py-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-xl font-semibold text-forvis-gray-900">
                        Client Acceptance - {clientName || clientCode}
                      </h2>
                      <p className="text-sm text-forvis-gray-600 mt-1">
                        Complete the risk assessment questionnaire
                      </p>
                    </div>
                    <Button
                      variant="secondary"
                      onClick={() => setShowEditModal(false)}
                    >
                      Close
                    </Button>
                  </div>
                </div>
                <div className="p-6">
                  <ClientAcceptanceQuestionnaire
                    GSClientID={GSClientID}
                    clientName={clientName}
                    onSubmitSuccess={() => {
                      setShowEditModal(false);
                      refetch();
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
