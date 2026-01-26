-- ============================================================================
-- Migration: Cleanup Duplicate WIPTransactions Indexes
-- ============================================================================
-- Date: 2026-01-25
-- Purpose: Drop redundant indexes now superseded by super covering indexes
--
-- PREREQUISITES:
--   1. Migration 20260125_add_super_covering_wip_indexes MUST be run first
--   2. scripts/test_super_covering_indexes.sql should verify performance
--
-- INDEXES DROPPED (8 certain):
--   - idx_wip_gsclientid_covering (old covering, 3 INCLUDE → now have 9)
--   - idx_wip_gstaskid_covering (old covering, 3 INCLUDE → now have 9)
--   - idx_WIPTransactions_Aggregation_COVERING (absorbed by super covering)
--   - idx_wip_gsclientid (simple duplicate)
--   - idx_wiptransactions_gsclientid (simple duplicate)
--   - idx_wip_gstaskid (simple duplicate)
--   - idx_wiptransactions_gstaskid (simple duplicate)
--   - WIPTransactions_TType_idx (absorbed by super covering INCLUDE)
--
-- INDEXES KEPT:
--   - idx_wip_gsclientid_super_covering (NEW - handles all client queries)
--   - idx_wip_gstaskid_super_covering (NEW - handles all task queries)
--   - WIPTransactions_GSClientID_TranDate_TType_idx (composite - analytics)
--   - WIPTransactions_GSTaskID_TranDate_TType_idx (composite - analytics)
--   - WIPTransactions_TaskPartner_TranDate_idx (composite - My Reports)
--   - WIPTransactions_TaskManager_TranDate_idx (composite - My Reports)
--   - WIPTransactions_TranDate_idx (fiscal period queries)
--
-- NET RESULT: 14+ indexes → 7-9 indexes
-- ============================================================================

BEGIN TRY

BEGIN TRAN;

-- ============================================================================
-- STEP 0: Verify Super Covering Indexes Exist
-- ============================================================================

PRINT 'Verifying super covering indexes exist before cleanup...';
PRINT '';

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_wip_gsclientid_super_covering' AND object_id = OBJECT_ID('WIPTransactions'))
BEGIN
    RAISERROR('❌ idx_wip_gsclientid_super_covering MISSING - Run creation migration first!', 16, 1);
END

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_wip_gstaskid_super_covering' AND object_id = OBJECT_ID('WIPTransactions'))
BEGIN
    RAISERROR('❌ idx_wip_gstaskid_super_covering MISSING - Run creation migration first!', 16, 1);
END

PRINT '✓ Super covering indexes verified';
PRINT '';

-- ============================================================================
-- STEP 1: Drop Old Covering Indexes (Superseded by Super Covering)
-- ============================================================================

PRINT '--- Dropping old covering indexes ---';

IF EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_wip_gsclientid_covering' AND object_id = OBJECT_ID('WIPTransactions'))
BEGIN
    DROP INDEX [idx_wip_gsclientid_covering] ON [dbo].[WIPTransactions];
    PRINT '✓ Dropped idx_wip_gsclientid_covering';
END
ELSE
    PRINT '⚠ idx_wip_gsclientid_covering already dropped or never existed';

IF EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_wip_gstaskid_covering' AND object_id = OBJECT_ID('WIPTransactions'))
BEGIN
    DROP INDEX [idx_wip_gstaskid_covering] ON [dbo].[WIPTransactions];
    PRINT '✓ Dropped idx_wip_gstaskid_covering';
END
ELSE
    PRINT '⚠ idx_wip_gstaskid_covering already dropped or never existed';

IF EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_WIPTransactions_Aggregation_COVERING' AND object_id = OBJECT_ID('WIPTransactions'))
BEGIN
    DROP INDEX [idx_WIPTransactions_Aggregation_COVERING] ON [dbo].[WIPTransactions];
    PRINT '✓ Dropped idx_WIPTransactions_Aggregation_COVERING';
