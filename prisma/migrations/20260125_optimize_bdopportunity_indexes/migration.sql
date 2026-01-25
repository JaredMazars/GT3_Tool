-- ============================================================================
-- Migration: Optimize BDOpportunity Indexes
-- ============================================================================
-- Date: 2026-01-25
-- Purpose: Consolidate 12 indexes into 6 covering indexes to improve write
--          performance while maintaining read efficiency
--
-- Current Indexes (12):
--   1. assignedTo
--   2. assignedTo, status
--   3. clientId
--   4. convertedToClientId
--   5. createdAt DESC
--   6. expectedCloseDate
--   7. serviceLine
--   8. serviceLine, status
--   9. stageId
--  10. status
--  11. updatedAt DESC
--
-- New Structure (6):
--   1. idx_bdopp_assigned_status_covering (assignedTo, status) + INCLUDE
--   2. idx_bdopp_serviceline_status_covering (serviceLine, status) + INCLUDE
--   3. idx_bdopp_created_covering (createdAt DESC) + INCLUDE
--   4. idx_bdopp_updated_covering (updatedAt DESC) + INCLUDE
--   5. BDOpportunity_clientId_idx (FK - keep)
--   6. BDOpportunity_stageId_idx (FK - keep)
--   7. BDOpportunity_expectedCloseDate_idx (date range - keep)
--
-- Benefits:
--   - 50% reduction in index count (12 → 6-7)
--   - Covering indexes eliminate key lookups
--   - Better write performance on frequent status/assignment updates
-- ============================================================================

BEGIN TRY

BEGIN TRAN;

PRINT 'Starting BDOpportunity index optimization...';
PRINT '';

-- ============================================================================
-- STEP 1: Create New Covering Indexes
-- ============================================================================

PRINT '--- Creating new covering indexes ---';

-- Covering index for assignedTo + status queries
IF NOT EXISTS (
    SELECT * FROM sys.indexes 
    WHERE name = 'idx_bdopp_assigned_status_covering' 
    AND object_id = OBJECT_ID('dbo.BDOpportunity')
)
BEGIN
    PRINT 'Creating idx_bdopp_assigned_status_covering...';
    
    CREATE NONCLUSTERED INDEX [idx_bdopp_assigned_status_covering] 
    ON [dbo].[BDOpportunity]([assignedTo], [status]) 
    INCLUDE (
        [createdAt], 
        [updatedAt], 
        [serviceLine],
        [title],
        [value],
        [stageId]
    )
    WITH (
        ONLINE = ON,
        SORT_IN_TEMPDB = ON,
        MAXDOP = 0
    );
    
    PRINT '✓ Created idx_bdopp_assigned_status_covering';
END
ELSE
    PRINT '⚠ idx_bdopp_assigned_status_covering already exists';

-- Covering index for serviceLine + status queries
IF NOT EXISTS (
    SELECT * FROM sys.indexes 
    WHERE name = 'idx_bdopp_serviceline_status_covering' 
    AND object_id = OBJECT_ID('dbo.BDOpportunity')
)
BEGIN
    PRINT 'Creating idx_bdopp_serviceline_status_covering...';
    
    CREATE NONCLUSTERED INDEX [idx_bdopp_serviceline_status_covering] 
    ON [dbo].[BDOpportunity]([serviceLine], [status]) 
    INCLUDE (
        [assignedTo], 
        [expectedCloseDate], 
        [value],
        [title],
        [stageId],
        [createdAt]
    )
    WITH (
        ONLINE = ON,
        SORT_IN_TEMPDB = ON,
        MAXDOP = 0
    );
    
    PRINT '✓ Created idx_bdopp_serviceline_status_covering';
END
ELSE
    PRINT '⚠ idx_bdopp_serviceline_status_covering already exists';

-- Covering index for recent opportunities (createdAt DESC)
IF NOT EXISTS (
    SELECT * FROM sys.indexes 
    WHERE name = 'idx_bdopp_created_covering' 
    AND object_id = OBJECT_ID('dbo.BDOpportunity')
)
BEGIN
    PRINT 'Creating idx_bdopp_created_covering...';
    
    CREATE NONCLUSTERED INDEX [idx_bdopp_created_covering] 
    ON [dbo].[BDOpportunity]([createdAt] DESC) 
    INCLUDE (
        [status], 
        [assignedTo], 
        [serviceLine],
        [title],
        [value]
    )
    WITH (
        ONLINE = ON,
        SORT_IN_TEMPDB = ON,
        MAXDOP = 0
    );
    
    PRINT '✓ Created idx_bdopp_created_covering';
END
ELSE
    PRINT '⚠ idx_bdopp_created_covering already exists';

