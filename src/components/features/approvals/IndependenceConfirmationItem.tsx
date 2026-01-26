'use client';

import { ShieldCheck, Briefcase, Building2, Calendar, Clock } from 'lucide-react';
import { formatDate } from '@/lib/utils/taskUtils';
import { GRADIENTS } from '@/lib/design-system/gradients';
import type { IndependenceConfirmationApproval } from '@/types/approvals';
import { Button } from '@/components/ui';

interface IndependenceConfirmationItemProps {
  confirmation: IndependenceConfirmationApproval;
  onOpenTaskModal: (taskData: {
    taskId: string;
    serviceLine?: string;
    subServiceLineGroup?: string;
    clientId?: string;
    initialTab?: string;
  }) => void;
}

export function IndependenceConfirmationItem({ confirmation, onOpenTaskModal }: IndependenceConfirmationItemProps) {
  return (
    <div
      className="rounded-lg border border-forvis-blue-100 p-4 shadow-sm hover:shadow-md transition-all duration-200"
      style={{ background: GRADIENTS.dashboard.card }}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-3 flex-1">
          {/* Icon */}
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 shadow-sm"
            style={{ background: GRADIENTS.icon.standard }}
          >
            <ShieldCheck className="h-5 w-5 text-white" />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between mb-2">
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-1">
                  <h4 className="text-sm font-semibold text-forvis-gray-900">
                    Independence Confirmation Required
                  </h4>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-forvis-warning-100 text-forvis-warning-800">
                    <Clock className="h-3 w-3 mr-1" />
                    Pending
                  </span>
                </div>
                <div className="flex items-center space-x-2 text-xs text-forvis-gray-600">
                  <Briefcase className="h-3 w-3" />
                  <span className="font-medium">{confirmation.taskCode || confirmation.taskName}</span>
                </div>
              </div>
            </div>

            {/* Task Details */}
            <div className="space-y-1 text-sm text-forvis-gray-700 mb-3">
              <div className="flex items-start">
                <span className="text-forvis-gray-600 mr-2">Task:</span>
                <span className="font-medium">{confirmation.taskName}</span>
              </div>
              <div className="flex items-start">
                <span className="text-forvis-gray-600 mr-2">Client:</span>
                <span className="font-medium">
                  {confirmation.clientName || confirmation.clientCode}
                </span>
              </div>
              <div className="flex items-start">
                <span className="text-forvis-gray-600 mr-2">Your Role:</span>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-forvis-gray-100 text-forvis-gray-800">
                  {confirmation.role}
                </span>
              </div>
            </div>

            {/* Metadata */}
            <div className="flex items-center space-x-4 text-xs text-forvis-gray-600">
              <div className="flex items-center space-x-1">
                <Calendar className="h-3 w-3" />
                <span>Added {formatDate(confirmation.addedAt.toString())}</span>
              </div>
            </div>

            {/* Independence Message */}
            <div className="mt-3 p-3 rounded-lg bg-forvis-warning-50 border border-forvis-warning-200">
              <p className="text-xs text-forvis-warning-900">
                <span className="font-semibold">Action Required:</span> You must confirm your independence 
                from this client before starting work on this engagement.
              </p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="ml-4 flex-shrink-0">
          <Button 
            variant="primary"
            size="sm"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onOpenTaskModal({
                taskId: confirmation.taskId.toString(),
                serviceLine: confirmation.masterCode?.toLowerCase(),
                subServiceLineGroup: confirmation.subServlineGroupCode || undefined,
                clientId: confirmation.clientId.toString(),
                initialTab: 'independence',
              });
            }}
          >
            <ShieldCheck className="h-4 w-4 mr-1.5" />
            View & Confirm
          </Button>
        </div>
      </div>
    </div>
  );
}
