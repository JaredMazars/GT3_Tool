# Add Task Stages

This migration adds the `TaskStage` table to track task workflow stages with full history.

## Changes

- Creates `TaskStage` table with the following fields:
  - `id`: Primary key
  - `taskId`: Foreign key to Task table
  - `stage`: Stage name (DRAFT, IN_PROGRESS, UNDER_REVIEW, COMPLETED, ARCHIVED)
  - `movedBy`: User ID who moved the task to this stage
  - `notes`: Optional notes about the stage transition
  - `createdAt`: Timestamp of the stage change

- Adds indexes for efficient querying:
  - Composite index on (taskId, createdAt DESC) for retrieving stage history
  - Index on stage for filtering by stage
  - Composite index on (taskId, stage) for checking current stage

## Purpose

The TaskStage table enables:
- Full history tracking of task workflow stages
- Analytics on task flow and bottlenecks
- Audit trail of who moved tasks between stages
- Support for Kanban board view

## Notes

- Existing tasks will need to be initialized with a default stage (DRAFT) in a separate data migration
- Stage transitions can include optional notes for context
- Cascade delete ensures stage history is removed when tasks are deleted



















