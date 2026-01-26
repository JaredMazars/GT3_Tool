# Migration: Allow Multiple Task Allocations Per User

This migration enables users to have multiple allocation periods on the same task with different date ranges.

## Changes

- Removed `@@unique([taskId, userId])` constraint from TaskTeam table
- Allows multiple TaskTeam records for the same user-task combination
- Each allocation period is identified by its unique `id` field

## Business Rules (Enforced in Application Layer)

1. **No Overlapping Periods**: User cannot have overlapping date ranges on the same task
2. **Role Consistency**: All allocations for a user on a task must have the same role
3. **Sequential Allocations**: Allocations can have gaps (e.g., Jan-Feb, then Apr-May)
4. **Legacy Support**: Existing allocations without date ranges remain valid (representing ongoing assignments)

## Validation Logic

- `src/lib/validation/taskAllocation.ts` - Overlap and role validation
- API endpoints validate before create/update operations
- Database indexes support efficient date range queries

## Impact

- Existing data: No changes required, remains valid
- New allocations: Can specify date ranges for time-bound assignments
- UI: Timeline and calendar views support multiple periods per user

## Rollback

To rollback this migration:

```sql
-- Remove duplicate allocations (keep most recent)
WITH RankedAllocations AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY taskId, userId ORDER BY createdAt DESC) as rn
  FROM TaskTeam
)
DELETE FROM TaskTeam WHERE id IN (
  SELECT id FROM RankedAllocations WHERE rn > 1
);

-- Recreate unique constraint
ALTER TABLE [dbo].[TaskTeam] ADD CONSTRAINT [TaskTeam_taskId_userId_key] UNIQUE ([taskId], [userId]);
```

Note: Rollback will delete all but the most recent allocation for each user-task pair.