-- Covering index for activity tracking (updatedAt DESC)
IF NOT EXISTS (
    SELECT * FROM sys.indexes 
    WHERE name = 'idx_bdopp_updated_covering' 
    AND object_id = OBJECT_ID('dbo.BDOpportunity')
)
BEGIN
    PRINT 'Creating idx_bdopp_updated_covering...';
    
    CREATE NONCLUSTERED INDEX [idx_bdopp_updated_covering] 
    ON [dbo].[BDOpportunity]([updatedAt] DESC) 
    INCLUDE (
        [status], 
        [assignedTo],
        [title],
        [serviceLine]
    )
    WITH (
        ONLINE = ON,
        SORT_IN_TEMPDB = ON,
        MAXDOP = 0
    );
    
    PRINT '✓ Created idx_bdopp_updated_covering';
END
ELSE
    PRINT '⚠ idx_bdopp_updated_covering already exists';

PRINT '';

-- ============================================================================
-- STEP 2: Drop Redundant Indexes
-- ============================================================================

PRINT '--- Dropping redundant indexes ---';

-- Drop single-column assignedTo (covered by compound)
IF EXISTS (SELECT * FROM sys.indexes WHERE name = 'BDOpportunity_assignedTo_idx' AND object_id = OBJECT_ID('BDOpportunity'))
BEGIN
    DROP INDEX [BDOpportunity_assignedTo_idx] ON [dbo].[BDOpportunity];
    PRINT '✓ Dropped BDOpportunity_assignedTo_idx';
END
ELSE
    PRINT '⚠ BDOpportunity_assignedTo_idx not found';

-- Drop old assignedTo, status compound (replaced by covering)
IF EXISTS (SELECT * FROM sys.indexes WHERE name = 'BDOpportunity_assignedTo_status_idx' AND object_id = OBJECT_ID('BDOpportunity'))
BEGIN
    DROP INDEX [BDOpportunity_assignedTo_status_idx] ON [dbo].[BDOpportunity];
    PRINT '✓ Dropped BDOpportunity_assignedTo_status_idx';
END
ELSE
    PRINT '⚠ BDOpportunity_assignedTo_status_idx not found';

-- Drop single-column serviceLine (covered by compound)
IF EXISTS (SELECT * FROM sys.indexes WHERE name = 'BDOpportunity_serviceLine_idx' AND object_id = OBJECT_ID('BDOpportunity'))
BEGIN
    DROP INDEX [BDOpportunity_serviceLine_idx] ON [dbo].[BDOpportunity];
    PRINT '✓ Dropped BDOpportunity_serviceLine_idx';
END
ELSE
    PRINT '⚠ BDOpportunity_serviceLine_idx not found';

-- Drop old serviceLine, status compound (replaced by covering)
IF EXISTS (SELECT * FROM sys.indexes WHERE name = 'BDOpportunity_serviceLine_status_idx' AND object_id = OBJECT_ID('BDOpportunity'))
BEGIN
    DROP INDEX [BDOpportunity_serviceLine_status_idx] ON [dbo].[BDOpportunity];
    PRINT '✓ Dropped BDOpportunity_serviceLine_status_idx';
END
ELSE
    PRINT '⚠ BDOpportunity_serviceLine_status_idx not found';

-- Drop single-column status (low selectivity, covered by compounds)
IF EXISTS (SELECT * FROM sys.indexes WHERE name = 'BDOpportunity_status_idx' AND object_id = OBJECT_ID('BDOpportunity'))
BEGIN
    DROP INDEX [BDOpportunity_status_idx] ON [dbo].[BDOpportunity];
    PRINT '✓ Dropped BDOpportunity_status_idx';
END
ELSE
    PRINT '⚠ BDOpportunity_status_idx not found';

-- Drop convertedToClientId (rarely queried)
IF EXISTS (SELECT * FROM sys.indexes WHERE name = 'BDOpportunity_convertedToClientId_idx' AND object_id = OBJECT_ID('BDOpportunity'))
BEGIN
    DROP INDEX [BDOpportunity_convertedToClientId_idx] ON [dbo].[BDOpportunity];
    PRINT '✓ Dropped BDOpportunity_convertedToClientId_idx';
END
ELSE
    PRINT '⚠ BDOpportunity_convertedToClientId_idx not found';

-- Drop old createdAt index (replaced by covering)
IF EXISTS (SELECT * FROM sys.indexes WHERE name = 'BDOpportunity_createdAt_idx' AND object_id = OBJECT_ID('BDOpportunity'))
BEGIN
    DROP INDEX [BDOpportunity_createdAt_idx] ON [dbo].[BDOpportunity];
    PRINT '✓ Dropped BDOpportunity_createdAt_idx';
