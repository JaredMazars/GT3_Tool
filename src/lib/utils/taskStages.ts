/**
 * Task Stage Utility Functions
 * 
 * Helper functions for working with task stages.
 */

import { TaskStage } from '@/types/task-stages';

/**
 * Format task stage for display
 */
export function formatTaskStage(stage: TaskStage | string): string {
  const stageMap: Record<TaskStage, string> = {
    [TaskStage.DRAFT]: 'Draft',
    [TaskStage.IN_PROGRESS]: 'In Progress',
    [TaskStage.UNDER_REVIEW]: 'Under Review',
    [TaskStage.COMPLETED]: 'Completed',
    [TaskStage.ARCHIVED]: 'Archived',
  };

  return stageMap[stage as TaskStage] || stage;
}

/**
 * Get color classes for task stage badge
 */
export function getTaskStageColor(stage: TaskStage | string): string {
  const colorMap: Record<TaskStage, string> = {
    [TaskStage.DRAFT]: 'bg-gray-100 text-gray-700 border-gray-300',
    [TaskStage.IN_PROGRESS]: 'bg-blue-100 text-blue-700 border-blue-300',
    [TaskStage.UNDER_REVIEW]: 'bg-yellow-100 text-yellow-700 border-yellow-300',
    [TaskStage.COMPLETED]: 'bg-green-100 text-green-700 border-green-300',
    [TaskStage.ARCHIVED]: 'bg-forvis-gray-100 text-forvis-gray-600 border-forvis-gray-300',
  };

  return colorMap[stage as TaskStage] || 'bg-gray-100 text-gray-700 border-gray-300';
}

/**
 * Get all task stages
 */
export function getAllTaskStages(): TaskStage[] {
  return Object.values(TaskStage);
}

/**
 * Get default task stage
 */
export function getDefaultTaskStage(): TaskStage {
  return TaskStage.DRAFT;
}





