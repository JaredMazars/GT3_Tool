# Add Review Note Workflow Fields Migration

## Overview
This migration adds automatic workflow tracking to the Review Note system, enabling:
- Multiple assignees per review note
- Automatic status updates based on who responds
- Tracking of current note owner

## Changes

### ReviewNote Table
- Added `currentOwner` (NVARCHAR(450), nullable) - tracks whose turn it is
- Added `lastRespondedBy` (NVARCHAR(450), nullable) - tracks last person to respond  
- Added `lastRespondedAt` (DATETIME2, nullable) - tracks when last response occurred
- Added foreign key constraints for new user references
- Added index on `currentOwner` for performance

### New ReviewNoteAssignee Table
- `id` - Primary key
- `reviewNoteId` - Foreign key to ReviewNote
- `userId` - Foreign key to User (the assignee)
- `assignedAt` - When assignment occurred
- `assignedBy` - User who made the assignment
- `isForwarded` - Whether this was a forward vs initial assignment
- Unique constraint on (reviewNoteId, userId) to prevent duplicates
- Indexes on reviewNoteId, userId, and assignedBy

## Data Migration
1. Existing `assignedTo` values are migrated to ReviewNoteAssignee table
2. `assignedBy` is set to the note originator (`raisedBy`) for existing assignments
3. `currentOwner` is set based on existing status:
   - ADDRESSED status → currentOwner = raisedBy (sits with originator)
   - Other statuses → currentOwner = NULL (sits with all assignees)

## Backward Compatibility
- The `assignedTo` field is kept for backward compatibility
- Existing code will continue to work during transition period
- New code should use ReviewNoteAssignee table for assignments

## Rollback
To rollback this migration:
1. Drop ReviewNoteAssignee table
2. Drop foreign key constraints for new fields
3. Remove currentOwner, lastRespondedBy, lastRespondedAt columns from ReviewNote