END
ELSE
    PRINT '⚠ idx_WIPTransactions_Aggregation_COVERING already dropped or never existed';

PRINT '';

-- ============================================================================
-- STEP 2: Drop Duplicate Simple Indexes
-- ============================================================================

PRINT '--- Dropping duplicate simple indexes ---';

IF EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_wip_gsclientid' AND object_id = OBJECT_ID('WIPTransactions'))
BEGIN
    DROP INDEX [idx_wip_gsclientid] ON [dbo].[WIPTransactions];
    PRINT '✓ Dropped idx_wip_gsclientid';
END
ELSE
    PRINT '⚠ idx_wip_gsclientid already dropped or never existed';

IF EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_wiptransactions_gsclientid' AND object_id = OBJECT_ID('WIPTransactions'))
BEGIN
    DROP INDEX [idx_wiptransactions_gsclientid] ON [dbo].[WIPTransactions];
    PRINT '✓ Dropped idx_wiptransactions_gsclientid';
END
ELSE
    PRINT '⚠ idx_wiptransactions_gsclientid already dropped or never existed';

IF EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_wip_gstaskid' AND object_id = OBJECT_ID('WIPTransactions'))
BEGIN
    DROP INDEX [idx_wip_gstaskid] ON [dbo].[WIPTransactions];
    PRINT '✓ Dropped idx_wip_gstaskid';
END
ELSE
    PRINT '⚠ idx_wip_gstaskid already dropped or never existed';

IF EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_wiptransactions_gstaskid' AND object_id = OBJECT_ID('WIPTransactions'))
BEGIN
    DROP INDEX [idx_wiptransactions_gstaskid] ON [dbo].[WIPTransactions];
    PRINT '✓ Dropped idx_wiptransactions_gstaskid';
END
ELSE
    PRINT '⚠ idx_wiptransactions_gstaskid already dropped or never existed';

PRINT '';

-- ============================================================================
-- STEP 3: Drop Single-Column Index Absorbed by INCLUDE
-- ============================================================================

PRINT '--- Dropping single-column index absorbed by super covering ---';

IF EXISTS (SELECT * FROM sys.indexes WHERE name = 'WIPTransactions_TType_idx' AND object_id = OBJECT_ID('WIPTransactions'))
BEGIN
    DROP INDEX [WIPTransactions_TType_idx] ON [dbo].[WIPTransactions];
    PRINT '✓ Dropped WIPTransactions_TType_idx (TType now in INCLUDE columns)';
END
ELSE
    PRINT '⚠ WIPTransactions_TType_idx already dropped or never existed';

PRINT '';

-- ============================================================================
-- STEP 4: Conditional Removals (Uncomment if verification shows UNUSED)
-- ============================================================================

PRINT '--- Conditional indexes (uncomment if verified unused) ---';

-- Uncomment these if check_wip_indexes.sql shows 0 seeks + 0 scans:

-- IF EXISTS (SELECT * FROM sys.indexes WHERE name = 'WIPTransactions_EmpCode_idx' AND object_id = OBJECT_ID('WIPTransactions'))
-- BEGIN
--     DROP INDEX [WIPTransactions_EmpCode_idx] ON [dbo].[WIPTransactions];
--     PRINT '✓ Dropped WIPTransactions_EmpCode_idx (unused)';
-- END

-- IF EXISTS (SELECT * FROM sys.indexes WHERE name = 'WIPTransactions_OfficeCode_idx' AND object_id = OBJECT_ID('WIPTransactions'))
-- BEGIN
--     DROP INDEX [WIPTransactions_OfficeCode_idx] ON [dbo].[WIPTransactions];
--     PRINT '✓ Dropped WIPTransactions_OfficeCode_idx (unused)';
-- END

