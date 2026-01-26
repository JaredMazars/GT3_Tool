'use client';

import { useState, useEffect } from 'react';
import { CheckCircle, XCircle, Building2, X, User, Calendar, AlertCircle } from 'lucide-react';
import { LoadingSpinner, Button } from '@/components/ui';
import { useApproveChangeRequest, useRejectChangeRequest } from '@/hooks/clients/useChangeRequests';
import { formatDate } from '@/lib/utils/taskUtils';
import { GRADIENTS } from '@/lib/design-system/gradients';

interface ChangeRequest {
  id: number;
  clientId: number;
  changeType: string;
  currentEmployeeCode: string;
  currentEmployeeName: string | null;
  proposedEmployeeCode: string;
  proposedEmployeeName: string | null;
  reason: string | null;
  status: string;
  requestedAt: string;
  requiresDualApproval: boolean;
  currentEmployeeApprovedAt: string | null;
  currentEmployeeApprovedById: string | null;
  proposedEmployeeApprovedAt: string | null;
  proposedEmployeeApprovedById: string | null;
  RequestedBy: {
    name: string | null;
  };
  CurrentApprover?: {
    name: string | null;
  };
  ProposedApprover?: {
    name: string | null;
  };
  Client: {
    clientCode: string;
    clientNameFull: string | null;
    GSClientID: string;
  };
}

interface ApproveChangeRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  requestId: number;
}

