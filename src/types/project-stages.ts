/**
 * Project Stage Types
 * 
 * Defines the various stages a project can be in throughout its lifecycle.
 */

export enum ProjectStage {
  DRAFT = 'DRAFT',
  IN_PROGRESS = 'IN_PROGRESS',
  UNDER_REVIEW = 'UNDER_REVIEW',
  COMPLETED = 'COMPLETED',
  ARCHIVED = 'ARCHIVED',
}

export type ProjectStageType = ProjectStage;

