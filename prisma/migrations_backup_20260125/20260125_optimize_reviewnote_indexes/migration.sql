-- ============================================================================
-- Migration: Optimize ReviewNote Indexes
-- ============================================================================
-- Date: 2026-01-25
-- Purpose: Consolidate 12 indexes into 6 covering indexes to improve write
--          performance while maintaining read efficiency
--
-- Current Indexes (12):
--   1. assignedTo
--   2. assignedTo, status
--   3. categoryId
--   4. createdAt DESC
--   5. currentOwner
--   6. dueDate
--   7. priority
--   8. raisedBy
--   9. status
--  10. taskId
--  11. taskId, status
--
-- New Structure (6):
--   1. idx_reviewnote_assigned_status_covering (assignedTo, status) + INCLUDE
--   2. idx_reviewnote_task_status_covering (taskId, status) + INCLUDE
--   3. idx_reviewnote_created_covering (createdAt DESC) + INCLUDE
--   4. ReviewNote_taskId_idx (FK - keep for simple lookups)
--   5. ReviewNote_categoryId_idx (FK - keep)
--   6. ReviewNote_dueDate_idx (date range queries - keep)
--
-- Benefits:
--   - 50% reduction in index count (12 → 6)
--   - Covering indexes eliminate key lookups
--   - Better write performance on frequent status transitions
-- ============================================================================

BEGIN TRY

BEGIN TRAN;

PRINT 'Starting ReviewNote index optimization...';
PRINT '';

-- ============================================================================
-- STEP 1: Create New Covering Indexes
-- ============================================================================

PRINT '--- Creating new covering indexes ---';

-- Covering index for assigned user review note queries
IF NOT EXISTS (
    SELECT * FROM sys.indexes 
    WHERE name = 'idx_reviewnote_assigned_status_covering' 
    AND object_id = OBJECT_ID('dbo.ReviewNote')
)
BEGIN
    PRINT 'Creating idx_reviewnote_assigned_status_covering...';
    
    CREATE NONCLUSTERED INDEX [idx_reviewnote_assigned_status_covering] 
    ON [dbo].[ReviewNote]([assignedTo], [status]) 
    INCLUDE (
        [priority], 
        [dueDate], 
        [taskId],
        [categoryId],
        [currentOwner],
        [title],
        [createdAt]
    )
    WITH (
        ONLINE = ON,
        SORT_IN_TEMPDB = ON,
        MAXDOP = 0
    );
    
    PRINT '✓ Created idx_reviewnote_assigned_status_covering';
END
ELSE
    PRINT '⚠ idx_reviewnote_assigned_status_covering already exists';

-- Covering index for task review notes listing
IF NOT EXISTS (
    SELECT * FROM sys.indexes 
    WHERE name = 'idx_reviewnote_task_status_covering' 
    AND object_id = OBJECT_ID('dbo.ReviewNote')
)
BEGIN
    PRINT 'Creating idx_reviewnote_task_status_covering...';
    
    CREATE NONCLUSTERED INDEX [idx_reviewnote_task_status_covering] 
    ON [dbo].[ReviewNote]([taskId], [status]) 
    INCLUDE (
        [priority], 
        [assignedTo], 
        [dueDate],
        [categoryId],
        [title],
        [raisedBy],
        [createdAt]
    )
    WITH (
        ONLINE = ON,
        SORT_IN_TEMPDB = ON,
        MAXDOP = 0
    );
    
    PRINT '✓ Created idx_reviewnote_task_status_covering';
END
ELSE
    PRINT '⚠ idx_reviewnote_task_status_covering already exists';

-- Covering index for timeline/recent queries
IF NOT EXISTS (
    SELECT * FROM sys.indexes 
    WHERE name = 'idx_reviewnote_created_covering' 
    AND object_id = OBJECT_ID('dbo.ReviewNote')
)
BEGIN
    PRINT 'Creating idx_reviewnote_created_covering...';
    
    CREATE NONCLUSTERED INDEX [idx_reviewnote_created_covering] 
    ON [dbo].[ReviewNote]([createdAt] DESC) 
    INCLUDE (
        [status], 
        [priority], 
        [taskId],
        [assignedTo],
        [title]
    )
    WITH (
        ONLINE = ON,
        SORT_IN_TEMPDB = ON,
        MAXDOP = 0
    );
    
    PRINT '✓ Created idx_reviewnote_created_covering';
