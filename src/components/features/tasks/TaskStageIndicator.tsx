'use client';

/**
 * Task Stage Indicator Component
 * 
 * Displays the current stage of a task with appropriate styling.
 * This is a placeholder implementation - future versions will include
 * stage management functionality (dropdown to change stages, etc.)
 */

import { TaskStage } from '@/types/task-stages';
import { formatTaskStage, getTaskStageColor } from '@/lib/utils/taskStages';

interface TaskStageIndicatorProps {
  stage: TaskStage | string;
  className?: string;
}

export function TaskStageIndicator({ stage, className = '' }: TaskStageIndicatorProps) {
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getTaskStageColor(
        stage
      )} ${className}`}
    >
      {formatTaskStage(stage)}
    </span>
  );
}

interface TaskStageIndicatorWithLabelProps {
  stage: TaskStage | string;
  showLabel?: boolean;
  className?: string;
}

export function TaskStageIndicatorWithLabel({
  stage,
  showLabel = true,
  className = '',
}: TaskStageIndicatorWithLabelProps) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {showLabel && <span className="text-sm text-forvis-gray-600 font-medium">Stage:</span>}
      <TaskStageIndicator stage={stage} />
    </div>
  );
}

