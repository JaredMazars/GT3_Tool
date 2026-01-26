-- ============================================================================
-- Migration: Optimize CategoryApprover Indexes
-- ============================================================================
-- Date: 2026-01-25
-- Purpose: Consolidate 3 indexes into 2 covering indexes to improve write
--          performance while maintaining read efficiency
--
-- Current Indexes (3):
--   1. IX_CategoryApprover_CategoryId
--   2. IX_CategoryApprover_CategoryId_StepOrder
--   3. IX_CategoryApprover_UserId
--   + UQ_CategoryApprover_CategoryId_UserId (unique constraint)
--
-- New Structure (2):
--   1. idx_categoryapprover_category_steporder_covering (categoryId, stepOrder) + INCLUDE
--   2. IX_CategoryApprover_UserId (FK - keep)
--   + UQ_CategoryApprover_CategoryId_UserId (unique constraint - keep)
--
-- Benefits:
--   - 33% reduction in index count (3 → 2)
--   - Covering index eliminates key lookups for approver queries
--   - Compound index already covers single-column categoryId queries
-- ============================================================================

BEGIN TRY

BEGIN TRAN;

PRINT 'Starting CategoryApprover index optimization...';
PRINT '';

-- ============================================================================
-- STEP 1: Create New Covering Index
-- ============================================================================

PRINT '--- Creating new covering index ---';

-- Covering index for category approver listing
IF NOT EXISTS (
    SELECT * FROM sys.indexes 
    WHERE name = 'idx_categoryapprover_category_steporder_covering' 
    AND object_id = OBJECT_ID('dbo.CategoryApprover')
)
BEGIN
    PRINT 'Creating idx_categoryapprover_category_steporder_covering...';
    
    CREATE NONCLUSTERED INDEX [idx_categoryapprover_category_steporder_covering] 
    ON [dbo].[CategoryApprover]([categoryId], [stepOrder]) 
    INCLUDE (
        [userId], 
        [createdAt],
        [createdBy]
    )
    WITH (
        ONLINE = ON,
        SORT_IN_TEMPDB = ON,
        MAXDOP = 0
    );
    
    PRINT '✓ Created idx_categoryapprover_category_steporder_covering';
END
ELSE
    PRINT '⚠ idx_categoryapprover_category_steporder_covering already exists';

PRINT '';

-- ============================================================================
-- STEP 2: Drop Redundant Indexes
-- ============================================================================

PRINT '--- Dropping redundant indexes ---';

-- Drop single-column categoryId (leftmost of compound)
IF EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_CategoryApprover_CategoryId' AND object_id = OBJECT_ID('CategoryApprover'))
BEGIN
    DROP INDEX [IX_CategoryApprover_CategoryId] ON [dbo].[CategoryApprover];
    PRINT '✓ Dropped IX_CategoryApprover_CategoryId';
END
ELSE
    PRINT '⚠ IX_CategoryApprover_CategoryId not found';

-- Drop old categoryId, stepOrder compound (replaced by covering)
IF EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_CategoryApprover_CategoryId_StepOrder' AND object_id = OBJECT_ID('CategoryApprover'))
BEGIN
    DROP INDEX [IX_CategoryApprover_CategoryId_StepOrder] ON [dbo].[CategoryApprover];
    PRINT '✓ Dropped IX_CategoryApprover_CategoryId_StepOrder';
END
ELSE
    PRINT '⚠ IX_CategoryApprover_CategoryId_StepOrder not found';

PRINT '';

-- ============================================================================
-- STEP 3: Update Statistics
-- ============================================================================

PRINT '--- Updating statistics ---';
UPDATE STATISTICS [dbo].[CategoryApprover] WITH FULLSCAN;
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
PRINT '  1. idx_categoryapprover_category_steporder_covering (categoryId, stepOrder + 3 INCLUDE)';
PRINT '';
PRINT 'Indexes DROPPED (2):';
PRINT '  - IX_CategoryApprover_CategoryId';
PRINT '  - IX_CategoryApprover_CategoryId_StepOrder';
PRINT '';
PRINT 'Indexes KEPT:';
PRINT '  - IX_CategoryApprover_UserId (FK constraint, user lookups)';
PRINT '  - UQ_CategoryApprover_CategoryId_UserId (unique constraint)';
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
PRINT '❌ Error during CategoryApprover index optimization:';
PRINT ERROR_MESSAGE();
THROW;

END CATCH

GO

-- ============================================================================
-- ROLLBACK SCRIPT (If needed)
-- ============================================================================
/*
-- Restore old indexes if new covering index causes issues:
DROP INDEX IF EXISTS [idx_categoryapprover_category_steporder_covering] ON [dbo].[CategoryApprover];

-- Recreate original indexes
CREATE NONCLUSTERED INDEX [IX_CategoryApprover_CategoryId] ON [dbo].[CategoryApprover]([categoryId]);
CREATE NONCLUSTERED INDEX [IX_CategoryApprover_CategoryId_StepOrder] ON [dbo].[CategoryApprover]([categoryId], [stepOrder]);

UPDATE STATISTICS [dbo].[CategoryApprover] WITH FULLSCAN;
*/
