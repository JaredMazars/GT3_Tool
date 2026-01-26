'use client';

import { CheckCircle, Circle, XCircle, UserCheck } from 'lucide-react';
import { formatDate } from '@/lib/utils/taskUtils';
import { GRADIENTS } from '@/lib/design-system/gradients';
import type { ChangeRequestApproval, EngagementAcceptanceApproval, ReviewNoteApproval, VaultDocumentTimelineData } from '@/types/approvals';
import type { ApprovalWithSteps } from '@/types/approval';

interface WorkflowTimelineProps {
  type: 'changeRequest' | 'clientAcceptance' | 'reviewNote' | 'vaultDocument';
  request?: ChangeRequestApproval;
  acceptance?: EngagementAcceptanceApproval;
  note?: ReviewNoteApproval;
  vaultDocument?: VaultDocumentTimelineData;
  approval?: ApprovalWithSteps;
}

interface TimelineStep {
  label: string;
  name: string | null;
  date: Date | null;
  status: 'approved' | 'pending' | 'rejected';
}

export function WorkflowTimeline({ type, request, acceptance, note, vaultDocument, approval }: WorkflowTimelineProps) {
  const getSteps = (): TimelineStep[] => {
    if (type === 'changeRequest' && request) {
      const steps: TimelineStep[] = [
        {
          label: 'Requested',
          name: request.requestedByName,
          date: request.requestedAt,
          status: 'approved',
        },
      ];

      if (request.requiresDualApproval) {
        // Dual approval: Current employee first, then proposed
        steps.push({
          label: `Current ${request.changeType === 'PARTNER' ? 'Partner' : 'Manager'}`,
          name: request.currentEmployeeName || request.currentEmployeeCode,
          date: request.currentEmployeeApprovedAt,
          status: request.currentEmployeeApprovedAt
            ? 'approved'
            : request.status === 'REJECTED'
            ? 'rejected'
            : 'pending',
        });
      }

      steps.push({
        label: `Proposed ${request.changeType === 'PARTNER' ? 'Partner' : 'Manager'}`,
        name: request.proposedEmployeeName || request.proposedEmployeeCode,
        date: request.proposedEmployeeApprovedAt,
        status: request.proposedEmployeeApprovedAt
          ? 'approved'
          : request.status === 'REJECTED'
          ? 'rejected'
          : 'pending',
      });

      return steps;
    }

    if (type === 'clientAcceptance') {
      // Handle centralized approval system (new client-level acceptances)
      if (approval) {
        const steps: TimelineStep[] = [
          {
            label: 'Submitted',
            name: approval.User_Approval_requestedByIdToUser?.name || 'Unknown',
            date: approval.requestedAt,
            status: 'approved',
          },
        ];

        // Add approval steps
        const approvalSteps = approval.ApprovalStep
          .sort((a, b) => a.stepOrder - b.stepOrder)
          .map((step, index) => {
            // Type assertion needed as ApprovalStep from ApprovalWithSteps may include user relations
            const stepWithUsers = step as any;
            const assignedToName = stepWithUsers.User_ApprovalStep_assignedToUserIdToUser?.name || 'Unassigned';
            const label = approval.ApprovalStep.length === 1 
              ? 'Partner Review'
              : `Partner Review ${index + 1}`;
            
            return {
              label,
              name: assignedToName,
              date: step.approvedAt,
              status: step.status === 'APPROVED' 
                ? 'approved' as const
                : step.status === 'REJECTED' 
                ? 'rejected' as const
                : 'pending' as const,
            };
          });

        steps.push(...approvalSteps);
        return steps;
      }
      
      // Handle legacy engagement-level acceptance (backwards compatibility)
      if (acceptance) {
        return [
          {
            label: 'Completed',
            name: acceptance.completedBy,
            date: acceptance.completedAt,
            status: 'approved',
          },
          {
            label: 'Partner Review',
            name: acceptance.reviewedBy || 'Pending Assignment',
            date: acceptance.reviewedAt,
            status: acceptance.reviewedAt ? 'approved' : 'pending',
          },
        ];
      }
    }

    if (type === 'reviewNote' && note) {
      const steps: TimelineStep[] = [
        {
          label: 'Raised',
          name: note.raisedByName,
          date: note.createdAt,
          status: 'approved',
        },
      ];

      if (note.assignedTo) {
        steps.push({
          label: 'Assigned',
          name: note.assignedToName,
          date: note.assignedTo ? note.createdAt : null,
          status: note.status === 'ADDRESSED' || note.status === 'CLEARED' ? 'approved' : 'pending',
        });
      }

      if (note.clearedAt || note.rejectedAt) {
        steps.push({
          label: note.clearedAt ? 'Cleared' : 'Rejected',
          name: note.clearedByName || note.raisedByName,
          date: note.clearedAt || note.rejectedAt,
          status: note.clearedAt ? 'approved' : 'rejected',
        });
      }

      return steps;
    }

    if (type === 'vaultDocument' && vaultDocument) {
      const steps: TimelineStep[] = [
        {
          label: 'Submitted',
          name: vaultDocument.requestedByName,
          date: vaultDocument.requestedAt,
          status: 'approved',
        },
      ];

      // Add approval steps
      const approvalSteps = vaultDocument.ApprovalStep
        .sort((a, b) => a.stepOrder - b.stepOrder)
        .map((step) => ({
          label: `Approver ${step.stepOrder}`,
          name: step.User_ApprovalStep_assignedToUserIdToUser?.name || 'Unassigned',
          date: step.approvedAt,
          status: step.status === 'APPROVED' 
            ? 'approved' as const
            : step.status === 'REJECTED' 
            ? 'rejected' as const
            : 'pending' as const,
        }));

      steps.push(...approvalSteps);

      return steps;
    }

    return [];
  };

  const steps = getSteps();

  if (steps.length === 0) {
    return null;
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-forvis-success-500 border-forvis-success-500';
      case 'rejected':
        return 'bg-forvis-error-500 border-forvis-error-500';
      case 'pending':
      default:
        return 'bg-white border-forvis-gray-300';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return CheckCircle;
      case 'rejected':
        return XCircle;
      case 'pending':
      default:
        return Circle;
    }
  };

  const getLineColor = (currentIndex: number) => {
    const currentStep = steps[currentIndex];
    const nextStep = steps[currentIndex + 1];
    
    if (!currentStep || !nextStep) return '';

    // If current is approved and next is approved, line is success green
    if (currentStep.status === 'approved' && nextStep.status === 'approved') {
      return 'bg-forvis-success-500';
    }
    
    // If current is approved and next is rejected, line is error red
    if (currentStep.status === 'approved' && nextStep.status === 'rejected') {
      return 'bg-forvis-error-500';
    }
    
    // Otherwise, line is gray (pending)
    return 'bg-forvis-gray-300';
  };

  return (
    <div
      className="mt-3 px-4 py-3 rounded-lg"
      style={{ background: GRADIENTS.dashboard.card }}
    >
      <div className="flex items-center justify-between">
        {steps.map((step, index) => {
          const Icon = getStatusIcon(step.status);
          const showLine = index < steps.length - 1;

          return (
            <div key={index} className="flex items-center flex-1">
              {/* Step */}
              <div className="flex flex-col items-center">
                {/* Circle */}
                <div
                  className={`w-8 h-8 rounded-full border-2 flex items-center justify-center shadow-sm transition-all duration-200 ${getStatusColor(
                    step.status
                  )}`}
                >
                  <Icon
                    className={`h-4 w-4 ${
                      step.status === 'pending'
                        ? 'text-forvis-gray-400'
                        : 'text-white'
                    }`}
                  />
                </div>

                {/* Label and Details */}
                <div className="mt-2 text-center" style={{ maxWidth: '120px' }}>
                  <p className="text-xs font-medium text-forvis-gray-600 truncate">
                    {step.label}
                  </p>
                  {step.name && (
                    <p className="text-xs font-semibold text-forvis-gray-900 truncate mt-0.5">
                      {step.name}
                    </p>
                  )}
                  {step.date && (
                    <p className="text-xs text-forvis-gray-500 mt-0.5">
                      {formatDate(step.date.toString())}
                    </p>
                  )}
                  {!step.date && step.status === 'pending' && (
                    <p className="text-xs text-forvis-gray-400 italic mt-0.5">
                      Pending
                    </p>
                  )}
                </div>
              </div>

              {/* Connecting Line */}
              {showLine && (
                <div
                  className={`h-0.5 flex-1 mx-2 transition-all duration-200 ${getLineColor(
                    index
                  )}`}
                  style={{ minWidth: '20px' }}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
