-- ============================================================================
-- Migration: Optimize BDActivity Indexes
-- ============================================================================
-- Date: 2026-01-25
-- Purpose: Consolidate 9 indexes into 5 covering indexes to improve write
--          performance while maintaining read efficiency
--
-- Current Indexes (9):
--   1. activityType
--   2. assignedTo
--   3. assignedTo, status, dueDate
--   4. contactId
--   5. dueDate
--   6. opportunityId, createdAt DESC
--   7. opportunityId
--   8. status
--
-- New Structure (5):
--   1. idx_bdactivity_assigned_status_due_covering (assignedTo, status, dueDate) + INCLUDE
--   2. idx_bdactivity_opp_created_covering (opportunityId, createdAt DESC) + INCLUDE
--   3. BDActivity_opportunityId_idx (FK - keep)
--   4. BDActivity_contactId_idx (FK - keep)
--
-- Benefits:
--   - 44% reduction in index count (9 → 5)
--   - Covering indexes eliminate key lookups
--   - Better write performance on frequent activity updates
-- ============================================================================

BEGIN TRY

BEGIN TRAN;

PRINT 'Starting BDActivity index optimization...';
PRINT '';

-- ============================================================================
-- STEP 1: Create New Covering Indexes
-- ============================================================================

PRINT '--- Creating new covering indexes ---';

-- Covering index for assigned user activity queries
IF NOT EXISTS (
    SELECT * FROM sys.indexes 
    WHERE name = 'idx_bdactivity_assigned_status_due_covering' 
    AND object_id = OBJECT_ID('dbo.BDActivity')
)
BEGIN
    PRINT 'Creating idx_bdactivity_assigned_status_due_covering...';
    
    CREATE NONCLUSTERED INDEX [idx_bdactivity_assigned_status_due_covering] 
    ON [dbo].[BDActivity]([assignedTo], [status], [dueDate]) 
    INCLUDE (
        [activityType], 
        [completedAt], 
        [subject],
        [opportunityId],
        [createdAt]
    )
    WITH (
        ONLINE = ON,
        SORT_IN_TEMPDB = ON,
        MAXDOP = 0
    );
    
    PRINT '✓ Created idx_bdactivity_assigned_status_due_covering';
END
ELSE
    PRINT '⚠ idx_bdactivity_assigned_status_due_covering already exists';

-- Covering index for opportunity activity history
IF NOT EXISTS (
    SELECT * FROM sys.indexes 
    WHERE name = 'idx_bdactivity_opp_created_covering' 
    AND object_id = OBJECT_ID('dbo.BDActivity')
)
BEGIN
    PRINT 'Creating idx_bdactivity_opp_created_covering...';
    
    CREATE NONCLUSTERED INDEX [idx_bdactivity_opp_created_covering] 
    ON [dbo].[BDActivity]([opportunityId], [createdAt] DESC) 
    INCLUDE (
        [status], 
        [activityType], 
        [dueDate],
        [subject],
        [assignedTo],
        [completedAt]
    )
    WITH (
        ONLINE = ON,
        SORT_IN_TEMPDB = ON,
        MAXDOP = 0
    );
    
    PRINT '✓ Created idx_bdactivity_opp_created_covering';
END
ELSE
    PRINT '⚠ idx_bdactivity_opp_created_covering already exists';

PRINT '';

-- ============================================================================
-- STEP 2: Drop Redundant Indexes
-- ============================================================================

PRINT '--- Dropping redundant indexes ---';

-- Drop single-column assignedTo (covered by compound)
IF EXISTS (SELECT * FROM sys.indexes WHERE name = 'BDActivity_assignedTo_idx' AND object_id = OBJECT_ID('BDActivity'))
BEGIN
    DROP INDEX [BDActivity_assignedTo_idx] ON [dbo].[BDActivity];
    PRINT '✓ Dropped BDActivity_assignedTo_idx';
END
ELSE
    PRINT '⚠ BDActivity_assignedTo_idx not found';

-- Drop old assignedTo, status, dueDate compound (replaced by covering)
IF EXISTS (SELECT * FROM sys.indexes WHERE name = 'BDActivity_assignedTo_status_dueDate_idx' AND object_id = OBJECT_ID('BDActivity'))
BEGIN
    DROP INDEX [BDActivity_assignedTo_status_dueDate_idx] ON [dbo].[BDActivity];
    PRINT '✓ Dropped BDActivity_assignedTo_status_dueDate_idx';
END
ELSE
    PRINT '⚠ BDActivity_assignedTo_status_dueDate_idx not found';

