/**
 * Project Stage Utility Functions
 * 
 * Helper functions for working with project stages.
 */

import { ProjectStage } from '@/types/project-stages';

/**
 * Format project stage for display
 */
export function formatProjectStage(stage: ProjectStage | string): string {
  const stageMap: Record<ProjectStage, string> = {
    [ProjectStage.DRAFT]: 'Draft',
    [ProjectStage.IN_PROGRESS]: 'In Progress',
    [ProjectStage.UNDER_REVIEW]: 'Under Review',
    [ProjectStage.COMPLETED]: 'Completed',
    [ProjectStage.ARCHIVED]: 'Archived',
  };

  return stageMap[stage as ProjectStage] || stage;
}

/**
 * Get color classes for project stage badge
 */
export function getProjectStageColor(stage: ProjectStage | string): string {
  const colorMap: Record<ProjectStage, string> = {
    [ProjectStage.DRAFT]: 'bg-gray-100 text-gray-700 border-gray-300',
    [ProjectStage.IN_PROGRESS]: 'bg-blue-100 text-blue-700 border-blue-300',
    [ProjectStage.UNDER_REVIEW]: 'bg-yellow-100 text-yellow-700 border-yellow-300',
    [ProjectStage.COMPLETED]: 'bg-green-100 text-green-700 border-green-300',
    [ProjectStage.ARCHIVED]: 'bg-forvis-gray-100 text-forvis-gray-600 border-forvis-gray-300',
  };

  return colorMap[stage as ProjectStage] || 'bg-gray-100 text-gray-700 border-gray-300';
}

/**
 * Get all project stages
 */
export function getAllProjectStages(): ProjectStage[] {
  return Object.values(ProjectStage);
}

/**
 * Get default project stage
 */
export function getDefaultProjectStage(): ProjectStage {
  return ProjectStage.DRAFT;
}

