-- ============================================================================
-- Migration: Optimize AcceptanceQuestion Indexes
-- ============================================================================
-- Date: 2026-01-25
-- Purpose: Consolidate 4 indexes into 2 covering indexes to improve write
--          performance while maintaining read efficiency
--
-- Current Indexes (4):
--   1. questionnaireType
--   2. questionnaireType, order
--   3. questionnaireType, sectionKey
--   + unique(questionnaireType, questionKey)
--
-- New Structure (2):
--   1. idx_accquestion_type_order_covering (questionnaireType, order) + INCLUDE
--   + unique(questionnaireType, questionKey) - keep
--
-- Benefits:
--   - 50% reduction in index count (4 → 2)
--   - Covering index eliminates key lookups for questionnaire loading
--   - Compound index covers single-column questionnaireType queries
-- ============================================================================

BEGIN TRY

BEGIN TRAN;

PRINT 'Starting AcceptanceQuestion index optimization...';
PRINT '';

-- ============================================================================
-- STEP 1: Create New Covering Index
-- ============================================================================

PRINT '--- Creating new covering index ---';

-- Covering index for questionnaire loading
IF NOT EXISTS (
    SELECT * FROM sys.indexes 
    WHERE name = 'idx_accquestion_type_order_covering' 
    AND object_id = OBJECT_ID('dbo.AcceptanceQuestion')
)
BEGIN
    PRINT 'Creating idx_accquestion_type_order_covering...';
    
    CREATE NONCLUSTERED INDEX [idx_accquestion_type_order_covering] 
    ON [dbo].[AcceptanceQuestion]([questionnaireType], [order]) 
    INCLUDE (
        [sectionKey], 
        [questionKey],
        [questionText],
        [fieldType],
        [required],
        [riskWeight],
        [options]
    )
    WITH (
        ONLINE = ON,
        SORT_IN_TEMPDB = ON,
        MAXDOP = 0
    );
    
    PRINT '✓ Created idx_accquestion_type_order_covering';
END
ELSE
    PRINT '⚠ idx_accquestion_type_order_covering already exists';

PRINT '';

-- ============================================================================
-- STEP 2: Drop Redundant Indexes
-- ============================================================================

PRINT '--- Dropping redundant indexes ---';

-- Drop single-column questionnaireType (leftmost of compound)
IF EXISTS (SELECT * FROM sys.indexes WHERE name = 'AcceptanceQuestion_questionnaireType_idx' AND object_id = OBJECT_ID('AcceptanceQuestion'))
BEGIN
    DROP INDEX [AcceptanceQuestion_questionnaireType_idx] ON [dbo].[AcceptanceQuestion];
    PRINT '✓ Dropped AcceptanceQuestion_questionnaireType_idx';
END
ELSE
    PRINT '⚠ AcceptanceQuestion_questionnaireType_idx not found';

-- Drop old questionnaireType, order compound (replaced by covering)
IF EXISTS (SELECT * FROM sys.indexes WHERE name = 'AcceptanceQuestion_questionnaireType_order_idx' AND object_id = OBJECT_ID('AcceptanceQuestion'))
BEGIN
    DROP INDEX [AcceptanceQuestion_questionnaireType_order_idx] ON [dbo].[AcceptanceQuestion];
    PRINT '✓ Dropped AcceptanceQuestion_questionnaireType_order_idx';
END
ELSE
    PRINT '⚠ AcceptanceQuestion_questionnaireType_order_idx not found';

-- Drop questionnaireType, sectionKey (sectionKey in INCLUDE, less common query)
IF EXISTS (SELECT * FROM sys.indexes WHERE name = 'AcceptanceQuestion_questionnaireType_sectionKey_idx' AND object_id = OBJECT_ID('AcceptanceQuestion'))
BEGIN
    DROP INDEX [AcceptanceQuestion_questionnaireType_sectionKey_idx] ON [dbo].[AcceptanceQuestion];
    PRINT '✓ Dropped AcceptanceQuestion_questionnaireType_sectionKey_idx';
END
ELSE
    PRINT '⚠ AcceptanceQuestion_questionnaireType_sectionKey_idx not found';

PRINT '';

-- ============================================================================
-- STEP 3: Update Statistics
-- ============================================================================

PRINT '--- Updating statistics ---';
UPDATE STATISTICS [dbo].[AcceptanceQuestion] WITH FULLSCAN;
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
PRINT '  1. idx_accquestion_type_order_covering (questionnaireType, order + 7 INCLUDE)';
PRINT '';
PRINT 'Indexes DROPPED (3):';
PRINT '  - AcceptanceQuestion_questionnaireType_idx';
PRINT '  - AcceptanceQuestion_questionnaireType_order_idx';
PRINT '  - AcceptanceQuestion_questionnaireType_sectionKey_idx';
PRINT '';
PRINT 'Indexes KEPT:';
PRINT '  - Unique constraint on (questionnaireType, questionKey)';
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
PRINT '❌ Error during AcceptanceQuestion index optimization:';
PRINT ERROR_MESSAGE();
THROW;

END CATCH

GO

-- ============================================================================
-- ROLLBACK SCRIPT (If needed)
-- ============================================================================
/*
-- Restore old indexes if new covering index causes issues:
DROP INDEX IF EXISTS [idx_accquestion_type_order_covering] ON [dbo].[AcceptanceQuestion];

-- Recreate original indexes
CREATE NONCLUSTERED INDEX [AcceptanceQuestion_questionnaireType_idx] ON [dbo].[AcceptanceQuestion]([questionnaireType]);
CREATE NONCLUSTERED INDEX [AcceptanceQuestion_questionnaireType_order_idx] ON [dbo].[AcceptanceQuestion]([questionnaireType], [order]);
CREATE NONCLUSTERED INDEX [AcceptanceQuestion_questionnaireType_sectionKey_idx] ON [dbo].[AcceptanceQuestion]([questionnaireType], [sectionKey]);

UPDATE STATISTICS [dbo].[AcceptanceQuestion] WITH FULLSCAN;
*/
