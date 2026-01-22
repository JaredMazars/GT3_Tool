# Migration: Add Task Independence Confirmations

**Date:** 2026-01-22  
**Type:** Schema Addition

## Purpose

Add independence confirmation tracking for task team members. Each team member must confirm they are independent from the client before working on the engagement.

## Changes

### New Table: TaskIndependenceConfirmation

Tracks independence confirmations for team members on tasks.

**Fields:**
- `id` (INT, PK): Auto-increment primary key
- `taskTeamId` (INT, UNIQUE): Reference to TaskTeam.id
- `confirmed` (BIT): Whether independence is confirmed (default: false)
- `confirmedAt` (DATETIME2): Timestamp when confirmed
- `createdAt` (DATETIME2): Record creation timestamp
- `updatedAt` (DATETIME2): Record update timestamp

**Relationships:**
- One-to-one with TaskTeam (cascade delete)

**Indexes:**
- Primary key on `id`
- Unique constraint on `taskTeamId`
- Index on `taskTeamId` for fast lookups
- Index on `confirmed` for filtering

## Business Logic

- Each task team member requires exactly one independence confirmation
- Confirmations are permanent (once confirmed, cannot be reverted by user)
- Confirmations cascade delete when team member is removed from task
- Only the team member themselves can confirm their independence

## Rollback

To rollback this migration:

```sql
DROP TABLE [dbo].[TaskIndependenceConfirmation];
```
