# Add Standard Task Table Migration

## Purpose
Creates the StandardTask table to store standard/template tasks that can be referenced when creating new tasks in the system.

## Changes
- Creates `StandardTask` table with dual-ID structure
- Internal `id` for application relationships (future use)
- External `GSStdTaskID` (GUID) from external system
- `StdTaskCode` for display/search only (not for relationships)
- `ServLineCode` to categorize standard tasks by service line
- Indexes on commonly queried fields for performance

## Table Structure
```sql
StandardTask:
  - id (INT, PK, auto-increment) - Internal ID
  - GSStdTaskID (UNIQUEIDENTIFIER, unique) - External GUID
  - StdTaskCode (NVARCHAR(10)) - Display/search code
  - StdTaskDesc (NVARCHAR(150)) - Description
  - ServLineCode (NVARCHAR(10)) - Service line code
  - createdAt (DATETIME2) - Record creation timestamp
  - updatedAt (DATETIME2) - Record update timestamp
```

## Notes
- No relationships defined at this stage (as per requirements)
- Follows project's dual-ID convention
- Ready for future relationships when needed

