END
ELSE
    PRINT '⚠ idx_reviewnote_created_covering already exists';

PRINT '';

-- ============================================================================
-- STEP 2: Drop Redundant Indexes
-- ============================================================================

PRINT '--- Dropping redundant indexes ---';

-- Drop single-column assignedTo (covered by compound)
IF EXISTS (SELECT * FROM sys.indexes WHERE name = 'ReviewNote_assignedTo_idx' AND object_id = OBJECT_ID('ReviewNote'))
BEGIN
    DROP INDEX [ReviewNote_assignedTo_idx] ON [dbo].[ReviewNote];
    PRINT '✓ Dropped ReviewNote_assignedTo_idx';
END
ELSE
    PRINT '⚠ ReviewNote_assignedTo_idx not found';

-- Drop old assignedTo, status compound (replaced by covering)
IF EXISTS (SELECT * FROM sys.indexes WHERE name = 'ReviewNote_assignedTo_status_idx' AND object_id = OBJECT_ID('ReviewNote'))
BEGIN
    DROP INDEX [ReviewNote_assignedTo_status_idx] ON [dbo].[ReviewNote];
    PRINT '✓ Dropped ReviewNote_assignedTo_status_idx';
END
ELSE
    PRINT '⚠ ReviewNote_assignedTo_status_idx not found';

-- Drop single-column status (low selectivity, covered by compounds)
IF EXISTS (SELECT * FROM sys.indexes WHERE name = 'ReviewNote_status_idx' AND object_id = OBJECT_ID('ReviewNote'))
BEGIN
    DROP INDEX [ReviewNote_status_idx] ON [dbo].[ReviewNote];
    PRINT '✓ Dropped ReviewNote_status_idx';
END
ELSE
    PRINT '⚠ ReviewNote_status_idx not found';

-- Drop single-column priority (low selectivity, in INCLUDE)
IF EXISTS (SELECT * FROM sys.indexes WHERE name = 'ReviewNote_priority_idx' AND object_id = OBJECT_ID('ReviewNote'))
BEGIN
    DROP INDEX [ReviewNote_priority_idx] ON [dbo].[ReviewNote];
    PRINT '✓ Dropped ReviewNote_priority_idx';
END
ELSE
    PRINT '⚠ ReviewNote_priority_idx not found';

-- Drop single-column currentOwner (same as assignedTo pattern)
IF EXISTS (SELECT * FROM sys.indexes WHERE name = 'ReviewNote_currentOwner_idx' AND object_id = OBJECT_ID('ReviewNote'))
BEGIN
    DROP INDEX [ReviewNote_currentOwner_idx] ON [dbo].[ReviewNote];
    PRINT '✓ Dropped ReviewNote_currentOwner_idx';
END
ELSE
    PRINT '⚠ ReviewNote_currentOwner_idx not found';

-- Drop single-column raisedBy (infrequent query pattern)
IF EXISTS (SELECT * FROM sys.indexes WHERE name = 'ReviewNote_raisedBy_idx' AND object_id = OBJECT_ID('ReviewNote'))
BEGIN
    DROP INDEX [ReviewNote_raisedBy_idx] ON [dbo].[ReviewNote];
    PRINT '✓ Dropped ReviewNote_raisedBy_idx';
END
ELSE
    PRINT '⚠ ReviewNote_raisedBy_idx not found';

-- Drop old taskId, status compound (replaced by covering)
IF EXISTS (SELECT * FROM sys.indexes WHERE name = 'ReviewNote_taskId_status_idx' AND object_id = OBJECT_ID('ReviewNote'))
BEGIN
    DROP INDEX [ReviewNote_taskId_status_idx] ON [dbo].[ReviewNote];
    PRINT '✓ Dropped ReviewNote_taskId_status_idx';
END
ELSE
    PRINT '⚠ ReviewNote_taskId_status_idx not found';

