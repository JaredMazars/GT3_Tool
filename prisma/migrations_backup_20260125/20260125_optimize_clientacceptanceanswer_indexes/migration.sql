-- ============================================================================
-- Migration: Optimize ClientAcceptanceAnswer Indexes
-- ============================================================================
-- Date: 2026-01-25
-- Purpose: Consolidate 3 indexes into 2 by replacing single-column indexes
--          with a covering index
--
-- Current Indexes (3):
--   1. clientAcceptanceId
--   2. questionId
--   + unique(clientAcceptanceId, questionId)
--
-- New Structure (2):
--   1. idx_clientaccanswer_acceptance_covering (clientAcceptanceId) + INCLUDE
--   + unique(clientAcceptanceId, questionId) - keep
--
-- Benefits:
--   - 33% reduction in index count (3 → 2)
--   - Covering index eliminates key lookups for answer retrieval
--   - Unique constraint already handles question lookups
-- ============================================================================

BEGIN TRY

BEGIN TRAN;

PRINT 'Starting ClientAcceptanceAnswer index optimization...';
PRINT '';

-- ============================================================================
-- STEP 1: Create New Covering Index
-- ============================================================================

PRINT '--- Creating new covering index ---';

-- Covering index for answer retrieval by acceptance
IF NOT EXISTS (
    SELECT * FROM sys.indexes 
    WHERE name = 'idx_clientaccanswer_acceptance_covering' 
    AND object_id = OBJECT_ID('dbo.ClientAcceptanceAnswer')
)
BEGIN
    PRINT 'Creating idx_clientaccanswer_acceptance_covering...';
    
    CREATE NONCLUSTERED INDEX [idx_clientaccanswer_acceptance_covering] 
    ON [dbo].[ClientAcceptanceAnswer]([clientAcceptanceId]) 
    INCLUDE (
        [questionId], 
        [answer],
        [comment],
        [updatedAt]
    )
    WITH (
        ONLINE = ON,
        SORT_IN_TEMPDB = ON,
        MAXDOP = 0
    );
    
    PRINT '✓ Created idx_clientaccanswer_acceptance_covering';
END
ELSE
    PRINT '⚠ idx_clientaccanswer_acceptance_covering already exists';

PRINT '';

-- ============================================================================
-- STEP 2: Drop Redundant Indexes
-- ============================================================================

PRINT '--- Dropping redundant indexes ---';

-- Drop old single-column clientAcceptanceId (replaced by covering)
IF EXISTS (SELECT * FROM sys.indexes WHERE name = 'ClientAcceptanceAnswer_clientAcceptanceId_idx' AND object_id = OBJECT_ID('ClientAcceptanceAnswer'))
BEGIN
    DROP INDEX [ClientAcceptanceAnswer_clientAcceptanceId_idx] ON [dbo].[ClientAcceptanceAnswer];
    PRINT '✓ Dropped ClientAcceptanceAnswer_clientAcceptanceId_idx';
END
ELSE
    PRINT '⚠ ClientAcceptanceAnswer_clientAcceptanceId_idx not found';

-- Drop single-column questionId (unique constraint handles this)
IF EXISTS (SELECT * FROM sys.indexes WHERE name = 'ClientAcceptanceAnswer_questionId_idx' AND object_id = OBJECT_ID('ClientAcceptanceAnswer'))
BEGIN
    DROP INDEX [ClientAcceptanceAnswer_questionId_idx] ON [dbo].[ClientAcceptanceAnswer];
    PRINT '✓ Dropped ClientAcceptanceAnswer_questionId_idx';
END
ELSE
    PRINT '⚠ ClientAcceptanceAnswer_questionId_idx not found';

PRINT '';

-- ============================================================================
-- STEP 3: Update Statistics
-- ============================================================================

PRINT '--- Updating statistics ---';
UPDATE STATISTICS [dbo].[ClientAcceptanceAnswer] WITH FULLSCAN;
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
PRINT '  1. idx_clientaccanswer_acceptance_covering (clientAcceptanceId + 4 INCLUDE)';
PRINT '';
PRINT 'Indexes DROPPED (2):';
PRINT '  - ClientAcceptanceAnswer_clientAcceptanceId_idx';
PRINT '  - ClientAcceptanceAnswer_questionId_idx';
PRINT '';
PRINT 'Indexes KEPT:';
PRINT '  - Unique constraint on (clientAcceptanceId, questionId)';
PRINT '';
PRINT 'RESULT: 3 indexes → 2 indexes (33% reduction)';
PRINT '============================================================================';

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;

PRINT '';
PRINT '❌ Error during ClientAcceptanceAnswer index optimization:';
PRINT ERROR_MESSAGE();
THROW;

END CATCH

GO

-- ============================================================================
-- ROLLBACK SCRIPT (If needed)
-- ============================================================================
/*
-- Restore old indexes if new covering index causes issues:
DROP INDEX IF EXISTS [idx_clientaccanswer_acceptance_covering] ON [dbo].[ClientAcceptanceAnswer];

-- Recreate original indexes
CREATE NONCLUSTERED INDEX [ClientAcceptanceAnswer_clientAcceptanceId_idx] ON [dbo].[ClientAcceptanceAnswer]([clientAcceptanceId]);
CREATE NONCLUSTERED INDEX [ClientAcceptanceAnswer_questionId_idx] ON [dbo].[ClientAcceptanceAnswer]([questionId]);

UPDATE STATISTICS [dbo].[ClientAcceptanceAnswer] WITH FULLSCAN;
*/