-- IF EXISTS (SELECT * FROM sys.indexes WHERE name = 'WIPTransactions_ServLineGroup_idx' AND object_id = OBJECT_ID('WIPTransactions'))
-- BEGIN
--     DROP INDEX [WIPTransactions_ServLineGroup_idx] ON [dbo].[WIPTransactions];
--     PRINT '✓ Dropped WIPTransactions_ServLineGroup_idx (unused)';
-- END

PRINT 'ℹ Conditional indexes kept (verify usage with check_wip_indexes.sql)';
PRINT '';

-- ============================================================================
-- STEP 5: Update Statistics
-- ============================================================================

PRINT '--- Updating statistics ---';
UPDATE STATISTICS [dbo].[WIPTransactions] WITH FULLSCAN;
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
PRINT 'Indexes DROPPED (8):';
PRINT '  - idx_wip_gsclientid_covering (old covering)';
PRINT '  - idx_wip_gstaskid_covering (old covering)';
PRINT '  - idx_WIPTransactions_Aggregation_COVERING (absorbed)';
PRINT '  - idx_wip_gsclientid (duplicate)';
PRINT '  - idx_wiptransactions_gsclientid (duplicate)';
PRINT '  - idx_wip_gstaskid (duplicate)';
PRINT '  - idx_wiptransactions_gstaskid (duplicate)';
PRINT '  - WIPTransactions_TType_idx (absorbed)';
PRINT '';
PRINT 'Indexes KEPT:';
PRINT '  - idx_wip_gsclientid_super_covering (NEW - 9 INCLUDE columns)';
PRINT '  - idx_wip_gstaskid_super_covering (NEW - 9 INCLUDE columns)';
PRINT '  - WIPTransactions_GSClientID_TranDate_TType_idx (composite)';
PRINT '  - WIPTransactions_GSTaskID_TranDate_TType_idx (composite)';
PRINT '  - WIPTransactions_TaskPartner_TranDate_idx (composite)';
PRINT '  - WIPTransactions_TaskManager_TranDate_idx (composite)';
PRINT '  - WIPTransactions_TranDate_idx (date queries)';
PRINT '';
PRINT 'RESULT: 14+ indexes → 7 indexes (50% reduction)';
PRINT '============================================================================';

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;

PRINT '';
PRINT '❌ Error during cleanup:';
PRINT ERROR_MESSAGE();
THROW;

END CATCH

GO

-- ============================================================================
-- ROLLBACK SCRIPT (If needed)
-- ============================================================================
/*
-- To restore old indexes, run these CREATE statements:

-- Old covering indexes (from migration 20260123063454)
CREATE NONCLUSTERED INDEX [idx_wip_gsclientid_covering] 
ON [dbo].[WIPTransactions]([GSClientID]) 
INCLUDE ([Amount], [TType], [GSTaskID])
WHERE [GSClientID] IS NOT NULL;

CREATE NONCLUSTERED INDEX [idx_wip_gstaskid_covering] 
ON [dbo].[WIPTransactions]([GSTaskID]) 
INCLUDE ([Amount], [TType], [GSClientID]);

-- Aggregation covering index (from migration 20260122)
CREATE NONCLUSTERED INDEX [idx_WIPTransactions_Aggregation_COVERING] 
ON [dbo].[WIPTransactions]([GSTaskID] ASC, [TType] ASC)
INCLUDE ([Amount], [Cost], [Hour]);

-- Simple indexes (from migration 20251209134951)
CREATE NONCLUSTERED INDEX [WIPTransactions_GSClientID_idx] ON [dbo].[WIPTransactions]([GSClientID]);
CREATE NONCLUSTERED INDEX [WIPTransactions_GSTaskID_idx] ON [dbo].[WIPTransactions]([GSTaskID]);

-- TType index (from migration 20251226)
CREATE NONCLUSTERED INDEX [WIPTransactions_TType_idx] ON [dbo].[WIPTransactions]([TType] ASC);
*/