-- Drop single-column status (low selectivity, covered by compound)
IF EXISTS (SELECT * FROM sys.indexes WHERE name = 'BDActivity_status_idx' AND object_id = OBJECT_ID('BDActivity'))
BEGIN
    DROP INDEX [BDActivity_status_idx] ON [dbo].[BDActivity];
    PRINT '✓ Dropped BDActivity_status_idx';
END
ELSE
    PRINT '⚠ BDActivity_status_idx not found';

-- Drop single-column activityType (low selectivity, in INCLUDE)
IF EXISTS (SELECT * FROM sys.indexes WHERE name = 'BDActivity_activityType_idx' AND object_id = OBJECT_ID('BDActivity'))
BEGIN
    DROP INDEX [BDActivity_activityType_idx] ON [dbo].[BDActivity];
    PRINT '✓ Dropped BDActivity_activityType_idx';
END
ELSE
    PRINT '⚠ BDActivity_activityType_idx not found';

-- Drop single-column dueDate (covered by compound)
IF EXISTS (SELECT * FROM sys.indexes WHERE name = 'BDActivity_dueDate_idx' AND object_id = OBJECT_ID('BDActivity'))
BEGIN
    DROP INDEX [BDActivity_dueDate_idx] ON [dbo].[BDActivity];
    PRINT '✓ Dropped BDActivity_dueDate_idx';
END
ELSE
    PRINT '⚠ BDActivity_dueDate_idx not found';

-- Drop old opportunityId, createdAt compound (replaced by covering)
IF EXISTS (SELECT * FROM sys.indexes WHERE name = 'BDActivity_opportunityId_createdAt_idx' AND object_id = OBJECT_ID('BDActivity'))
BEGIN
    DROP INDEX [BDActivity_opportunityId_createdAt_idx] ON [dbo].[BDActivity];
    PRINT '✓ Dropped BDActivity_opportunityId_createdAt_idx';
END
ELSE
    PRINT '⚠ BDActivity_opportunityId_createdAt_idx not found';

PRINT '';

-- ============================================================================
-- STEP 3: Update Statistics
-- ============================================================================

PRINT '--- Updating statistics ---';
UPDATE STATISTICS [dbo].[BDActivity] WITH FULLSCAN;
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
PRINT 'Indexes CREATED (2 covering indexes):';
PRINT '  1. idx_bdactivity_assigned_status_due_covering (assignedTo, status, dueDate + 5 INCLUDE)';
PRINT '  2. idx_bdactivity_opp_created_covering (opportunityId, createdAt DESC + 6 INCLUDE)';
PRINT '';
PRINT 'Indexes DROPPED (6):';
PRINT '  - BDActivity_assignedTo_idx';
PRINT '  - BDActivity_assignedTo_status_dueDate_idx';
PRINT '  - BDActivity_status_idx';
PRINT '  - BDActivity_activityType_idx';
PRINT '  - BDActivity_dueDate_idx';
PRINT '  - BDActivity_opportunityId_createdAt_idx';
PRINT '';
PRINT 'Indexes KEPT:';
PRINT '  - BDActivity_opportunityId_idx (FK constraint)';
PRINT '  - BDActivity_contactId_idx (FK constraint)';
PRINT '';
PRINT 'RESULT: 9 indexes → 4 indexes (56% reduction)';
PRINT '============================================================================';

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;

PRINT '';
PRINT '❌ Error during BDActivity index optimization:';
PRINT ERROR_MESSAGE();
THROW;

END CATCH

GO

-- ============================================================================
-- ROLLBACK SCRIPT (If needed)
-- ============================================================================
/*
-- Restore old indexes if new covering indexes cause issues:
DROP INDEX IF EXISTS [idx_bdactivity_assigned_status_due_covering] ON [dbo].[BDActivity];
DROP INDEX IF EXISTS [idx_bdactivity_opp_created_covering] ON [dbo].[BDActivity];

-- Recreate original indexes
CREATE NONCLUSTERED INDEX [BDActivity_assignedTo_idx] ON [dbo].[BDActivity]([assignedTo]);
CREATE NONCLUSTERED INDEX [BDActivity_assignedTo_status_dueDate_idx] ON [dbo].[BDActivity]([assignedTo], [status], [dueDate]);
CREATE NONCLUSTERED INDEX [BDActivity_status_idx] ON [dbo].[BDActivity]([status]);
CREATE NONCLUSTERED INDEX [BDActivity_activityType_idx] ON [dbo].[BDActivity]([activityType]);
CREATE NONCLUSTERED INDEX [BDActivity_dueDate_idx] ON [dbo].[BDActivity]([dueDate]);
CREATE NONCLUSTERED INDEX [BDActivity_opportunityId_createdAt_idx] ON [dbo].[BDActivity]([opportunityId], [createdAt] DESC);

UPDATE STATISTICS [dbo].[BDActivity] WITH FULLSCAN;
*/
