-- ============================================================================
-- Migration: Optimize TaskEngagementLetter Indexes
-- ============================================================================
-- Date: 2026-01-25
-- Purpose: Consolidate 6 indexes into 4 covering indexes to improve write
--          performance while maintaining read efficiency
--
-- Current Indexes (6):
--   1. dpaExtractionStatus
--   2. dpaLetterDate
--   3. elExtractionStatus
--   4. elLetterDate
--   5. taskId
--   6. templateVersionId
--
-- New Structure (4):
--   1. idx_taskengagement_dpa_covering (dpaExtractionStatus) + INCLUDE
--   2. idx_taskengagement_el_covering (elExtractionStatus) + INCLUDE
--   3. TaskEngagementLetter_taskId_idx (FK - keep)
--   4. TaskEngagementLetter_templateVersionId_idx (FK - keep)
--
-- Benefits:
--   - 33% reduction in index count (6 → 4)
--   - Covering indexes eliminate key lookups for extraction queries
--   - Better write performance on extraction status updates
-- ============================================================================

BEGIN TRY

BEGIN TRAN;

PRINT 'Starting TaskEngagementLetter index optimization...';
PRINT '';

-- ============================================================================
-- STEP 1: Create New Covering Indexes
-- ============================================================================

PRINT '--- Creating new covering indexes ---';

-- Covering index for DPA extraction status queries
IF NOT EXISTS (
    SELECT * FROM sys.indexes 
    WHERE name = 'idx_taskengagement_dpa_covering' 
    AND object_id = OBJECT_ID('dbo.TaskEngagementLetter')
)
BEGIN
    PRINT 'Creating idx_taskengagement_dpa_covering...';
    
    CREATE NONCLUSTERED INDEX [idx_taskengagement_dpa_covering] 
    ON [dbo].[TaskEngagementLetter]([dpaExtractionStatus]) 
    INCLUDE (
        [dpaLetterDate], 
        [dpaSignedDate], 
        [dpaSignedBy],
        [taskId],
        [updatedAt]
    )
    WITH (
        ONLINE = ON,
        SORT_IN_TEMPDB = ON,
        MAXDOP = 0
    );
    
    PRINT '✓ Created idx_taskengagement_dpa_covering';
END
ELSE
    PRINT '⚠ idx_taskengagement_dpa_covering already exists';

-- Covering index for Engagement Letter extraction status queries
IF NOT EXISTS (
    SELECT * FROM sys.indexes 
    WHERE name = 'idx_taskengagement_el_covering' 
    AND object_id = OBJECT_ID('dbo.TaskEngagementLetter')
)
BEGIN
    PRINT 'Creating idx_taskengagement_el_covering...';
    
    CREATE NONCLUSTERED INDEX [idx_taskengagement_el_covering] 
    ON [dbo].[TaskEngagementLetter]([elExtractionStatus]) 
    INCLUDE (
        [elLetterDate], 
        [elSignedDate], 
        [elSignedBy],
        [taskId],
        [updatedAt]
    )
    WITH (
        ONLINE = ON,
        SORT_IN_TEMPDB = ON,
        MAXDOP = 0
    );
    
    PRINT '✓ Created idx_taskengagement_el_covering';
END
ELSE
    PRINT '⚠ idx_taskengagement_el_covering already exists';

PRINT '';

-- ============================================================================
-- STEP 2: Drop Redundant Indexes
-- ============================================================================

PRINT '--- Dropping redundant indexes ---';

-- Drop old dpaExtractionStatus index (replaced by covering)
IF EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_taskengagementletter_dpaextractionstatus' AND object_id = OBJECT_ID('TaskEngagementLetter'))
BEGIN
    DROP INDEX [idx_taskengagementletter_dpaextractionstatus] ON [dbo].[TaskEngagementLetter];
    PRINT '✓ Dropped idx_taskengagementletter_dpaextractionstatus';
END
ELSE
    PRINT '⚠ idx_taskengagementletter_dpaextractionstatus not found';