-- Drop old createdAt index (replaced by covering)
IF EXISTS (SELECT * FROM sys.indexes WHERE name = 'ReviewNote_createdAt_idx' AND object_id = OBJECT_ID('ReviewNote'))
BEGIN
    DROP INDEX [ReviewNote_createdAt_idx] ON [dbo].[ReviewNote];
    PRINT '✓ Dropped ReviewNote_createdAt_idx';
END
ELSE
    PRINT '⚠ ReviewNote_createdAt_idx not found';

PRINT '';

-- ============================================================================
-- STEP 3: Update Statistics
-- ============================================================================

PRINT '--- Updating statistics ---';
UPDATE STATISTICS [dbo].[ReviewNote] WITH FULLSCAN;
PRINT '✓ Statistics updated';
PRINT '';

COMMIT TRAN;

-- ============================================================================
-- Summary
-- ============================================================================

PRINT '============================================================================';
PRINT 'Migration completed successfully';
PRINT '============================================================================';
PRINT '';
PRINT 'Indexes CREATED (3 covering indexes):';
PRINT '  1. idx_reviewnote_assigned_status_covering (assignedTo, status + 7 INCLUDE)';
PRINT '  2. idx_reviewnote_task_status_covering (taskId, status + 7 INCLUDE)';
PRINT '  3. idx_reviewnote_created_covering (createdAt DESC + 5 INCLUDE)';
PRINT '';
PRINT 'Indexes DROPPED (8):';
PRINT '  - ReviewNote_assignedTo_idx';
PRINT '  - ReviewNote_assignedTo_status_idx';
PRINT '  - ReviewNote_status_idx';
PRINT '  - ReviewNote_priority_idx';
PRINT '  - ReviewNote_currentOwner_idx';
PRINT '  - ReviewNote_raisedBy_idx';
PRINT '  - ReviewNote_taskId_status_idx';
PRINT '  - ReviewNote_createdAt_idx';
PRINT '';
PRINT 'Indexes KEPT:';
PRINT '  - ReviewNote_taskId_idx (FK constraint, simple lookups)';
PRINT '  - ReviewNote_categoryId_idx (FK constraint)';
PRINT '  - ReviewNote_dueDate_idx (date range queries)';
PRINT '';
PRINT 'RESULT: 12 indexes → 6 indexes (50% reduction)';
PRINT '============================================================================';

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;

PRINT '';
PRINT '❌ Error during ReviewNote index optimization:';
PRINT ERROR_MESSAGE();
THROW;

END CATCH

GO

-- ============================================================================
-- ROLLBACK SCRIPT (If needed)
-- ============================================================================
/*
-- Restore old indexes if new covering indexes cause issues:
DROP INDEX IF EXISTS [idx_reviewnote_assigned_status_covering] ON [dbo].[ReviewNote];
DROP INDEX IF EXISTS [idx_reviewnote_task_status_covering] ON [dbo].[ReviewNote];
DROP INDEX IF EXISTS [idx_reviewnote_created_covering] ON [dbo].[ReviewNote];

-- Recreate original indexes
CREATE NONCLUSTERED INDEX [ReviewNote_assignedTo_idx] ON [dbo].[ReviewNote]([assignedTo]);
CREATE NONCLUSTERED INDEX [ReviewNote_assignedTo_status_idx] ON [dbo].[ReviewNote]([assignedTo], [status]);
CREATE NONCLUSTERED INDEX [ReviewNote_status_idx] ON [dbo].[ReviewNote]([status]);
CREATE NONCLUSTERED INDEX [ReviewNote_priority_idx] ON [dbo].[ReviewNote]([priority]);
CREATE NONCLUSTERED INDEX [ReviewNote_currentOwner_idx] ON [dbo].[ReviewNote]([currentOwner]);
CREATE NONCLUSTERED INDEX [ReviewNote_raisedBy_idx] ON [dbo].[ReviewNote]([raisedBy]);
CREATE NONCLUSTERED INDEX [ReviewNote_taskId_status_idx] ON [dbo].[ReviewNote]([taskId], [status]);
CREATE NONCLUSTERED INDEX [ReviewNote_createdAt_idx] ON [dbo].[ReviewNote]([createdAt] DESC);

UPDATE STATISTICS [dbo].[ReviewNote] WITH FULLSCAN;
*/