export function ApproveChangeRequestModal({
  isOpen,
  onClose,
  requestId,
}: ApproveChangeRequestModalProps) {
  const [request, setRequest] = useState<ChangeRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [comment, setComment] = useState('');
  const [rejectMode, setRejectMode] = useState(false);

  const approveRequest = useApproveChangeRequest();
  const rejectRequest = useRejectChangeRequest();

  const fetchRequest = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`/api/change-requests/${requestId}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || 'Failed to load request');
      }

      setRequest(data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && requestId) {
      fetchRequest();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, requestId]);

  const handleApprove = async () => {
    if (!request) return;
    
    try {
      setError(null);
      await approveRequest.mutateAsync({
        requestId: request.id,
        data: comment.trim() ? { comment: comment.trim() } : undefined,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to approve request');
    }
  };

  const handleReject = async () => {
    if (!request) return;
    
    if (!comment.trim()) {
      setError('Please provide a reason for rejection');
      return;
    }

    try {
      setError(null);
      await rejectRequest.mutateAsync({
        requestId: request.id,
        data: { comment: comment.trim() },
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reject request');
    }
  };

  if (!isOpen) return null;

  const roleLabel = request?.changeType === 'PARTNER' ? 'Client Partner' : 'Client Manager';
  const isResolved = request && request.status !== 'PENDING' && request.status !== 'PARTIALLY_APPROVED';
  const isPartiallyApproved = request?.status === 'PARTIALLY_APPROVED';
  
  // Determine if current user has already approved (check if either approval field is set)
  const userHasApproved = !!(
    request &&
    ((request.currentEmployeeApprovedById) || (request.proposedEmployeeApprovedById))
  );

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black bg-opacity-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg shadow-corporate-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="px-6 py-4 rounded-t-lg"
          style={{ background: GRADIENTS.primary.horizontal }}
        >
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-white">
                {roleLabel} Change Request
              </h2>
              <p className="text-sm text-white opacity-90 mt-1">
                Review and respond to this change request
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:bg-white hover:bg-opacity-20 p-2 rounded transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2"
              aria-label="Close modal"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {loading && (
            <div className="flex items-center justify-center py-12">
              <LoadingSpinner size="lg" />
            </div>
          )}

          {error && !loading && !request && (
            <div className="p-4 bg-forvis-error-50 border border-forvis-error-200 rounded-lg">
              <div className="flex items-center space-x-3 text-forvis-error-600">
                <AlertCircle className="h-5 w-5 flex-shrink-0" />
                <p className="text-sm font-medium">{error}</p>
              </div>
            </div>
          )}

          {isResolved && !loading && (
            <div className="p-4 bg-forvis-gray-100 border border-forvis-gray-300 rounded-lg">
              <div className="flex items-center space-x-3 text-forvis-gray-700">
                <AlertCircle className="h-5 w-5 flex-shrink-0" />
                <p className="text-sm font-medium">
                  This request has already been {request.status.toLowerCase()}.
                </p>
              </div>
            </div>
          )}

          {request && !isResolved && !loading && (
            <>
              {/* Client Info */}
              <div className="mb-6 pb-6 border-b border-forvis-gray-200">
                <div className="flex items-start space-x-3">
                  <div
                    className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 shadow-sm"
                    style={{ background: GRADIENTS.icon.standard }}
                  >
                    <Building2 className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-forvis-gray-900">
                      {request.Client.clientNameFull || request.Client.clientCode}
                    </h3>
                    <p className="text-sm text-forvis-gray-600">
                      {request.Client.clientCode}
                    </p>
                  </div>
                </div>
              </div>

              {/* Dual Approval Info Banner */}
              {request.requiresDualApproval && request.status === 'PENDING' && (
                <div className="mb-6 p-4 bg-forvis-blue-50 border border-forvis-blue-200 rounded-lg">
                  <div className="flex items-start space-x-3">
                    <AlertCircle className="h-5 w-5 text-forvis-blue-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-forvis-blue-900">
                        Dual Approval Required
                      </p>
                      <p className="text-sm text-forvis-blue-700 mt-1">
                        This request requires approval from both the current and proposed {roleLabel.toLowerCase()}.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Partial Approval Status */}
              {isPartiallyApproved && (
                <div className="mb-6 p-4 bg-forvis-warning-50 border border-forvis-warning-200 rounded-lg">
                  <div className="flex items-start space-x-3">
                    <CheckCircle className="h-5 w-5 text-forvis-warning-600 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-forvis-warning-900">
                        First Approval Received
                      </p>
                      <div className="mt-2 space-y-2">
                        {request.currentEmployeeApprovedAt && (
                          <div className="text-sm text-forvis-warning-700">
                            <span className="font-medium">Current {roleLabel}:</span> Approved by {request.CurrentApprover?.name || 'Unknown'} on {formatDate(request.currentEmployeeApprovedAt)}
                          </div>
                        )}
                        {request.proposedEmployeeApprovedAt && (
                          <div className="text-sm text-forvis-warning-700">
                            <span className="font-medium">Proposed {roleLabel}:</span> Approved by {request.ProposedApprover?.name || 'Unknown'} on {formatDate(request.proposedEmployeeApprovedAt)}
                          </div>
                        )}
                        {!request.currentEmployeeApprovedAt && (
                          <div className="text-sm text-forvis-warning-700">
                            <span className="font-medium">Waiting for:</span> Current {roleLabel} ({request.currentEmployeeName || request.currentEmployeeCode})
                          </div>
                        )}
                        {!request.proposedEmployeeApprovedAt && (
                          <div className="text-sm text-forvis-warning-700">
                            <span className="font-medium">Waiting for:</span> Proposed {roleLabel} ({request.proposedEmployeeName || request.proposedEmployeeCode})
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Request Details */}
              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-forvis-gray-700 mb-2">
                    Current {roleLabel}
                  </label>
                  <div className="text-sm text-forvis-gray-900 bg-forvis-gray-50 px-4 py-3 rounded-lg border border-forvis-gray-200">
                    {request.currentEmployeeName || request.currentEmployeeCode}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-forvis-gray-700 mb-2">
                    Proposed {roleLabel}
                  </label>
                  <div
                    className="text-sm text-white px-4 py-3 rounded-lg font-medium shadow-sm"
                    style={{ background: GRADIENTS.icon.standard }}
                  >
                    <div className="flex items-center space-x-2">
                      <User className="h-4 w-4" />
                      <span>{request.proposedEmployeeName || request.proposedEmployeeCode} (You)</span>
                    </div>
                  </div>
                </div>

                {request.reason && (
                  <div>
                    <label className="block text-sm font-medium text-forvis-gray-700 mb-2">
                      Reason for Change
                    </label>
                    <div className="text-sm text-forvis-gray-900 bg-forvis-gray-50 px-4 py-3 rounded-lg border border-forvis-gray-200">
                      {request.reason}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-forvis-gray-700 mb-2">
                      Requested By
                    </label>
                    <div className="text-sm text-forvis-gray-900">
                      {request.RequestedBy.name || 'Unknown'}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-forvis-gray-700 mb-2">
                      Requested Date
                    </label>
                    <div className="text-sm text-forvis-gray-900 flex items-center space-x-2">
                      <Calendar className="h-4 w-4 text-forvis-gray-600" />
                      <span>{formatDate(request.requestedAt)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Comment Field */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-forvis-gray-700 mb-2">
                  {rejectMode ? 'Reason for Rejection *' : 'Comment (Optional)'}
                </label>
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-3 border border-forvis-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-forvis-blue-500 focus:border-transparent text-sm transition-all duration-200"
                  placeholder={rejectMode ? "Please explain why you're rejecting this request..." : "Add your comment..."}
                />
              </div>

              {/* Error Message */}
              {error && (
                <div className="mb-4 p-3 bg-forvis-error-50 border border-forvis-error-200 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <AlertCircle className="h-4 w-4 text-forvis-error-600 flex-shrink-0" />
                    <p className="text-sm text-forvis-error-600">{error}</p>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex space-x-3">
                {!rejectMode ? (
                  <>
                    <Button
                      onClick={handleApprove}
                      disabled={
                        approveRequest.isPending || 
                        rejectRequest.isPending || 
                        userHasApproved
                      }
                      variant="success"
                      className="flex-1"
                      loading={approveRequest.isPending}
                      icon={userHasApproved || !approveRequest.isPending ? <CheckCircle className="h-5 w-5" /> : undefined}
                    >
                      {userHasApproved 
                        ? 'You Have Approved'
                        : approveRequest.isPending 
                        ? 'Approving...'
                        : isPartiallyApproved 
                        ? 'Final Approval - Apply Change'
                        : 'Approve Request'
                      }
                    </Button>
                    <Button
                      onClick={() => setRejectMode(true)}
                      disabled={approveRequest.isPending || rejectRequest.isPending}
                      variant="danger"
                      className="flex-1"
                      icon={<XCircle className="h-5 w-5" />}
                    >
                      Reject Request
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      onClick={() => {
                        setRejectMode(false);
                        setError(null);
                      }}
                      disabled={approveRequest.isPending || rejectRequest.isPending}
                      variant="secondary"
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleReject}
                      disabled={approveRequest.isPending || rejectRequest.isPending}
                      variant="danger"
                      className="flex-1"
                      loading={rejectRequest.isPending}
                      icon={!rejectRequest.isPending ? <XCircle className="h-5 w-5" /> : undefined}
                    >
                      {rejectRequest.isPending ? 'Rejecting...' : 'Confirm Rejection'}
                    </Button>
                  </>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