-- Drop single-column dpaLetterDate (in INCLUDE of covering)
IF EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_taskengagementletter_dpaletterdate' AND object_id = OBJECT_ID('TaskEngagementLetter'))
BEGIN
    DROP INDEX [idx_taskengagementletter_dpaletterdate] ON [dbo].[TaskEngagementLetter];
    PRINT '✓ Dropped idx_taskengagementletter_dpaletterdate';
END
ELSE
    PRINT '⚠ idx_taskengagementletter_dpaletterdate not found';

-- Drop old elExtractionStatus index (replaced by covering)
IF EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_taskengagementletter_elextractionstatus' AND object_id = OBJECT_ID('TaskEngagementLetter'))
BEGIN
    DROP INDEX [idx_taskengagementletter_elextractionstatus] ON [dbo].[TaskEngagementLetter];
    PRINT '✓ Dropped idx_taskengagementletter_elextractionstatus';
END
ELSE
    PRINT '⚠ idx_taskengagementletter_elextractionstatus not found';

-- Drop single-column elLetterDate (in INCLUDE of covering)
IF EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_taskengagementletter_elletterdate' AND object_id = OBJECT_ID('TaskEngagementLetter'))
BEGIN
    DROP INDEX [idx_taskengagementletter_elletterdate] ON [dbo].[TaskEngagementLetter];
    PRINT '✓ Dropped idx_taskengagementletter_elletterdate';
END
ELSE
    PRINT '⚠ idx_taskengagementletter_elletterdate not found';

PRINT '';

-- ============================================================================
-- STEP 3: Update Statistics
-- ============================================================================

PRINT '--- Updating statistics ---';
UPDATE STATISTICS [dbo].[TaskEngagementLetter] WITH FULLSCAN;
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
PRINT '  1. idx_taskengagement_dpa_covering (dpaExtractionStatus + 5 INCLUDE)';
PRINT '  2. idx_taskengagement_el_covering (elExtractionStatus + 5 INCLUDE)';
PRINT '';
PRINT 'Indexes DROPPED (4):';
PRINT '  - idx_taskengagementletter_dpaextractionstatus';
PRINT '  - idx_taskengagementletter_dpaletterdate';
PRINT '  - idx_taskengagementletter_elextractionstatus';
PRINT '  - idx_taskengagementletter_elletterdate';
PRINT '';
PRINT 'Indexes KEPT:';
PRINT '  - TaskEngagementLetter_taskId_idx (FK constraint)';
PRINT '  - TaskEngagementLetter_templateVersionId_idx (FK constraint)';
PRINT '';
PRINT 'RESULT: 6 indexes → 4 indexes (33% reduction)';
PRINT '============================================================================';

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;

PRINT '';
PRINT '❌ Error during TaskEngagementLetter index optimization:';
PRINT ERROR_MESSAGE();
THROW;

END CATCH

GO

-- ============================================================================
-- ROLLBACK SCRIPT (If needed)
-- ============================================================================
/*
-- Restore old indexes if new covering indexes cause issues:
DROP INDEX IF EXISTS [idx_taskengagement_dpa_covering] ON [dbo].[TaskEngagementLetter];
DROP INDEX IF EXISTS [idx_taskengagement_el_covering] ON [dbo].[TaskEngagementLetter];

-- Recreate original indexes
CREATE NONCLUSTERED INDEX [idx_taskengagementletter_dpaextractionstatus] ON [dbo].[TaskEngagementLetter]([dpaExtractionStatus]);
CREATE NONCLUSTERED INDEX [idx_taskengagementletter_dpaletterdate] ON [dbo].[TaskEngagementLetter]([dpaLetterDate]);
CREATE NONCLUSTERED INDEX [idx_taskengagementletter_elextractionstatus] ON [dbo].[TaskEngagementLetter]([elExtractionStatus]);
CREATE NONCLUSTERED INDEX [idx_taskengagementletter_elletterdate] ON [dbo].[TaskEngagementLetter]([elLetterDate]);

UPDATE STATISTICS [dbo].[TaskEngagementLetter] WITH FULLSCAN;
*/
