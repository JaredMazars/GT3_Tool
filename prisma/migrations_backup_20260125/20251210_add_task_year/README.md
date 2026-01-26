# Add Task Year Field Migration

## Overview
This migration adds a `taskYear` field to the Task table to track the applicable year for each task.

## Changes Made

### 1. Schema Changes
- Added `taskYear INT NOT NULL` to Task table
- Added index on `taskYear` for efficient filtering and querying

### 2. Data Migration
- Existing tasks have `taskYear` populated from `YEAR(TaskDateOpen)`
- New tasks must provide `taskYear` during creation

## Usage in Application

### Creating Tasks
Tasks must now include a `taskYear` field:
```typescript
const task = await prisma.task.create({
  data: {
    taskYear: 2025,
    // ... other fields
  }
});
```

### Querying by Year
```typescript
const tasksForYear = await prisma.task.findMany({
  where: { taskYear: 2025 }
});
```

## Rollback
To rollback this migration:
```sql
DROP INDEX [Task_taskYear_idx] ON [dbo].[Task];
ALTER TABLE [dbo].[Task] DROP COLUMN [taskYear];
```

## Notes
- The year field is required and must be provided for all new tasks
- Valid year range in the UI: current year - 10 to current year + 1
- The field is stored as INT for efficient indexing and querying

























