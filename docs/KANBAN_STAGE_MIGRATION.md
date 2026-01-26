# Kanban Stage Migration: DRAFT → ENGAGE

## Problem

Tasks set to stage "ENGAGE" don't appear on the Kanban board.

## Root Cause

There's a mismatch between the database and the application code:

1. **Database**: Tasks were initialized with stage `'DRAFT'` using the `quick_initialize_stages.sql` script
2. **Application**: The current codebase uses `'ENGAGE'` as the initial stage (not `'DRAFT'`)
3. **Result**: The Kanban board API only looks for these stages:
   - `ENGAGE`
   - `IN_PROGRESS`
   - `UNDER_REVIEW`
   - `COMPLETED`
   - `ARCHIVED`

Any tasks with stage `'DRAFT'` are **not included** in the Kanban board query, so they don't appear.

## Solution

Run the migration script to update all `DRAFT` stages to `ENGAGE`:

### Step 1: Diagnose (Optional)
```bash
# Check if you have DRAFT stages in your database
scripts/diagnose-engage-tasks.sql
```

### Step 2: Migrate DRAFT to ENGAGE
```bash
# Run the migration script
scripts/migrate-draft-to-engage.sql
```

This will:
- Show current stage distribution
- Update all `DRAFT` records to `ENGAGE`
- Verify the migration succeeded

### Step 3: Clear Cache

The Kanban board data is cached for 5 minutes. To see changes immediately:

**Option A: Flush Redis (Recommended)**
```bash
redis-cli FLUSHDB
```

**Option B: Restart Application**
```bash
# Restart your Next.js server
npm run dev  # or your production restart command
```

**Option C: Wait**
- Cache will expire naturally in up to 5 minutes

## Verification

After migration and cache clearing:

1. Go to your Kanban board
2. All tasks that were in ENGAGE stage should now appear in the ENGAGE column
3. Run `diagnose-engage-tasks.sql` to verify no DRAFT stages remain

## Files Updated

- ✅ `/scripts/migrate-draft-to-engage.sql` - Migration script
- ✅ `/scripts/diagnose-engage-tasks.sql` - Diagnostic script
- ✅ `/quick_initialize_stages.sql` - Updated to use ENGAGE instead of DRAFT

## Technical Details

### Current Stage Enum
```typescript
// src/types/task-stages.ts
export enum TaskStage {
  ENGAGE = 'ENGAGE',           // ← Initial stage (was DRAFT)
  IN_PROGRESS = 'IN_PROGRESS',
  UNDER_REVIEW = 'UNDER_REVIEW',
  COMPLETED = 'COMPLETED',
  ARCHIVED = 'ARCHIVED',
}
```

### Kanban API Query
```typescript
// src/app/api/tasks/kanban/route.ts
const stages = [
  TaskStage.ENGAGE,          // Must match database records
  TaskStage.IN_PROGRESS,
  TaskStage.UNDER_REVIEW,
  TaskStage.COMPLETED
];
if (includeArchived) stages.push(TaskStage.ARCHIVED);
```

### Default Stage Logic
```sql
-- Tasks without any TaskStage record default to ENGAGE
SELECT t.id, COALESCE(ls.latestStage, 'ENGAGE') as latestStage
FROM Task t
LEFT JOIN LatestStages ls ON t.id = ls.taskId
```

## Prevention

The `quick_initialize_stages.sql` script has been updated to use `ENGAGE` instead of `DRAFT`, so future task initializations will work correctly.

