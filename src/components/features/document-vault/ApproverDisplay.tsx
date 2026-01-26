'use client';

import { CheckCircle, Clock, XCircle, Minus } from 'lucide-react';
import { useState } from 'react';

interface ApproverStep {
  id: number;
  stepOrder: number;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'SKIPPED';
  approvedAt: Date | null;
  comment: string | null;
  User_ApprovalStep_assignedToUserIdToUser: {
    id: string;
    name: string | null;
    email: string;
  } | null;
}

interface ApproverDisplayProps {
  approval: {
    id: number;
    status: string;
    requiresAllSteps: boolean;
    ApprovalStep: ApproverStep[];
  } | null;
  compact?: boolean;
}

/**
 * ApproverDisplay Component
 * Shows avatar stack and approval status for document vault approvals
 */
export function ApproverDisplay({ approval, compact = false }: ApproverDisplayProps) {
  const [showTooltip, setShowTooltip] = useState(false);
  const [showRejectionModal, setShowRejectionModal] = useState(false);
  const [rejectionComment, setRejectionComment] = useState<string>('');

  // Handle no approval case
  if (!approval || !approval.ApprovalStep || approval.ApprovalStep.length === 0) {
    return (
      <span className="text-sm text-forvis-gray-400">
        <Minus className="h-4 w-4 inline" />
      </span>
    );
  }

  const steps = approval.ApprovalStep;
  const approvedCount = steps.filter(step => step.status === 'APPROVED').length;
  const totalCount = steps.length;
  const hasRejection = steps.some(step => step.status === 'REJECTED');
  const rejectedStep = steps.find(step => step.status === 'REJECTED');

  const handleRejectedClick = () => {
    if (rejectedStep && rejectedStep.comment) {
      setRejectionComment(rejectedStep.comment);
      setShowRejectionModal(true);
    }
  };

  // Determine overall status
  let statusBadge;
  if (hasRejection) {
    statusBadge = (
      <span 
        onClick={handleRejectedClick}
        className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 ${
          rejectedStep?.comment ? 'cursor-pointer hover:bg-red-200 transition-colors' : ''
        }`}
        title={rejectedStep?.comment ? 'Click to view rejection reason' : undefined}
      >
        <XCircle className="h-3 w-3" />
        Rejected
      </span>
    );
  } else if (approvedCount === totalCount) {
    statusBadge = (
      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
        <CheckCircle className="h-3 w-3" />
        Approved
      </span>
    );
  } else {
    statusBadge = (
      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
        <Clock className="h-3 w-3" />
        {approvedCount} of {totalCount}
      </span>
    );
  }

  // Get initials from name or email
  const getInitials = (step: ApproverStep) => {
    const user = step.User_ApprovalStep_assignedToUserIdToUser;
    if (!user) return '?';
    
    if (user.name) {
      const parts = user.name.trim().split(' ').filter(p => p.length > 0);
      if (parts.length >= 2) {
        const firstPart = parts[0];
        const lastPart = parts[parts.length - 1];
        if (firstPart && lastPart && firstPart[0] && lastPart[0]) {
          return (firstPart[0] + lastPart[0]).toUpperCase();
        }
      }
      const firstPart = parts[0];
      if (firstPart) {
        if (firstPart.length >= 2) {
          return firstPart.substring(0, 2).toUpperCase();
        }
        return firstPart[0]?.toUpperCase() || '?';
      }
    }
    return user.email.substring(0, 2).toUpperCase();
  };

  // Get display name
  const getDisplayName = (step: ApproverStep) => {
    const user = step.User_ApprovalStep_assignedToUserIdToUser;
    if (!user) return 'Unknown User';
    return user.name || user.email;
  };

  // Format date
  const formatDate = (date: Date | null) => {
    if (!date) return '';
    return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const avatarSize = compact ? 'w-6 h-6 text-xs' : 'w-8 h-8 text-sm';
  const maxVisibleAvatars = 3;
  const visibleSteps = steps.slice(0, maxVisibleAvatars);
  const remainingCount = steps.length - maxVisibleAvatars;

  return (
    <div className="flex items-center gap-2">
      {/* Avatar Stack */}
      <div 
        className="relative flex items-center"
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
      >
        <div className="flex -space-x-2">
          {visibleSteps.map((step, index) => (
            <div
              key={step.id}
              className={`relative ${avatarSize} rounded-full flex items-center justify-center font-medium text-white border-2 border-white shadow-sm`}
              style={{
                background: 'linear-gradient(135deg, #5B93D7 0%, #2E5AAC 100%)',
                zIndex: steps.length - index,
              }}
              title={getDisplayName(step)}
            >
              {getInitials(step)}
              
              {/* Status overlay icon */}
              {step.status === 'APPROVED' && (
                <div className="absolute -bottom-0.5 -right-0.5 bg-green-500 rounded-full p-0.5">
                  <CheckCircle className="h-3 w-3 text-white" />
                </div>
              )}
              {step.status === 'REJECTED' && (
                <div className="absolute -bottom-0.5 -right-0.5 bg-red-500 rounded-full p-0.5">
                  <XCircle className="h-3 w-3 text-white" />
                </div>
              )}
            </div>
          ))}
          
          {remainingCount > 0 && (
            <div
              className={`relative ${avatarSize} rounded-full flex items-center justify-center font-medium text-forvis-gray-600 bg-forvis-gray-200 border-2 border-white shadow-sm`}
              style={{ zIndex: 0 }}
            >
              +{remainingCount}
            </div>
          )}
        </div>

        {/* Tooltip */}
        {showTooltip && (
          <div className="absolute left-0 bottom-full mb-2 z-50 w-64 p-3 bg-white rounded-lg shadow-lg border border-forvis-gray-200">
            <div className="text-xs font-semibold text-forvis-gray-700 mb-2">
              Approvers:
            </div>
            <div className="space-y-1.5">
              {steps.map((step) => (
                <div key={step.id} className="flex items-start gap-2 text-xs">
                  {step.status === 'APPROVED' ? (
                    <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />
                  ) : step.status === 'REJECTED' ? (
                    <XCircle className="h-4 w-4 text-red-600 flex-shrink-0 mt-0.5" />
                  ) : (
                    <Clock className="h-4 w-4 text-yellow-600 flex-shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-forvis-gray-900 truncate">
                      {getDisplayName(step)}
                    </div>
                    <div className="text-forvis-gray-600">
                      {step.status === 'APPROVED' 
                        ? `Approved ${formatDate(step.approvedAt)}`
                        : step.status === 'REJECTED'
                        ? 'Rejected'
                        : step.status === 'PENDING'
                        ? 'Pending'
                        : 'Waiting'}
                    </div>
                    {step.status === 'REJECTED' && step.comment && (
                      <div className="text-forvis-gray-700 mt-1 text-xs bg-red-50 p-1.5 rounded border border-red-200">
                        {step.comment}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Status Badge */}
      {statusBadge}

      {/* Rejection Comment Modal */}
      {showRejectionModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-corporate-lg max-w-md w-full mx-4 p-6">
            <div className="flex items-start gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 bg-red-100">
                <XCircle className="h-5 w-5 text-red-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-forvis-gray-900">Rejection Reason</h3>
                <p className="text-xs text-forvis-gray-600 mt-0.5">
                  Document approval was rejected
                </p>
              </div>
            </div>
            
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
              <p className="text-sm text-forvis-gray-900 whitespace-pre-wrap">{rejectionComment}</p>
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => setShowRejectionModal(false)}
                className="px-4 py-2 bg-forvis-blue-600 text-white rounded-lg hover:bg-forvis-blue-700 transition-colors text-sm font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
