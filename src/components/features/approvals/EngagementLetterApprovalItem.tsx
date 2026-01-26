'use client';

import { FileText, Briefcase, Building2, Calendar } from 'lucide-react';
import { formatDate } from '@/lib/utils/taskUtils';
import { GRADIENTS } from '@/lib/design-system/gradients';
import type { EngagementLetterApproval } from '@/types/approvals';
import { Button } from '@/components/ui';

interface EngagementLetterApprovalItemProps {
  letter: EngagementLetterApproval;
  onOpenTaskModal?: (taskData: {
    taskId: string;
    serviceLine?: string;
    subServiceLineGroup?: string;
    clientId?: string;
  }) => void;
}

export function EngagementLetterApprovalItem({ letter, onOpenTaskModal }: EngagementLetterApprovalItemProps) {

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
            <FileText className="h-5 w-5 text-white" />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between mb-2">
              <div className="flex-1">
                <h4 className="text-sm font-semibold text-forvis-gray-900">
                  Engagement Letter Approval
                </h4>
                <div className="flex items-center space-x-2 mt-1 text-xs text-forvis-gray-600">
                  <Briefcase className="h-3 w-3" />
                  <span className="font-medium">{letter.taskCode || letter.taskName}</span>
                </div>
              </div>
            </div>

            {/* Task and Client Details */}
            <div className="space-y-1 text-sm text-forvis-gray-700 mb-3">
              <div className="flex items-start">
                <span className="text-forvis-gray-600 mr-2">Task:</span>
                <span className="font-medium">{letter.taskName}</span>
              </div>
              <div className="flex items-center space-x-2">
                <Building2 className="h-3 w-3 text-forvis-gray-600" />
                <span className="font-medium">{letter.clientCode}</span>
                <span className="text-forvis-gray-400">•</span>
                <span>{letter.clientName || 'Unknown Client'}</span>
              </div>
            </div>

            {/* Metadata */}
            <div className="flex items-center space-x-4 text-xs text-forvis-gray-600">
              <div className="flex items-center space-x-1">
                <span>Uploaded by {letter.engagementLetterUploadedBy || 'Unknown'}</span>
              </div>
              <div className="flex items-center space-x-1">
                <Calendar className="h-3 w-3" />
                <span>{formatDate(letter.engagementLetterUploadedAt.toString())}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="ml-4">
          <Button 
            variant="gradient" 
            size="sm"
            onClick={() => {
              if (onOpenTaskModal) {
                onOpenTaskModal({
                  taskId: letter.taskId.toString(),
                  serviceLine: letter.masterCode?.toLowerCase(),
                  subServiceLineGroup: letter.subServlineGroupCode || undefined,
                  clientId: letter.clientGSID,
                });
              }
            }}
          >
            Review & Approve
          </Button>
        </div>
      </div>
    </div>
  );
}