END
ELSE
    PRINT '⚠ BDOpportunity_createdAt_idx not found';

-- Drop old updatedAt index (replaced by covering)
IF EXISTS (SELECT * FROM sys.indexes WHERE name = 'BDOpportunity_updatedAt_idx' AND object_id = OBJECT_ID('BDOpportunity'))
BEGIN
    DROP INDEX [BDOpportunity_updatedAt_idx] ON [dbo].[BDOpportunity];
    PRINT '✓ Dropped BDOpportunity_updatedAt_idx';
END
ELSE
    PRINT '⚠ BDOpportunity_updatedAt_idx not found';

PRINT '';

-- ============================================================================
-- STEP 3: Update Statistics
-- ============================================================================

PRINT '--- Updating statistics ---';
UPDATE STATISTICS [dbo].[BDOpportunity] WITH FULLSCAN;
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
PRINT 'Indexes CREATED (4 covering indexes):';
PRINT '  1. idx_bdopp_assigned_status_covering (assignedTo, status + 6 INCLUDE)';
PRINT '  2. idx_bdopp_serviceline_status_covering (serviceLine, status + 6 INCLUDE)';
PRINT '  3. idx_bdopp_created_covering (createdAt DESC + 5 INCLUDE)';
PRINT '  4. idx_bdopp_updated_covering (updatedAt DESC + 4 INCLUDE)';
PRINT '';
PRINT 'Indexes DROPPED (8):';
PRINT '  - BDOpportunity_assignedTo_idx';
PRINT '  - BDOpportunity_assignedTo_status_idx';
PRINT '  - BDOpportunity_serviceLine_idx';
PRINT '  - BDOpportunity_serviceLine_status_idx';
PRINT '  - BDOpportunity_status_idx';
PRINT '  - BDOpportunity_convertedToClientId_idx';
PRINT '  - BDOpportunity_createdAt_idx';
PRINT '  - BDOpportunity_updatedAt_idx';
PRINT '';
PRINT 'Indexes KEPT:';
PRINT '  - BDOpportunity_clientId_idx (FK constraint)';
PRINT '  - BDOpportunity_stageId_idx (FK constraint)';
PRINT '  - BDOpportunity_expectedCloseDate_idx (date range queries)';
PRINT '';
PRINT 'RESULT: 12 indexes → 7 indexes (42% reduction)';
PRINT '============================================================================';

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;

PRINT '';
PRINT '❌ Error during BDOpportunity index optimization:';
PRINT ERROR_MESSAGE();
THROW;

END CATCH

GO

-- ============================================================================
-- ROLLBACK SCRIPT (If needed)
-- ============================================================================
/*
-- Restore old indexes if new covering indexes cause issues:
DROP INDEX IF EXISTS [idx_bdopp_assigned_status_covering] ON [dbo].[BDOpportunity];
DROP INDEX IF EXISTS [idx_bdopp_serviceline_status_covering] ON [dbo].[BDOpportunity];
DROP INDEX IF EXISTS [idx_bdopp_created_covering] ON [dbo].[BDOpportunity];
DROP INDEX IF EXISTS [idx_bdopp_updated_covering] ON [dbo].[BDOpportunity];

-- Recreate original indexes
CREATE NONCLUSTERED INDEX [BDOpportunity_assignedTo_idx] ON [dbo].[BDOpportunity]([assignedTo]);
CREATE NONCLUSTERED INDEX [BDOpportunity_assignedTo_status_idx] ON [dbo].[BDOpportunity]([assignedTo], [status]);
CREATE NONCLUSTERED INDEX [BDOpportunity_serviceLine_idx] ON [dbo].[BDOpportunity]([serviceLine]);
CREATE NONCLUSTERED INDEX [BDOpportunity_serviceLine_status_idx] ON [dbo].[BDOpportunity]([serviceLine], [status]);
CREATE NONCLUSTERED INDEX [BDOpportunity_status_idx] ON [dbo].[BDOpportunity]([status]);
CREATE NONCLUSTERED INDEX [BDOpportunity_convertedToClientId_idx] ON [dbo].[BDOpportunity]([convertedToClientId]);
CREATE NONCLUSTERED INDEX [BDOpportunity_createdAt_idx] ON [dbo].[BDOpportunity]([createdAt] DESC);
CREATE NONCLUSTERED INDEX [BDOpportunity_updatedAt_idx] ON [dbo].[BDOpportunity]([updatedAt] DESC);

UPDATE STATISTICS [dbo].[BDOpportunity] WITH FULLSCAN;
*/
