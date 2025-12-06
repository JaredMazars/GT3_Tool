/**
 * Task Stage Types
 * 
 * Defines the various stages a task can be in throughout its lifecycle.
 */

export enum TaskStage {
  DRAFT = 'DRAFT',
  IN_PROGRESS = 'IN_PROGRESS',
  UNDER_REVIEW = 'UNDER_REVIEW',
  COMPLETED = 'COMPLETED',
  ARCHIVED = 'ARCHIVED',
}

export type TaskStageType = TaskStage;





