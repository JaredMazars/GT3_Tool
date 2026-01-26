'use client';

import { MessageSquare, Briefcase, Building2, Calendar, AlertCircle, Eye } from 'lucide-react';
import { formatDate } from '@/lib/utils/taskUtils';
import { GRADIENTS } from '@/lib/design-system/gradients';
import type { ReviewNoteApproval } from '@/types/approvals';
import { Button } from '@/components/ui';
import { WorkflowTimeline } from './WorkflowTimeline';

interface ReviewNoteApprovalItemProps {
  note: ReviewNoteApproval;
  onOpenTaskModal?: (taskData: {
    taskId: string;
    serviceLine?: string;
    subServiceLineGroup?: string;
    clientId?: string;
    noteId?: number;
  }) => void;
  showArchived?: boolean;
}

export function ReviewNoteApprovalItem({ note, onOpenTaskModal, showArchived = false }: ReviewNoteApprovalItemProps) {
  const getButtonConfig = () => {
    if (showArchived) {
      return {
        text: 'View',
        variant: 'secondary' as const,
        icon: Eye,
      };
    }
    return {
      text: 'View & Action',
      variant: 'gradient' as const,
      icon: null,
    };
  };

  const buttonConfig = getButtonConfig();
  const ButtonIcon = buttonConfig.icon;

  const getStatusColor = (status: string) => {
    switch (status.toUpperCase()) {
      case 'OPEN':
        return 'bg-forvis-blue-100 text-forvis-blue-800';
      case 'IN_PROGRESS':
        return 'bg-forvis-warning-100 text-forvis-warning-800';
      case 'ADDRESSED':
        return 'bg-forvis-success-100 text-forvis-success-800';
      case 'CLEARED':
        return 'bg-forvis-gray-100 text-forvis-gray-800';
      case 'REJECTED':
        return 'bg-forvis-error-100 text-forvis-error-800';
      default:
        return 'bg-forvis-gray-100 text-forvis-gray-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority.toUpperCase()) {
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

  const formatStatus = (status: string) => {
    return status
      .split('_')
      .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
      .join(' ');
  };

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
            <MessageSquare className="h-5 w-5 text-white" />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between mb-2">
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-1">
                  <h4 className="text-sm font-semibold text-forvis-gray-900">{note.title}</h4>
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(note.status)}`}
                  >
                    {formatStatus(note.status)}
                  </span>
                </div>
                <div className="flex items-center space-x-2 text-xs text-forvis-gray-600">
                  <Briefcase className="h-3 w-3" />
                  <span className="font-medium">{note.taskCode || note.taskName}</span>
                </div>
              </div>
            </div>

            {/* Description */}
            {note.description && (
              <p className="text-sm text-forvis-gray-700 mb-2 line-clamp-2">{note.description}</p>
            )}

            {/* Task Details */}
            <div className="space-y-1 text-sm text-forvis-gray-700 mb-3">
              <div className="flex items-start">
                <span className="text-forvis-gray-600 mr-2">Task:</span>
                <span className="font-medium">{note.taskName}</span>
              </div>
              <div className="flex items-center space-x-2">
                <AlertCircle className={`h-3 w-3 ${getPriorityColor(note.priority)}`} />
                <span className={`font-medium ${getPriorityColor(note.priority)}`}>
                  {note.priority} Priority
                </span>
                {note.dueDate && (
                  <>
                    <span className="text-forvis-gray-400">•</span>
                    <span className="text-forvis-gray-600">
                      Due: {formatDate(note.dueDate.toString())}
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* Metadata */}
            <div className="flex items-center space-x-4 text-xs text-forvis-gray-600">
              <div className="flex items-center space-x-1">
                <span>
                  {note.actionRequired === 'ASSIGNEE' ? 'Assigned to you' : 'Raised by you'}
                </span>
              </div>
              <div className="flex items-center space-x-1">
                <Calendar className="h-3 w-3" />
                <span>Updated {formatDate(note.updatedAt.toString())}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="ml-4 flex-shrink-0">
          <Button 
            variant={buttonConfig.variant}
            size="sm"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (onOpenTaskModal) {
                onOpenTaskModal({
                  taskId: note.taskId.toString(),
                  serviceLine: note.masterCode?.toLowerCase(),
                  subServiceLineGroup: note.subServlineGroupCode || undefined,
                  clientId: note.clientGSID,
                  noteId: note.id,
                });
              }
            }}
          >
            {ButtonIcon && <ButtonIcon className="h-4 w-4 mr-1.5" />}
            {buttonConfig.text}
          </Button>
        </div>
      </div>

      {/* Workflow Timeline */}
      <WorkflowTimeline type="reviewNote" note={note} />
    </div>
  );
}
