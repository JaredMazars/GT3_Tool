'use client';

import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { KanbanColumnProps } from './types';
import { KanbanCard } from './KanbanCard';
import { KanbanMetrics } from './KanbanMetrics';
import { formatTaskStage, getTaskStageColor } from '@/lib/utils/taskStages';
import { hasServiceLineRole } from '@/lib/utils/roleHierarchy';

export function KanbanColumn({
  column,
  isCollapsed,
  onToggleCollapse,
  canDrag,
  myTasksOnly,
  displayMode,
  onTaskClick,
}: KanbanColumnProps) {
  const { setNodeRef } = useDroppable({
    id: column.stage,
  });

  // Get color based on stage
  const getStageGradient = (stage: string) => {
    switch (stage) {
      case 'ENGAGE':
        return 'linear-gradient(135deg, #9CA3AF 0%, #6B7280 100%)';
      case 'IN_PROGRESS':
        return 'linear-gradient(135deg, #5B93D7 0%, #2E5AAC 100%)';
      case 'UNDER_REVIEW':
        return 'linear-gradient(135deg, #D9CBA8 0%, #B0A488 100%)';
      case 'COMPLETED':
        return 'linear-gradient(135deg, #10B981 0%, #059669 100%)';
      case 'ARCHIVED':
        return 'linear-gradient(135deg, #D1D5DB 0%, #9CA3AF 100%)';
      default:
        return 'linear-gradient(135deg, #5B93D7 0%, #2E5AAC 100%)';
    }
  };

  const taskIds = column.tasks.map(task => task.id.toString());
  const isArchiveColumn = column.stage === 'ARCHIVED';

  return (
    <div className="flex-1 min-w-0 flex flex-col">
      {/* Column Header */}
      <div
        className="rounded-t-lg p-4 shadow-corporate-md mb-2 cursor-pointer transition-all duration-200 hover:shadow-lg"
        style={{ background: getStageGradient(column.stage) }}
        onClick={onToggleCollapse}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            {isCollapsed ? (
              <ChevronRight className="h-5 w-5 text-white flex-shrink-0" />
            ) : (
              <ChevronDown className="h-5 w-5 text-white flex-shrink-0" />
            )}
            <h3 className="text-lg font-semibold text-white truncate">
              {formatTaskStage(column.stage)}
            </h3>
          </div>
        </div>

        {!isCollapsed && <KanbanMetrics metrics={column.metrics} />}
      </div>

      {/* Column Content */}
      {!isCollapsed && (
        <div
          ref={setNodeRef}
          className="flex-1 bg-forvis-gray-50 rounded-b-lg p-2 min-h-[200px] max-h-[calc(100vh-350px)] overflow-y-auto"
          style={{ scrollBehavior: 'smooth' }}
        >
          <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
            <div className="space-y-2 pb-2">
              {column.tasks.length === 0 ? (
                <div className="text-center py-8 text-forvis-gray-500 text-sm">
                  No tasks in this stage
                </div>
              ) : (
                column.tasks.map(task => {
                  // Calculate per-task drag permission
                  const taskCanDrag = Boolean(canDrag && (() => {
                    // In My Tasks view, allow drag if user is involved with the task
                    if (myTasksOnly && task.isUserInvolved) {
                      return true;
                    }
                    // Otherwise, require SUPERVISOR role or higher
                    return task.userRole && hasServiceLineRole(task.userRole, 'SUPERVISOR');
                  })());

                  return (
                    <KanbanCard
                      key={task.id}
                      task={task}
                      displayMode={displayMode}
                      canDrag={taskCanDrag}
                      onClick={() => onTaskClick?.(task.id)}
                    />
                  );
                })
              )}
            </div>
          </SortableContext>
        </div>
      )}

      {/* Collapsed State - just show count */}
      {isCollapsed && (
        <div className="bg-forvis-gray-50 rounded-b-lg p-2">
          <div className="text-center text-sm text-forvis-gray-600">
            {column.metrics.count} {column.metrics.count === 1 ? 'task' : 'tasks'}
          </div>
        </div>
      )}
    </div>
  );
}







