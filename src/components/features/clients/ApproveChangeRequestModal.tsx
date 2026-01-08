'use client';

import { useState, useEffect } from 'react';
import { CheckCircle, XCircle, Building2, X, User, Calendar, AlertCircle } from 'lucide-react';
import { LoadingSpinner } from '@/components/ui';
import { useApproveChangeRequest, useRejectChangeRequest } from '@/hooks/clients/useChangeRequests';
import { formatDate } from '@/lib/utils/taskUtils';

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
  RequestedBy: {
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

  useEffect(() => {
    if (isOpen && requestId) {
      fetchRequest();
    }
  }, [isOpen, requestId]);

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
  const isResolved = request && request.status !== 'PENDING';

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
          style={{ background: 'linear-gradient(to right, #2E5AAC, #25488A)' }}
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
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center space-x-3 text-red-600">
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
                    style={{ background: 'linear-gradient(135deg, #5B93D7 0%, #2E5AAC 100%)' }}
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
                    style={{ background: 'linear-gradient(135deg, #5B93D7 0%, #2E5AAC 100%)' }}
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
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0" />
                    <p className="text-sm text-red-600">{error}</p>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex space-x-3">
                {!rejectMode ? (
                  <>
                    <button
                      onClick={handleApprove}
                      disabled={approveRequest.isPending || rejectRequest.isPending}
                      className="flex-1 flex items-center justify-center px-4 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                    >
                      {approveRequest.isPending ? (
                        <>
                          <LoadingSpinner size="sm" className="mr-2" />
                          Approving...
                        </>
                      ) : (
                        <>
                          <CheckCircle className="h-5 w-5 mr-2" />
                          Approve Request
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => setRejectMode(true)}
                      disabled={approveRequest.isPending || rejectRequest.isPending}
                      className="flex-1 flex items-center justify-center px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                    >
                      <XCircle className="h-5 w-5 mr-2" />
                      Reject Request
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => {
                        setRejectMode(false);
                        setError(null);
                      }}
                      disabled={approveRequest.isPending || rejectRequest.isPending}
                      className="flex-1 px-4 py-3 bg-forvis-gray-200 hover:bg-forvis-gray-300 text-forvis-gray-700 rounded-lg font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-forvis-gray-400 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleReject}
                      disabled={approveRequest.isPending || rejectRequest.isPending}
                      className="flex-1 flex items-center justify-center px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                    >
                      {rejectRequest.isPending ? (
                        <>
                          <LoadingSpinner size="sm" className="mr-2" />
                          Rejecting...
                        </>
                      ) : (
                        <>
                          <XCircle className="h-5 w-5 mr-2" />
                          Confirm Rejection
                        </>
                      )}
                    </button>
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
