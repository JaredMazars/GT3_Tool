-- ============================================================================
-- Migration: Optimize BugReport Indexes
-- ============================================================================
-- Date: 2026-01-25
-- Purpose: Consolidate 4 indexes into 2 covering indexes to improve write
--          performance while maintaining read efficiency
--
-- Current Indexes (4):
--   1. priority
--   2. reportedAt DESC
--   3. reportedBy
--   4. status
--
-- New Structure (2):
--   1. idx_bugreport_status_priority_covering (status, priority, reportedAt DESC) + INCLUDE
--   2. BugReport_reportedBy_idx (FK - keep for user lookups)
--
-- Benefits:
--   - 50% reduction in index count (4 → 2)
--   - Covering index eliminates key lookups for listing queries
--   - Better write performance on status/priority updates
-- ============================================================================

BEGIN TRY

BEGIN TRAN;

PRINT 'Starting BugReport index optimization...';
PRINT '';

-- ============================================================================
-- STEP 1: Create New Covering Index
-- ============================================================================

PRINT '--- Creating new covering index ---';

-- Covering index for bug report listing and filtering
IF NOT EXISTS (
    SELECT * FROM sys.indexes 
    WHERE name = 'idx_bugreport_status_priority_covering' 
    AND object_id = OBJECT_ID('dbo.BugReport')
)
BEGIN
    PRINT 'Creating idx_bugreport_status_priority_covering...';
    
    CREATE NONCLUSTERED INDEX [idx_bugreport_status_priority_covering] 
    ON [dbo].[BugReport]([status], [priority], [reportedAt] DESC) 
    INCLUDE (
        [reportedBy], 
        [url],
        [resolvedAt],
        [resolvedBy]
    )
    WITH (
        ONLINE = ON,
        SORT_IN_TEMPDB = ON,
        MAXDOP = 0
    );
    
    PRINT '✓ Created idx_bugreport_status_priority_covering';
END
ELSE
    PRINT '⚠ idx_bugreport_status_priority_covering already exists';

PRINT '';

-- ============================================================================
-- STEP 2: Drop Redundant Indexes
-- ============================================================================

PRINT '--- Dropping redundant indexes ---';

-- Drop single-column status (leftmost of compound)
IF EXISTS (SELECT * FROM sys.indexes WHERE name = 'BugReport_status_idx' AND object_id = OBJECT_ID('BugReport'))
BEGIN
    DROP INDEX [BugReport_status_idx] ON [dbo].[BugReport];
    PRINT '✓ Dropped BugReport_status_idx';
END
ELSE
    PRINT '⚠ BugReport_status_idx not found';

-- Drop single-column priority (second column of compound)
IF EXISTS (SELECT * FROM sys.indexes WHERE name = 'BugReport_priority_idx' AND object_id = OBJECT_ID('BugReport'))
BEGIN
    DROP INDEX [BugReport_priority_idx] ON [dbo].[BugReport];
    PRINT '✓ Dropped BugReport_priority_idx';
END
ELSE
    PRINT '⚠ BugReport_priority_idx not found';

-- Drop reportedAt (third column of compound)
IF EXISTS (SELECT * FROM sys.indexes WHERE name = 'BugReport_reportedAt_idx' AND object_id = OBJECT_ID('BugReport'))
BEGIN
    DROP INDEX [BugReport_reportedAt_idx] ON [dbo].[BugReport];
    PRINT '✓ Dropped BugReport_reportedAt_idx';
END
ELSE
    PRINT '⚠ BugReport_reportedAt_idx not found';

PRINT '';

-- ============================================================================
-- STEP 3: Update Statistics
-- ============================================================================

PRINT '--- Updating statistics ---';
UPDATE STATISTICS [dbo].[BugReport] WITH FULLSCAN;
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
PRINT 'Indexes CREATED (1 covering index):';
PRINT '  1. idx_bugreport_status_priority_covering (status, priority, reportedAt DESC + 4 INCLUDE)';
PRINT '';
PRINT 'Indexes DROPPED (3):';
PRINT '  - BugReport_status_idx';
PRINT '  - BugReport_priority_idx';
PRINT '  - BugReport_reportedAt_idx';
PRINT '';
PRINT 'Indexes KEPT:';
PRINT '  - BugReport_reportedBy_idx (FK constraint, user lookups)';
PRINT '';
PRINT 'RESULT: 4 indexes → 2 indexes (50% reduction)';
PRINT '============================================================================';

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;

PRINT '';
PRINT '❌ Error during BugReport index optimization:';
PRINT ERROR_MESSAGE();
THROW;

END CATCH

GO

-- ============================================================================
-- ROLLBACK SCRIPT (If needed)
-- ============================================================================
/*
-- Restore old indexes if new covering index causes issues:
DROP INDEX IF EXISTS [idx_bugreport_status_priority_covering] ON [dbo].[BugReport];

-- Recreate original indexes
CREATE NONCLUSTERED INDEX [BugReport_status_idx] ON [dbo].[BugReport]([status]);
CREATE NONCLUSTERED INDEX [BugReport_priority_idx] ON [dbo].[BugReport]([priority]);
CREATE NONCLUSTERED INDEX [BugReport_reportedAt_idx] ON [dbo].[BugReport]([reportedAt] DESC);

UPDATE STATISTICS [dbo].[BugReport] WITH FULLSCAN;
*/
