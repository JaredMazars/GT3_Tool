'use client';

import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Users, Calendar, Folder } from 'lucide-react';
import { KanbanCardProps } from './types';
import { formatDate } from '@/lib/utils/taskUtils';
import { TaskWorkflowStatus } from '@/components/features/tasks/TaskWorkflowStatus';
import { EmployeeStatusBadge } from '@/components/shared/EmployeeStatusBadge';

// Memoized to prevent re-renders when sibling cards change
export const KanbanCard = React.memo(function KanbanCard({ task, displayMode, canDrag, onClick }: KanbanCardProps) {
  const isArchived = task.stage === 'ARCHIVED';
  
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: task.id.toString(),
    disabled: !canDrag || isArchived, // Disable drag for archived tasks
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: isDragging ? 'none' : transition, // Disable transition during drag for immediate feedback
    opacity: isDragging ? 0.5 : 1,
  };

  const handleClick = (e: React.MouseEvent) => {
    if (!isDragging && onClick) {
      onClick();
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={handleClick}
      className={`bg-white rounded-lg shadow-corporate transition-shadow duration-200 ${
        displayMode === 'compact' ? 'p-1.5' : 'p-3'
      } ${
        isArchived ? 'border border-forvis-gray-400 opacity-70' : 'border border-forvis-gray-200'
      } ${
        canDrag && !isArchived ? 'cursor-move hover:shadow-corporate-md' : 'cursor-pointer hover:shadow-corporate-md'
      } ${isDragging ? 'z-50' : ''}`}
    >
      {/* Header with Task Code, Client, and Date in top right */}
      <div className={`flex items-start justify-between ${displayMode === 'compact' ? 'mb-0.5' : 'mb-2'}`}>
        <div className="flex items-center gap-1.5 min-w-0 flex-1">
          <div className={`rounded flex items-center justify-center flex-shrink-0 bg-forvis-blue-100 ${
            displayMode === 'compact' ? 'w-5 h-5' : 'w-8 h-8'
          }`}>
            <Folder className={`text-forvis-blue-600 ${displayMode === 'compact' ? 'h-2.5 w-2.5' : 'h-4 w-4'}`} />
          </div>
          <div className="min-w-0 flex-1">
            <div className={`font-semibold text-forvis-blue-600 truncate ${
              displayMode === 'compact' ? 'text-[9px]' : 'text-xs'
            }`}>
              {task.code}
            </div>
            {task.client && (
              <div className={`text-forvis-gray-600 truncate ${
                displayMode === 'compact' ? 'text-[9px]' : 'text-xs'
              }`}>
                {task.client.name} {task.client.code && `(${task.client.code})`}
              </div>
            )}
          </div>
        </div>
        
        {/* Date in top right corner */}
        <div className={`text-forvis-gray-500 flex-shrink-0 ${
          displayMode === 'compact' ? 'text-[8px]' : 'text-[9px]'
        }`}>
          {formatDate(task.dateOpen)}
        </div>
      </div>

      {/* Task Name */}
      <h4 className={`font-medium text-forvis-gray-900 ${
        displayMode === 'compact' ? 'text-[10px] mb-0.5 line-clamp-1' : 'text-sm mb-2 line-clamp-2'
      }`}>
        {task.name}
      </h4>

      {/* A&C, EL, and DPA Status Indicators */}
      <div className={displayMode === 'compact' ? 'mb-0.5' : 'mb-2'}>
        <TaskWorkflowStatus
          acceptanceApproved={task.acceptanceApproved}
          engagementLetterUploaded={task.engagementLetterUploaded}
          dpaUploaded={task.dpaUploaded}
          isClientTask={task.isClientTask}
          displayMode={displayMode}
        />
      </div>

      {/* Partner & Manager */}
      {displayMode === 'detailed' ? (
        <div className="space-y-1 mb-3">
          {task.partner && (
            <div className="flex items-center gap-1 text-xs text-forvis-gray-600">
              <span className="font-medium">Partner:</span>
              <EmployeeStatusBadge
                name={task.partner}
                isActive={task.partnerStatus?.isActive}
                hasUserAccount={task.partnerStatus?.hasUserAccount}
                variant="text"
                iconSize="sm"
              />
            </div>
          )}
          {task.manager && (
            <div className="flex items-center gap-1 text-xs text-forvis-gray-600">
              <span className="font-medium">Manager:</span>
              <EmployeeStatusBadge
                name={task.manager}
                isActive={task.managerStatus?.isActive}
                hasUserAccount={task.managerStatus?.hasUserAccount}
                variant="text"
                iconSize="sm"
              />
            </div>
          )}
        </div>
      ) : (
        /* Compact mode - single line with abbreviations */
        (task.partner || task.manager) && (
          <div className="text-[9px] text-forvis-gray-600 truncate mb-0.5 flex items-center">
            {task.partner && (
              <span className="flex items-center gap-0.5">
                P:
                <EmployeeStatusBadge
                  name={task.partner}
                  isActive={task.partnerStatus?.isActive}
                  hasUserAccount={task.partnerStatus?.hasUserAccount}
                  variant="icon-only"
                  iconSize="sm"
                />
              </span>
            )}
            {task.partner && task.manager && <span className="mx-1">|</span>}
            {task.manager && (
              <span className="flex items-center gap-0.5">
                M:
                <EmployeeStatusBadge
                  name={task.manager}
                  isActive={task.managerStatus?.isActive}
                  hasUserAccount={task.managerStatus?.hasUserAccount}
                  variant="icon-only"
                  iconSize="sm"
                />
              </span>
            )}
          </div>
        )
      )}

      {/* Team Members - moved to where dates were */}
      {task.team.length > 0 && (
        <div className={`flex items-center gap-1.5 ${displayMode === 'compact' ? 'mb-0' : task.wip?.netWip !== undefined ? 'mb-2' : 'mb-0'}`}>
          <Users className={`text-forvis-gray-500 flex-shrink-0 ${
            displayMode === 'compact' ? 'h-2.5 w-2.5' : 'h-3 w-3'
          }`} />
          <div className="flex items-center -space-x-1.5">
            {task.team.slice(0, displayMode === 'compact' ? 2 : 5).map((member, idx) => (
              <EmployeeStatusBadge
                key={member.userId}
                name={(member.name || member.email).charAt(0).toUpperCase()}
                isActive={member.employeeStatus?.isActive ?? false}
                hasUserAccount={member.employeeStatus?.hasUserAccount ?? false}
                role={member.role}
                variant="kanban"
                iconSize="sm"
                className={`rounded-full flex items-center justify-center font-medium text-white border-2 ${
                  displayMode === 'compact' ? 'w-4 h-4 text-[8px]' : 'w-6 h-6 text-xs'
                }`}
                style={{
                  zIndex: task.team.length - idx,
                }}
              >
                {(member.name || member.email).charAt(0).toUpperCase()}
              </EmployeeStatusBadge>
            ))}
            {task.team.length > (displayMode === 'compact' ? 2 : 5) && (
              <div
                className={`rounded-full flex items-center justify-center font-medium bg-forvis-gray-300 text-forvis-gray-700 border-2 border-white ${
                  displayMode === 'compact' ? 'w-4 h-4 text-[8px]' : 'w-6 h-6 text-xs'
                }`}
                title={`+${task.team.length - (displayMode === 'compact' ? 2 : 5)} more`}
              >
                +{task.team.length - (displayMode === 'compact' ? 2 : 5)}
              </div>
            )}
          </div>
        </div>
      )}

      {/* WIP Balance - Only shown in My Tasks view (when wip property exists, even if 0) */}
      {task.wip !== undefined && task.wip !== null && (
        <div 
          className={`rounded border border-forvis-blue-100 ${
            displayMode === 'compact' ? 'mt-1 px-1.5 py-1' : 'mt-2 px-2 py-1.5'
          }`}
          style={{ background: 'linear-gradient(135deg, #F0F7FD 0%, #E0EDFB 100%)' }}
        >
          <div className="flex items-center justify-between">
            <span className={`font-medium text-forvis-gray-600 uppercase tracking-wider ${
              displayMode === 'compact' ? 'text-[8px]' : 'text-[9px]'
            }`}>
              WIP Balance
            </span>
            <span className={`font-semibold text-forvis-blue-600 ${
              displayMode === 'compact' ? 'text-[9px]' : 'text-xs'
            }`}>
              {new Intl.NumberFormat('en-ZA', {
                style: 'currency',
                currency: 'ZAR',
                minimumFractionDigits: 0,
                maximumFractionDigits: 0,
              }).format(task.wip.netWip ?? 0)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}, (prevProps, nextProps) => {
  // Custom comparison: only re-render if these props actually changed
  return (
    prevProps.task.id === nextProps.task.id &&
    prevProps.task.updatedAt === nextProps.task.updatedAt &&
    prevProps.displayMode === nextProps.displayMode &&
    prevProps.canDrag === nextProps.canDrag &&
    // Deep comparison of WIP data if it exists
    (prevProps.task.wip?.netWip ?? 0) === (nextProps.task.wip?.netWip ?? 0) &&
    // Comparison of A&C, EL, and DPA status
    prevProps.task.acceptanceApproved === nextProps.task.acceptanceApproved &&
    prevProps.task.engagementLetterUploaded === nextProps.task.engagementLetterUploaded &&
    prevProps.task.dpaUploaded === nextProps.task.dpaUploaded &&
    prevProps.task.isClientTask === nextProps.task.isClientTask
  );
});




